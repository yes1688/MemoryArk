import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';
import { config } from '../config/index';
import logger from '../utils/logger';

// 任務數據類型定義
export interface PhotoProcessingData {
  messageId: string;
  userId: string;
  replyToken: string;
  imageUrl: string;
  userProfile: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  };
  groupInfo?: {
    groupId: string;
    groupName: string;
  };
  timestamp: Date;
}

export interface NotificationData {
  userId: string;
  message: string;
  type: 'success' | 'error' | 'info';
  data?: any;
}

class QueueService {
  private redis: Redis;
  private photoQueue: Queue<PhotoProcessingData>;
  private notificationQueue: Queue<NotificationData>;

  constructor() {
    // 創建 Redis 連接
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    // 創建任務隊列
    this.photoQueue = new Bull<PhotoProcessingData>('photo-processing', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 50, // 保留最近 50 個完成的任務
        removeOnFail: 20,     // 保留最近 20 個失敗的任務
      },
    });

    this.notificationQueue = new Bull<NotificationData>('notifications', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
      },
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 1000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    });

    this.setupEventListeners();
  }

  /**
   * 設置事件監聽器
   */
  private setupEventListeners(): void {
    // 照片處理隊列事件
    this.photoQueue.on('completed', (job: Job<PhotoProcessingData>) => {
      logger.info('Photo processing completed', {
        messageId: job.data.messageId,
        userId: job.data.userId,
        processingTime: Date.now() - job.timestamp,
      });
    });

    this.photoQueue.on('failed', (job: Job<PhotoProcessingData>, err: Error) => {
      logger.error('Photo processing failed', {
        messageId: job.data.messageId,
        userId: job.data.userId,
        error: err.message,
        attempts: job.attemptsMade,
      });

      // 所有重試都失敗後，發送錯誤通知
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        this.addNotification({
          userId: job.data.userId,
          message: '照片處理失敗，請稍後重試或聯繫管理員',
          type: 'error',
          data: {
            messageId: job.data.messageId,
            error: err.message,
          },
        });
      }
    });

    // 通知隊列事件
    this.notificationQueue.on('completed', (job: Job<NotificationData>) => {
      logger.debug('Notification sent', {
        userId: job.data.userId,
        type: job.data.type,
      });
    });

    this.notificationQueue.on('failed', (job: Job<NotificationData>, err: Error) => {
      logger.warn('Notification failed', {
        userId: job.data.userId,
        type: job.data.type,
        error: err.message,
      });
    });

    // 隊列健康狀態監控
    this.photoQueue.on('stalled', (job: Job<PhotoProcessingData>) => {
      logger.warn('Photo processing job stalled', {
        messageId: job.data.messageId,
        userId: job.data.userId,
      });
    });
  }

  /**
   * 添加照片處理任務
   */
  async addPhotoProcessing(data: PhotoProcessingData, priority: number = 0): Promise<Job<PhotoProcessingData>> {
    try {
      const job = await this.photoQueue.add('process-photo', data, {
        priority,
        delay: 0, // 立即處理
      });

      logger.info('Photo processing job added to queue', {
        jobId: job.id,
        messageId: data.messageId,
        userId: data.userId,
        priority,
      });

      return job;
    } catch (error) {
      logger.error('Failed to add photo processing job', {
        messageId: data.messageId,
        userId: data.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 添加通知任務
   */
  async addNotification(data: NotificationData, delay: number = 0): Promise<Job<NotificationData>> {
    try {
      const job = await this.notificationQueue.add('send-notification', data, {
        delay,
      });

      logger.debug('Notification job added to queue', {
        jobId: job.id,
        userId: data.userId,
        type: data.type,
        delay,
      });

      return job;
    } catch (error) {
      logger.error('Failed to add notification job', {
        userId: data.userId,
        type: data.type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 獲取照片處理隊列統計
   */
  async getPhotoQueueStats() {
    const waiting = await this.photoQueue.getWaiting();
    const active = await this.photoQueue.getActive();
    const completed = await this.photoQueue.getCompleted();
    const failed = await this.photoQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  }

  /**
   * 獲取通知隊列統計
   */
  async getNotificationQueueStats() {
    const waiting = await this.notificationQueue.getWaiting();
    const active = await this.notificationQueue.getActive();
    const completed = await this.notificationQueue.getCompleted();
    const failed = await this.notificationQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  }

  /**
   * 清理舊任務
   */
  async cleanOldJobs(): Promise<void> {
    try {
      // 清理 24 小時前完成的任務
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      await this.photoQueue.clean(oneDayAgo, 'completed');
      await this.photoQueue.clean(oneDayAgo, 'failed');
      await this.notificationQueue.clean(oneDayAgo, 'completed');
      await this.notificationQueue.clean(oneDayAgo, 'failed');

      logger.info('Old jobs cleaned successfully');
    } catch (error) {
      logger.error('Failed to clean old jobs', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 關閉隊列連接
   */
  async close(): Promise<void> {
    await this.photoQueue.close();
    await this.notificationQueue.close();
    this.redis.disconnect();
    logger.info('Queue service closed');
  }

  /**
   * 獲取隊列實例（供處理器使用）
   */
  getPhotoQueue(): Queue<PhotoProcessingData> {
    return this.photoQueue;
  }

  getNotificationQueue(): Queue<NotificationData> {
    return this.notificationQueue;
  }
}

// 單例導出
export const queueService = new QueueService();
export default queueService;