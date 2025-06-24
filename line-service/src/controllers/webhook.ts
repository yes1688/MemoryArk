import { Request, Response } from 'express';
import { WebhookEvent, MessageEvent, PostbackEvent, FollowEvent, UnfollowEvent } from '@line/bot-sdk';
import { 
  LineWebhookBody, 
  SupportedLineEvent, 
  EventProcessResult,
  LineMessageSource 
} from '../types/line';
import { getLineService } from '../services/lineService';
import { lineLogger, LoggerHelper } from '../utils/logger';

/**
 * LINE Webhook 控制器
 * 處理來自 LINE 平台的 Webhook 事件
 */
export class LineWebhookController {
  /**
   * 處理 LINE Webhook 請求
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    const requestId = (req as any).requestId || 'unknown';
    
    try {
      const body = req.body as LineWebhookBody;
      const { events, destination } = body;

      lineLogger.info('Processing LINE webhook request', {
        requestId,
        eventsCount: events.length,
        destination,
      });

      // 處理每個事件
      const results: EventProcessResult[] = [];
      
      for (const event of events) {
        try {
          lineLogger.debug('Processing LINE event', {
            requestId,
            eventType: event.type,
            timestamp: event.timestamp,
            source: event.source,
          });

          const result = await LineWebhookController.processEvent(event);
          results.push(result);

          LoggerHelper.logLineEvent(event.type, 
            event.source?.userId || 'unknown', 
            { success: result.success, message: result.message }
          );

        } catch (eventError: any) {
          const errorResult: EventProcessResult = {
            success: false,
            error: eventError.message,
          };
          results.push(errorResult);

          LoggerHelper.logError(eventError, 'Event processing failed', {
            requestId,
            eventType: event.type,
            eventTimestamp: event.timestamp,
          });
        }
      }

      // 統計處理結果
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      lineLogger.info('LINE webhook processing completed', {
        requestId,
        totalEvents: results.length,
        successCount,
        failureCount,
      });

      // 回傳成功回應（LINE 要求）
      res.status(200).json({
        message: 'OK',
        processed: results.length,
        success: successCount,
        failures: failureCount,
      });

    } catch (error: any) {
      lineLogger.error('LINE webhook processing error', {
        requestId,
        error: error.message,
        stack: error.stack,
      });

      LoggerHelper.logError(error, 'LINE webhook controller error', { requestId });

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Webhook processing failed',
        requestId,
      });
    }
  }

  /**
   * 處理單一 LINE 事件
   */
  private static async processEvent(event: WebhookEvent): Promise<EventProcessResult> {
    try {
      const source = LineWebhookController.extractMessageSource(event);
      const lineService = getLineService();

      switch (event.type) {
        case 'message':
          return await LineWebhookController.handleMessageEvent(event as MessageEvent);

        case 'postback':
          return await LineWebhookController.handlePostbackEvent(event as PostbackEvent);

        case 'follow':
          return await LineWebhookController.handleFollowEvent(event as FollowEvent);

        case 'unfollow':
          return await LineWebhookController.handleUnfollowEvent(event as UnfollowEvent);

        case 'join':
          return await LineWebhookController.handleJoinEvent(event as any);

        case 'leave':
          return await LineWebhookController.handleLeaveEvent(event as any);

        case 'memberJoined':
          return await LineWebhookController.handleMemberJoinedEvent(event as any);

        case 'memberLeft':
          return await LineWebhookController.handleMemberLeftEvent(event as any);

        default:
          lineLogger.warn('Unsupported event type', { 
            eventType: event.type,
            timestamp: event.timestamp 
          });
          
          return {
            success: true,
            message: `Unsupported event type: ${event.type}`,
          };
      }

    } catch (error: any) {
      lineLogger.error('Event processing error', {
        eventType: event.type,
        error: error.message,
        timestamp: event.timestamp,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 處理訊息事件
   */
  private static async handleMessageEvent(event: MessageEvent): Promise<EventProcessResult> {
    const lineService = getLineService();
    const { message } = event;

    switch (message.type) {
      case 'text':
        return await lineService.handleTextMessage(event, message);

      case 'image':
        return await lineService.handleImageMessage(event, message);

      case 'video':
        return {
          success: true,
          message: 'Video message received but not processed',
        };

      case 'audio':
        return {
          success: true,
          message: 'Audio message received but not processed',
        };

      case 'file':
        return {
          success: true,
          message: 'File message received but not processed',
        };

      case 'location':
        return {
          success: true,
          message: 'Location message received but not processed',
        };

      case 'sticker':
        return {
          success: true,
          message: 'Sticker message received but not processed',
        };

      default:
        lineLogger.warn('Unsupported message type', { 
          messageType: (message as any).type,
          messageId: (message as any).id 
        });
        
        return {
          success: true,
          message: `Unsupported message type: ${(message as any).type}`,
        };
    }
  }

  /**
   * 處理 Postback 事件
   */
  private static async handlePostbackEvent(event: PostbackEvent): Promise<EventProcessResult> {
    const { postback, replyToken, source } = event;
    const userId = source.userId || 'unknown';

    lineLogger.info('Postback event received', {
      userId,
      data: postback.data,
      params: postback.params,
    });

    try {
      const lineService = getLineService();
      
      // 根據 postback data 處理不同的動作
      if (postback.data.startsWith('action=')) {
        const action = postback.data.split('=')[1];
        
        switch (action) {
          case 'help':
            await lineService.replyMessage(replyToken, 
              '🤖 MemoryArk LINE Bot 說明\n\n' +
              '請直接傳送照片，我會自動為您保存到 MemoryArk 系統中。'
            );
            break;

          case 'status':
            await lineService.replyMessage(replyToken, '系統狀態查詢中...');
            // TODO: 實作狀態查詢
            break;

          default:
            await lineService.replyMessage(replyToken, `未知的動作：${action}`);
        }
      }

      return { success: true, message: 'Postback event processed' };

    } catch (error: any) {
      lineLogger.error('Postback event processing error', {
        userId,
        error: error.message,
        postbackData: postback.data,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * 處理關注事件
   */
  private static async handleFollowEvent(event: FollowEvent): Promise<EventProcessResult> {
    const { replyToken, source } = event;
    const userId = source.userId || 'unknown';

    lineLogger.info('User followed the bot', { userId });

    try {
      const lineService = getLineService();
      
      await lineService.replyMessage(replyToken,
        '🎉 歡迎使用 MemoryArk LINE Bot！\n\n' +
        '📸 主要功能：\n' +
        '直接傳送照片給我，我會自動為您保存到 MemoryArk 系統中，讓您的珍貴回憶永不遺失！\n\n' +
        '💡 使用說明：\n' +
        '• 直接傳送照片即可\n' +
        '• 輸入 /help 查看更多功能\n' +
        '• 輸入 /status 檢查系統狀態\n\n' +
        '謝謝您的關注！ 😊'
      );

      return { success: true, message: 'Follow event processed' };

    } catch (error: any) {
      lineLogger.error('Follow event processing error', {
        userId,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * 處理取消關注事件
   */
  private static async handleUnfollowEvent(event: UnfollowEvent): Promise<EventProcessResult> {
    const userId = event.source.userId || 'unknown';
    
    lineLogger.info('User unfollowed the bot', { userId });

    // 取消關注事件不需要回覆，只需要記錄
    return { success: true, message: 'Unfollow event processed' };
  }

  /**
   * 處理加入群組事件
   */
  private static async handleJoinEvent(event: WebhookEvent): Promise<EventProcessResult> {
    const { replyToken, source } = event as any;
    
    lineLogger.info('Bot joined group/room', { 
      sourceType: source.type,
      sourceId: source.groupId || source.roomId 
    });

    try {
      const lineService = getLineService();
      
      await lineService.replyMessage(replyToken,
        '👋 感謝邀請 MemoryArk Bot 加入！\n\n' +
        '📸 我可以幫助大家保存珍貴的照片到 MemoryArk 系統中。\n\n' +
        '使用方法很簡單，直接在群組中傳送照片給我就可以了！'
      );

      return { success: true, message: 'Join event processed' };

    } catch (error: any) {
      lineLogger.error('Join event processing error', {
        sourceType: source.type,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * 處理離開群組事件
   */
  private static async handleLeaveEvent(event: WebhookEvent): Promise<EventProcessResult> {
    const { source } = event as any;
    
    lineLogger.info('Bot left group/room', { 
      sourceType: source.type,
      sourceId: source.groupId || source.roomId 
    });

    // 離開事件不需要回覆，只需要記錄
    return { success: true, message: 'Leave event processed' };
  }

  /**
   * 處理成員加入事件
   */
  private static async handleMemberJoinedEvent(event: any): Promise<EventProcessResult> {
    lineLogger.info('Member joined group/room', { 
      eventType: event.type,
      timestamp: event.timestamp 
    });
    return { success: true, message: 'Member joined event processed' };
  }

  /**
   * 處理成員離開事件
   */
  private static async handleMemberLeftEvent(event: any): Promise<EventProcessResult> {
    lineLogger.info('Member left group/room', { 
      eventType: event.type,
      timestamp: event.timestamp 
    });
    return { success: true, message: 'Member left event processed' };
  }

  /**
   * 提取訊息來源資訊
   */
  private static extractMessageSource(event: WebhookEvent): LineMessageSource {
    const { source } = event;

    if (!source) {
      throw new Error('Event source is missing');
    }

    switch (source.type) {
      case 'user':
        return {
          type: 'user',
          userId: source.userId,
        };

      case 'group':
        return {
          type: 'group',
          groupId: source.groupId,
          userId: source.userId,
        };

      case 'room':
        return {
          type: 'room',
          roomId: source.roomId,
          userId: source.userId,
        };

      default:
        throw new Error(`Unsupported source type: ${(source as any).type}`);
    }
  }

  /**
   * 健康檢查端點
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const lineService = getLineService();
      
      // 基本健康檢查
      const status = {
        service: 'line-webhook',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      };

      res.status(200).json(status);

    } catch (error: any) {
      lineLogger.error('Health check failed', { error: error.message });

      res.status(503).json({
        service: 'line-webhook',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// 匯出控制器方法供路由使用
export const {
  handleWebhook,
  healthCheck,
} = LineWebhookController;