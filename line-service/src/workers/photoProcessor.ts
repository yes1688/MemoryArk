import { Job } from 'bull';
import { queueService, PhotoProcessingData } from '../services/queueService';
import { getLineService } from '../services/lineService';
import logger from '../utils/logger';

/**
 * 照片處理工作器
 */
class PhotoProcessor {
  constructor() {
    this.setupProcessors();
  }

  /**
   * 設置處理器
   */
  private setupProcessors(): void {
    // 照片處理器
    queueService.getPhotoQueue().process('process-photo', 3, this.processPhoto.bind(this));
    
    // 通知處理器
    queueService.getNotificationQueue().process('send-notification', 5, this.sendNotification.bind(this));

    logger.info('Photo processors setup completed');
  }

  /**
   * 處理照片上傳任務
   */
  private async processPhoto(job: Job<PhotoProcessingData>): Promise<void> {
    const { messageId, userId, imageUrl, userProfile, groupInfo, timestamp } = job.data;
    
    logger.info('Starting photo processing', {
      jobId: job.id,
      messageId,
      userId,
      timestamp,
    });

    try {
      const lineService = getLineService();
      
      // 更新任務進度
      await job.progress(10);

      // 1. 下載照片
      logger.debug('Downloading image', { messageId, imageUrl });
      const imageData = await lineService.downloadImageFromUrl(imageUrl);
      await job.progress(30);

      // 2. 準備上傳數據
      logger.debug('Preparing upload data', { messageId });
      const uploadData = await lineService.preparePhotoUploadDataForWorker(
        imageData,
        messageId,
        userProfile,
        groupInfo
      );
      await job.progress(50);

      // 3. 上傳到 MemoryArk
      logger.debug('Uploading to MemoryArk', { messageId });
      const uploadResult = await lineService.uploadPhotoToMemoryArk(uploadData);
      await job.progress(80);

      // 4. 保存用戶資訊
      logger.debug('Saving user info', { messageId, userId });
      await lineService.saveUserInfo(userProfile, groupInfo);
      await job.progress(90);

      // 5. 發送成功通知
      if (uploadResult.success) {
        await queueService.addNotification({
          userId,
          message: `照片已成功上傳！檔案名稱：${uploadResult.fileName}`,
          type: 'success',
          data: {
            messageId,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
            uploadPath: uploadResult.uploadPath,
          },
        });

        logger.info('Photo processing completed successfully', {
          jobId: job.id,
          messageId,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
        });
      } else {
        throw new Error(uploadResult.error || 'Upload failed without specific error');
      }

      await job.progress(100);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('Photo processing failed', {
        jobId: job.id,
        messageId,
        userId,
        error: errorMessage,
        attempt: job.attemptsMade + 1,
      });

      // 拋出錯誤讓 Bull 處理重試
      throw error;
    }
  }

  /**
   * 發送通知任務
   */
  private async sendNotification(job: Job<any>): Promise<void> {
    const { userId, message, type, data } = job.data;

    try {
      const lineService = getLineService();
      
      logger.debug('Sending notification', {
        jobId: job.id,
        userId,
        type,
      });

      // 發送 LINE 推送訊息
      await lineService.pushMessage(userId, message);

      logger.debug('Notification sent successfully', {
        jobId: job.id,
        userId,
        type,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('Failed to send notification', {
        jobId: job.id,
        userId,
        type,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * 獲取處理統計
   */
  async getProcessingStats() {
    const photoStats = await queueService.getPhotoQueueStats();
    const notificationStats = await queueService.getNotificationQueueStats();

    return {
      photo: photoStats,
      notification: notificationStats,
      combined: {
        totalWaiting: photoStats.waiting + notificationStats.waiting,
        totalActive: photoStats.active + notificationStats.active,
        totalCompleted: photoStats.completed + notificationStats.completed,
        totalFailed: photoStats.failed + notificationStats.failed,
      },
    };
  }
}

// 單例導出
export const photoProcessor = new PhotoProcessor();
export default photoProcessor;