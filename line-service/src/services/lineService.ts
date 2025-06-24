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

      // 1. 回覆確認訊息
      await this.replyMessage(replyToken, '📸 收到您的照片！正在處理中，請稍候...');

      // 2. 下載照片
      const photoBuffer = await this.downloadImage(messageId);
      
      // 3. 準備上傳資料
      const uploadData = await this.preparePhotoUploadData(
        photoBuffer,
        messageId,
        userId,
        source as LineMessageSource
      );

      // 4. 上傳到 MemoryArk
      const memoryArkApi = getMemoryArkApi();
      const uploadResult = await memoryArkApi.uploadPhoto(uploadData);

      if (uploadResult.success) {
        // 上傳成功
        LoggerHelper.logPhotoProcessing(messageId, userId, 'completed');
        
        await this.pushMessage(userId, 
          `✅ 照片已成功保存到 MemoryArk！\n` +
          `📷 照片 ID: ${uploadResult.photoId}\n` +
          `💾 檔案大小: ${this.formatBytes(photoBuffer.length)}`
        );

        return { success: true, message: 'Photo processed successfully', data: { photoId: uploadResult.photoId } };
      } else {
        // 上傳失敗
        LoggerHelper.logPhotoProcessing(messageId, userId, 'failed', uploadResult.error);
        
        await this.pushMessage(userId, 
          `❌ 照片處理失敗：${uploadResult.message}\n` +
          `請稍後再試或聯繫管理員。`
        );

        return { success: false, error: uploadResult.error };
      }

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
    try {
      photoLogger.info('Starting image download', { messageId });
      
      const stream = await this.lineClient.getMessageContent(messageId);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
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
          photoLogger.error('Image download failed', { messageId, error: error.message });
          reject(error);
        });
      });

    } catch (error: any) {
      photoLogger.error('Failed to get image content', { messageId, error: error.message });
      throw new Error(`Failed to download image: ${error.message}`);
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

    return {
      file: buffer,
      fileName,
      mimeType,
      description: `來自 LINE 的照片 - 使用者：${userProfile?.displayName || userId}`,
      tags: ['line', 'auto-upload', userProfile?.displayName || userId],
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