import { Client, MessageEvent, ImageEventMessage, TextEventMessage } from '@line/bot-sdk';
import { 
  LineBotConfig, 
  LineUserProfile, 
  PhotoUploadData, 
  PhotoProcessTask, 
  PhotoProcessStatus,
  EventProcessResult,
  LineMessageSource
} from '../types/line';
import { getMemoryArkApi } from './memoryarkApi';
import { lineLogger, photoLogger, LoggerHelper } from '../utils/logger';
import axios from 'axios';

/**
 * LINE Bot 服務
 * 負責處理 LINE 相關的業務邏輯，包括照片下載、處理、回覆等
 */
export class LineService {
  private lineClient: Client;
  private config: LineBotConfig;

  constructor(config: LineBotConfig) {
    this.config = config;
    this.lineClient = new Client({
      channelAccessToken: config.channelAccessToken,
      channelSecret: config.channelSecret,
      httpConfig: {
        timeout: 60000 // 60 秒超時
      }
    });
  }

  /**
   * 處理照片訊息
   */
  async handleImageMessage(event: MessageEvent, imageMessage: ImageEventMessage): Promise<EventProcessResult> {
    const { replyToken, source } = event;
    const messageId = imageMessage.id;
    const userId = source.userId || 'unknown';

    try {
      LoggerHelper.logLineEvent('image', userId, { messageId });

      // 1. 立即回覆確認訊息
      try {
        await this.replyMessage(replyToken, '📸 收到您的照片！正在處理中，完成後會通知您...');
      } catch (replyError: any) {
        lineLogger.warn('Failed to reply confirmation message', {
          messageId,
          userId,
          error: replyError.message
        });
      }

      // 2. 獲取用戶資料和群組資訊（同步，快速完成）
      let userProfile;
      let groupInfo;
      
      try {
        userProfile = await this.getProfile(userId);
      } catch (error: any) {
        lineLogger.warn('Failed to get user profile, using fallback', {
          userId,
          error: error.message
        });
        userProfile = {
          userId,
          displayName: `User_${userId.substring(0, 8)}`,
        };
      }

      // 獲取群組資訊（如果在群組中）
      if (source.type === 'group' && source.groupId) {
        try {
          const groupSummary = await this.getGroupSummary(source.groupId);
          groupInfo = {
            groupId: source.groupId,
            groupName: groupSummary.groupName,
          };
        } catch (error: any) {
          lineLogger.warn('Failed to get group info', {
            groupId: source.groupId,
            error: error.message
          });
        }
      }

      // 3. 獲取圖片 URL（不下載，延遲到背景處理）
      const imageUrl = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

      // 4. 添加到任務隊列進行背景處理
      const { queueService } = await import('../services/queueService');
      
      const job = await queueService.addPhotoProcessing({
        messageId,
        userId,
        replyToken, // 不會被使用，因為已經回覆過
        imageUrl,
        userProfile,
        groupInfo,
        timestamp: new Date(),
      });

      lineLogger.info('Photo processing job queued', {
        jobId: job.id,
        messageId,
        userId,
        hasGroupInfo: !!groupInfo,
      });

      LoggerHelper.logPhotoProcessing(messageId, userId, 'queued');

      return { 
        success: true, 
        message: 'Photo queued for processing',
        data: { 
          jobId: job.id,
          messageId,
          estimatedProcessingTime: '30-60 seconds'
        }
      };

    } catch (error: any) {
      LoggerHelper.logError(error, 'handleImageMessage', { messageId, userId });
      LoggerHelper.logPhotoProcessing(messageId, userId, 'failed', error.message);

      // 發送錯誤訊息給使用者
      try {
        await this.pushMessage(userId, 
          `❌ 處理您的照片時發生錯誤。\n` +
          `錯誤訊息：${error.message}\n` +
          `請稍後再試或聯繫管理員。`
        );
      } catch (pushError: any) {
        LoggerHelper.logError(pushError, 'handleImageMessage - pushMessage failed');
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * 處理文字訊息
   */
  async handleTextMessage(event: MessageEvent, textMessage: TextEventMessage): Promise<EventProcessResult> {
    const { replyToken, source } = event;
    const text = textMessage.text.trim();
    const userId = source.userId || 'unknown';

    try {
      LoggerHelper.logLineEvent('text', userId, { text });

      // 處理不同的指令
      if (text.startsWith('/')) {
        return await this.handleCommand(text, replyToken, userId);
      }

      // 一般文字訊息回覆
      await this.replyMessage(replyToken, 
        `您好！我是 MemoryArk 照片管理助手 📸\n\n` +
        `✨ 主要功能：\n` +
        `• 傳送照片給我，我會自動保存到 MemoryArk\n` +
        `• 使用指令查看說明\n\n` +
        `🔧 可用指令：\n` +
        `/help - 顯示說明\n` +
        `/status - 檢查系統狀態\n` +
        `/info - 顯示帳戶資訊`
      );

      return { success: true, message: 'Text message processed' };

    } catch (error: any) {
      LoggerHelper.logError(error, 'handleTextMessage', { text, userId });
      return { success: false, error: error.message };
    }
  }

  /**
   * 處理指令
   */
  private async handleCommand(command: string, replyToken: string, userId: string): Promise<EventProcessResult> {
    const cmd = command.toLowerCase();

    try {
      switch (cmd) {
        case '/help':
          await this.replyMessage(replyToken, 
            `🤖 MemoryArk LINE Bot 使用說明\n\n` +
            `📸 照片功能：\n` +
            `• 直接傳送照片即可自動保存\n` +
            `• 支援 JPG, PNG, GIF, WebP 格式\n` +
            `• 檔案大小限制：50MB\n\n` +
            `⚙️ 指令列表：\n` +
            `/help - 顯示此說明\n` +
            `/status - 檢查系統狀態\n` +
            `/info - 顯示帳戶資訊\n\n` +
            `❓ 需要協助請聯繫管理員`
          );
          break;

        case '/status':
          const statusInfo = await this.getSystemStatus();
          await this.replyMessage(replyToken, statusInfo);
          break;

        case '/info':
          const userInfo = await this.getUserInfo(userId);
          await this.replyMessage(replyToken, userInfo);
          break;

        default:
          await this.replyMessage(replyToken, 
            `❌ 未知指令：${command}\n` +
            `輸入 /help 查看可用指令。`
          );
      }

      return { success: true, message: `Command processed: ${command}` };

    } catch (error: any) {
      LoggerHelper.logError(error, 'handleCommand', { command, userId });
      await this.replyMessage(replyToken, `❌ 指令執行失敗：${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 下載照片
   */
  private async downloadImage(messageId: string): Promise<Buffer> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 秒
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        photoLogger.info('Starting image download', { 
          messageId,
          attempt,
          maxRetries: MAX_RETRIES,
          hasToken: !!this.config.channelAccessToken,
          tokenPrefix: this.config.channelAccessToken?.substring(0, 20)
        });
        
        const stream = await this.lineClient.getMessageContent(messageId);
        const chunks: Buffer[] = [];

        return new Promise<Buffer>((resolve, reject) => {
          stream.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });

          stream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            photoLogger.info('Image download completed', { 
              messageId, 
              size: buffer.length,
              sizeFormatted: this.formatBytes(buffer.length) 
            });
            resolve(buffer);
          });

          stream.on('error', (error) => {
            photoLogger.error('Image download failed', { messageId, attempt, error: error.message });
            reject(error);
          });
        });

      } catch (error: any) {
        const isLastAttempt = attempt === MAX_RETRIES;
        const isDnsError = error.message && (error.message.includes('EAI_AGAIN') || error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo'));
        
        photoLogger.error('Failed to get image content', { 
          messageId, 
          attempt, 
          maxRetries: MAX_RETRIES,
          isLastAttempt,
          isDnsError,
          error: error.message 
        });
        
        if (isLastAttempt) {
          throw new Error(`Failed to download image after ${MAX_RETRIES} attempts: ${error.message}`);
        }
        
        if (isDnsError) {
          photoLogger.warn('DNS error detected, retrying with delay', { messageId, attempt, delay: RETRY_DELAY });
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt)); // 漸進式延遲
        } else {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
    
    // 這裡永遠不應該到達，但 TypeScript 需要明確的返回
    throw new Error(`Failed to download image after ${MAX_RETRIES} attempts`);
  }

  /**
   * 記錄 LINE 用戶和上傳資訊
   */
  private async recordLineUserAndUpload(
    userId: string,
    userProfile: LineUserProfile,
    fileId: string,
    messageId: string,
    source: LineMessageSource
  ): Promise<void> {
    try {
      const memoryArkApi = getMemoryArkApi();

      // 1. 保存用戶資訊
      const userResult = await memoryArkApi.saveLineUser({
        userId: userProfile.userId,
        displayName: userProfile.displayName,
        pictureUrl: userProfile.pictureUrl,
        statusMessage: userProfile.statusMessage,
        language: userProfile.language,
      });

      if (userResult.success) {
        lineLogger.info('LINE user saved to database', {
          userId: userProfile.userId,
          displayName: userProfile.displayName,
          created: userResult.created,
        });
      } else {
        lineLogger.warn('Failed to save LINE user', {
          userId: userProfile.userId,
          error: userResult.message,
        });
      }

      // 2. 創建上傳記錄
      const recordResult = await memoryArkApi.createUploadRecord(fileId, userId, {
        messageId,
        timestamp: new Date().toISOString(),
        userProfile,
        source,
      });

      if (recordResult.success) {
        lineLogger.info('Upload record created successfully', {
          fileId,
          userId,
          messageId,
        });
      } else {
        lineLogger.warn('Failed to create upload record', {
          fileId,
          userId,
          messageId,
          error: recordResult.message,
        });
      }
    } catch (error) {
      lineLogger.error('Failed to record LINE user and upload data', {
        userId,
        fileId,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      // 不拋出錯誤，避免影響主要的照片上傳流程
    }
  }

  /**
   * 生成 LINE 照片的資料夾路徑
   */
  private generateFolderPath(userProfile: LineUserProfile | null, source: LineMessageSource): string {
    if (source.type === 'group') {
      // 群組照片統一放在群組照片資料夾
      return 'LINE信徒照片上傳/群組照片';
    } else {
      // 個人照片按使用者名稱分類
      const displayName = userProfile?.displayName || 'Unknown';
      return `LINE信徒照片上傳/${displayName}`;
    }
  }

  /**
   * 準備照片上傳資料
   */
  private async preparePhotoUploadData(
    buffer: Buffer,
    messageId: string,
    userId: string,
    source: LineMessageSource
  ): Promise<PhotoUploadData> {
    // 檢測檔案類型
    const mimeType = this.detectMimeType(buffer);
    const fileExtension = this.getFileExtension(mimeType);
    const fileName = `line_${messageId}_${Date.now()}${fileExtension}`;

    // 取得使用者資訊
    let userProfile: LineUserProfile | null = null;
    try {
      const profile = await this.lineClient.getProfile(userId);
      userProfile = {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
      };
    } catch (error) {
      lineLogger.warn('Failed to get user profile', { userId, error });
    }

    // 生成資料夾路徑
    const folderPath = this.generateFolderPath(userProfile, source);

    return {
      file: buffer,
      fileName,
      mimeType,
      description: `來自 LINE 的照片 - 使用者：${userProfile?.displayName || userId}`,
      tags: ['line', 'auto-upload', userProfile?.displayName || userId],
      folderPath: folderPath,  // 新增資料夾路徑
      metadata: {
        lineUserId: userId,
        lineMessageId: messageId,
        timestamp: new Date().toISOString(),
        source,
        userProfile: userProfile || undefined,
      },
    };
  }

  /**
   * 檢測檔案 MIME 類型
   */
  private detectMimeType(buffer: Buffer): string {
    // 簡單的檔案頭檢測
    if (buffer.length < 4) return 'application/octet-stream';

    const header = buffer.subarray(0, 4).toString('hex').toUpperCase();
    
    if (header.startsWith('FFD8FF')) return 'image/jpeg';
    if (header.startsWith('89504E47')) return 'image/png';
    if (header.startsWith('47494638')) return 'image/gif';
    if (header.startsWith('52494646')) {
      // 檢查是否為 WebP
      const webpHeader = buffer.subarray(8, 12).toString('ascii');
      if (webpHeader === 'WEBP') return 'image/webp';
    }
    if (header.startsWith('424D')) return 'image/bmp';

    // 預設為 JPEG
    return 'image/jpeg';
  }

  /**
   * 取得檔案副檔名
   */
  private getFileExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
    };
    return extensions[mimeType] || '.jpg';
  }

  /**
   * 回覆訊息
   */
  async replyMessage(replyToken: string, message: string): Promise<void> {
    try {
      await this.lineClient.replyMessage(replyToken, {
        type: 'text',
        text: message,
      });
      
      lineLogger.info('Reply message sent', { replyToken, messageLength: message.length });
    } catch (error: any) {
      lineLogger.error('Failed to reply message', { replyToken, error: error.message });
      throw error;
    }
  }

  /**
   * 推送訊息
   */
  async pushMessage(userId: string, message: string): Promise<void> {
    try {
      await this.lineClient.pushMessage(userId, {
        type: 'text',
        text: message,
      });
      
      lineLogger.info('Push message sent', { userId, messageLength: message.length });
    } catch (error: any) {
      lineLogger.error('Failed to push message', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * 取得使用者資訊
   */
  async getUserProfile(userId: string): Promise<LineUserProfile> {
    try {
      const profile = await this.lineClient.getProfile(userId);
      return {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
      };
    } catch (error: any) {
      lineLogger.error('Failed to get user profile', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * 格式化位元組大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 取得系統狀態
   */
  private async getSystemStatus(): Promise<string> {
    try {
      const memoryArkApi = getMemoryArkApi();
      const isMemoryArkHealthy = await memoryArkApi.checkApiHealth();
      
      return `🔧 系統狀態檢查\n\n` +
        `📱 LINE Bot：✅ 正常運行\n` +
        `🗄️ MemoryArk API：${isMemoryArkHealthy ? '✅ 連線正常' : '❌ 連線異常'}\n` +
        `🕐 檢查時間：${new Date().toLocaleString('zh-TW')}`;
    } catch (error: any) {
      return `🔧 系統狀態檢查\n\n` +
        `❌ 狀態檢查失敗：${error.message}\n` +
        `🕐 檢查時間：${new Date().toLocaleString('zh-TW')}`;
    }
  }

  /**
   * 取得使用者資訊文字
   */
  private async getUserInfo(userId: string): Promise<string> {
    try {
      const profile = await this.getUserProfile(userId);
      
      return `👤 您的帳戶資訊\n\n` +
        `🆔 使用者 ID：${profile.userId}\n` +
        `👤 顯示名稱：${profile.displayName}\n` +
        `💬 狀態訊息：${profile.statusMessage || '無'}\n` +
        `🕐 查詢時間：${new Date().toLocaleString('zh-TW')}`;
    } catch (error: any) {
      return `👤 帳戶資訊查詢失敗\n\n` +
        `❌ 錯誤：${error.message}\n` +
        `🕐 查詢時間：${new Date().toLocaleString('zh-TW')}`;
    }
  }

  /**
   * 獲取用戶資料
   */
  async getProfile(userId: string) {
    return await this.lineClient.getProfile(userId);
  }

  /**
   * 獲取群組摘要
   */
  async getGroupSummary(groupId: string) {
    return await this.lineClient.getGroupSummary(groupId);
  }

  /**
   * 取得 LINE Client 實例
   */
  getClient(): Client {
    return this.lineClient;
  }

  /**
   * 取得設定資訊
   */
  getConfig(): LineBotConfig {
    return { ...this.config };
  }

  /**
   * 工作器專用：下載圖片（供任務隊列使用）
   */
  async downloadImageFromUrl(imageUrl: string): Promise<Buffer> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        photoLogger.info('Downloading image from URL', { 
          imageUrl: imageUrl.substring(0, 50) + '...',
          attempt,
          maxRetries: MAX_RETRIES,
        });
        
        const response = await fetch(imageUrl, {
          headers: {
            'Authorization': `Bearer ${this.config.channelAccessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        photoLogger.info('Image downloaded successfully', {
          size: buffer.length,
          sizeFormatted: this.formatBytes(buffer.length),
          attempt,
        });

        return buffer;
        
      } catch (error: any) {
        photoLogger.error('Image download attempt failed', {
          attempt,
          maxRetries: MAX_RETRIES,
          error: error.message,
        });

        if (attempt === MAX_RETRIES) {
          throw new Error(`Failed to download image after ${MAX_RETRIES} attempts: ${error.message}`);
        }

        // 漸進式延遲重試
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        photoLogger.info(`Retrying image download in ${delay}ms`, { attempt: attempt + 1 });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Unexpected end of download attempts');
  }

  /**
   * 工作器專用：準備照片上傳數據（供任務隊列使用）
   */
  async preparePhotoUploadDataForWorker(
    photoBuffer: Buffer,
    messageId: string,
    userProfile: any,
    groupInfo?: any
  ): Promise<any> {
    // 檢測檔案類型
    const mimeType = this.detectMimeType(photoBuffer);
    const extension = this.getFileExtension(mimeType);
    
    // 生成檔案名稱
    const timestamp = Date.now();
    const fileName = `line_${messageId}_${timestamp}.${extension}`;
    
    // 準備相對路徑（資料夾結構）
    const datePath = new Date().toISOString().slice(0, 7); // YYYY-MM 格式
    const userName = userProfile?.displayName || `User_${userProfile?.userId?.substring(0, 8)}`;
    const groupFolder = groupInfo ? `${groupInfo.groupName}` : '個人上傳';
    
    const relativePath = `LINE信徒照片上傳/${groupFolder}/${userName}/${datePath}`;
    
    // 準備元數據
    const metadata = {
      source: 'line',
      lineMessageId: messageId,
      userProfile,
      groupInfo,
      uploadedAt: new Date().toISOString(),
    };

    return {
      file: photoBuffer,
      fileName,
      mimeType,
      description: `LINE 照片上傳 - ${userProfile?.displayName || 'Unknown User'}`,
      tags: JSON.stringify(['line', 'photo', userProfile?.displayName || 'unknown']),
      metadata: JSON.stringify(metadata),
      folderPath: relativePath,
    };
  }

  /**
   * 工作器專用：上傳照片到 MemoryArk（供任務隊列使用）
   */
  async uploadPhotoToMemoryArk(uploadData: any): Promise<any> {
    const memoryArkApi = getMemoryArkApi();
    return await memoryArkApi.uploadPhoto(uploadData);
  }

  /**
   * 工作器專用：保存用戶資訊（供任務隊列使用）
   */
  async saveUserInfo(userProfile: any, groupInfo?: any): Promise<void> {
    if (userProfile?.userId) {
      await this.recordLineUserAndUpload(
        userProfile.userId,
        userProfile,
        '0', // photoId 會在上傳成功後更新
        '', // messageId 會在需要時提供
        { type: 'user', userId: userProfile.userId }
      );
    }
  }
}

// 全域 LINE 服務實例
let lineService: LineService | null = null;

/**
 * 初始化 LINE 服務
 */
export function initializeLineService(config: LineBotConfig): LineService {
  lineService = new LineService(config);
  lineLogger.info('LINE service initialized', {
    channelId: config.channelId,
  });
  return lineService;
}

/**
 * 取得 LINE 服務實例
 */
export function getLineService(): LineService {
  if (!lineService) {
    throw new Error('LINE service not initialized. Call initializeLineService() first.');
  }
  return lineService;
}

export default LineService;