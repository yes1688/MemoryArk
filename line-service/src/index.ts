import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';

// 載入環境變數
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config(); // 載入預設 .env

// 匯入配置和服務
import { config, validateConfig } from './config';
import { initializeLineService } from './services/lineService';
import { initializeMemoryArkApi } from './services/memoryarkApi';
import { createWebhookRouter } from './routes/webhook';
import { createApiRouter } from './routes/api';
import logger, { systemLogger, morganStream } from './utils/logger';

/**
 * MemoryArk LINE Service 主程式
 */
async function startServer() {
  try {
    // 1. 驗證配置
    systemLogger.info('Starting MemoryArk LINE Service...');
    systemLogger.info('Validating configuration...');
    validateConfig();
    systemLogger.info('Configuration validation passed');

    // 2. 初始化服務
    systemLogger.info('Initializing services...');
    
    // 初始化 MemoryArk API 服務
    const memoryArkApi = initializeMemoryArkApi(config.memoryark);
    systemLogger.info('MemoryArk API service initialized');

    // 初始化 LINE 服務
    const lineService = initializeLineService(config.line);
    systemLogger.info('LINE service initialized');

    // 3. 建立 Express 應用程式
    const app = express();

    // 4. 設定中間件
    systemLogger.info('Setting up middleware...');
    
    // 安全性中間件
    app.use(helmet({
      contentSecurityPolicy: false, // 允許 LINE Webhook
    }));

    // CORS 設定
    app.use(cors({
      origin: config.nodeEnv === 'development' ? true : false,
      credentials: true,
    }));

    // 請求日誌
    app.use(morgan('combined', { stream: morganStream }));

    // 請求解析
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 5. 設定路由
    systemLogger.info('Setting up routes...');

    // 基本路由
    app.get('/', (req, res) => {
      res.json({
        service: 'MemoryArk LINE Service',
        version: process.env.npm_package_version || '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          webhook: '/webhook/line',
          api: '/api/line/*',
          health: '/health',
        },
      });
    });

    // Webhook 路由
    app.use('/webhook', createWebhookRouter(config.line.channelSecret));

    // API 路由
    app.use('/api/line', createApiRouter());

    // 全域健康檢查
    app.get('/health', (req, res) => {
      res.json({
        service: 'line-service',
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        environment: config.nodeEnv,
      });
    });

    // 6. 錯誤處理
    // 404 處理
    app.use('*', (req, res) => {
      systemLogger.warn('Route not found', { 
        method: req.method, 
        url: req.originalUrl,
        userAgent: req.get('User-Agent') 
      });
      
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableEndpoints: {
          webhook: '/webhook/line',
          api: '/api/line/*',
          health: '/health',
        },
      });
    });

    // 全域錯誤處理
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      systemLogger.error('Unhandled application error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
      });

      res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
      });
    });

    // 7. 啟動伺服器
    const server = createServer(app);
    
    server.listen(config.server.port, () => {
      systemLogger.info(`MemoryArk LINE Service started successfully`, {
        port: config.server.port,
        environment: config.server.env,
        nodeVersion: process.version,
        processId: process.pid,
      });

      console.log('🚀 MemoryArk LINE Service is running!');
      console.log(`📱 Service: http://localhost:${config.server.port}`);
      console.log(`🔗 Webhook: http://localhost:${config.server.port}/webhook/line`);
      console.log(`⚡ API: http://localhost:${config.server.port}/api/line/health`);
      console.log(`💚 Health: http://localhost:${config.server.port}/health`);
      console.log(`📊 Environment: ${config.server.env}`);
    });

    // 8. 優雅關閉處理
    const gracefulShutdown = (signal: string) => {
      systemLogger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(() => {
        systemLogger.info('HTTP server closed');
        
        // 清理資源
        systemLogger.info('Cleaning up resources...');
        
        // 這裡可以添加其他清理邏輯，如關閉資料庫連線等
        
        systemLogger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // 強制關閉的超時設定
      setTimeout(() => {
        systemLogger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    // 處理程序終止信號
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 處理未捕獲的異常
    process.on('uncaughtException', (error) => {
      systemLogger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      systemLogger.error('Unhandled Rejection', {
        reason: reason,
        promise: promise,
      });
      process.exit(1);
    });

    // 測試服務連線
    try {
      systemLogger.info('Testing service connections...');
      const memoryArkHealth = await memoryArkApi.checkApiHealth();
      
      if (memoryArkHealth) {
        systemLogger.info('MemoryArk API connection test passed');
      } else {
        systemLogger.warn('MemoryArk API connection test failed - service may not be available');
      }
    } catch (error: any) {
      systemLogger.warn('Service connection test failed', { error: error.message });
    }

    systemLogger.info('All services initialized successfully');

  } catch (error: any) {
    systemLogger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    
    console.error('❌ Failed to start MemoryArk LINE Service:');
    console.error(error.message);
    
    process.exit(1);
  }
}

// 啟動服務
startServer().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});