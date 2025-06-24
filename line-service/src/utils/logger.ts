import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// 日誌等級配置
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 根據環境決定日誌等級
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// 日誌顏色配置
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// 日誌格式配置
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// 檔案日誌格式（不包含顏色）
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// 日誌傳輸器配置
const transports = [
  // 控制台輸出
  new winston.transports.Console({
    format,
  }),
  // 錯誤日誌檔案
  new DailyRotateFile({
    filename: path.join('logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),
  // 組合日誌檔案
  new DailyRotateFile({
    filename: path.join('logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
  }),
];

// 建立日誌器
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  // 處理未捕獲的異常
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join('logs', 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ],
  // 處理未處理的 Promise 拒絕
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join('logs', 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ],
});

// LINE 專用日誌器
export const lineLogger = logger.child({ service: 'line-webhook' });

// MemoryArk API 專用日誌器
export const memoryArkLogger = logger.child({ service: 'memoryark-api' });

// 照片處理專用日誌器
export const photoLogger = logger.child({ service: 'photo-processing' });

// 系統日誌器
export const systemLogger = logger.child({ service: 'system' });

// Morgan HTTP 日誌流
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// 日誌輔助函數
export class LoggerHelper {
  /**
   * 記錄 LINE 事件
   */
  static logLineEvent(eventType: string, userId: string, data?: any) {
    lineLogger.info('LINE event processed', {
      eventType,
      userId,
      data: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * 記錄照片處理
   */
  static logPhotoProcessing(messageId: string, userId: string, status: string, error?: string) {
    photoLogger.info('Photo processing update', {
      messageId,
      userId,
      status,
      error,
    });
  }

  /**
   * 記錄 MemoryArk API 呼叫
   */
  static logMemoryArkApiCall(endpoint: string, method: string, status: number, responseTime?: number) {
    memoryArkLogger.info('MemoryArk API call', {
      endpoint,
      method,
      status,
      responseTime,
    });
  }

  /**
   * 記錄錯誤詳情
   */
  static logError(error: Error, context?: string, metadata?: any) {
    logger.error('Application error', {
      message: error.message,
      stack: error.stack,
      context,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  }

  /**
   * 記錄效能指標
   */
  static logPerformance(operation: string, duration: number, metadata?: any) {
    logger.info('Performance metric', {
      operation,
      duration,
      unit: 'ms',
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  }

  /**
   * 記錄 Webhook 驗證
   */
  static logWebhookValidation(isValid: boolean, signature?: string, body?: string) {
    lineLogger.info('Webhook signature validation', {
      isValid,
      hasSignature: !!signature,
      bodyLength: body?.length || 0,
    });
  }

  /**
   * 記錄佇列任務
   */
  static logQueueTask(taskType: string, taskId: string, status: string, data?: any) {
    systemLogger.info('Queue task update', {
      taskType,
      taskId,
      status,
      data: data ? JSON.stringify(data) : undefined,
    });
  }
}

export default logger;