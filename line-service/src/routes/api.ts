import { Router, Request, Response } from 'express';
import { getLineService } from '../services/lineService';
import { getMemoryArkApi } from '../services/memoryarkApi';
import { systemLogger, LoggerHelper } from '../utils/logger';

/**
 * 管理 API 路由
 */
export function createApiRouter(): Router {
  const router = Router();

  // API 健康檢查
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const lineService = getLineService();
      const memoryArkApi = getMemoryArkApi();

      // 檢查各服務狀態
      const [memoryArkHealth] = await Promise.allSettled([
        memoryArkApi.checkApiHealth(),
      ]);

      const status = {
        service: 'line-service-api',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        services: {
          line: {
            status: 'healthy',
            message: 'LINE Bot service is running',
          },
          memoryark: {
            status: memoryArkHealth.status === 'fulfilled' && memoryArkHealth.value ? 'healthy' : 'unhealthy',
            message: memoryArkHealth.status === 'fulfilled' && memoryArkHealth.value 
              ? 'MemoryArk API is accessible' 
              : 'MemoryArk API is not accessible',
          },
        },
      };

      systemLogger.info('API health check performed', { status: status.status });
      res.status(200).json(status);

    } catch (error: any) {
      systemLogger.error('API health check failed', { error: error.message });
      
      res.status(503).json({
        service: 'line-service-api',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 系統資訊
  router.get('/info', (req: Request, res: Response) => {
    const info = {
      service: 'MemoryArk LINE Service',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };

    systemLogger.info('System info requested', { uptime: info.uptime });
    res.status(200).json(info);
  });

  // LINE Bot 資訊
  router.get('/line/info', (req: Request, res: Response) => {
    try {
      const lineService = getLineService();
      const config = lineService.getConfig();

      const info = {
        service: 'LINE Bot',
        channelId: config.channelId,
        hasAccessToken: !!config.channelAccessToken,
        hasChannelSecret: !!config.channelSecret,
        status: 'running',
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(info);

    } catch (error: any) {
      systemLogger.error('Failed to get LINE info', { error: error.message });
      
      res.status(500).json({
        error: 'Failed to get LINE service info',
        message: error.message,
      });
    }
  });

  // MemoryArk API 資訊
  router.get('/memoryark/info', (req: Request, res: Response) => {
    try {
      const memoryArkApi = getMemoryArkApi();
      const config = memoryArkApi.getConfig();

      const info = {
        service: 'MemoryArk API',
        apiUrl: config.apiUrl,
        uploadEndpoint: config.uploadEndpoint || '/api/photos/upload',
        maxFileSize: config.maxFileSize || 50 * 1024 * 1024,
        allowedMimeTypes: config.allowedMimeTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        hasApiToken: !!config.apiToken,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(info);

    } catch (error: any) {
      systemLogger.error('Failed to get MemoryArk info', { error: error.message });
      
      res.status(500).json({
        error: 'Failed to get MemoryArk API info',
        message: error.message,
      });
    }
  });

  // 測試 MemoryArk API 連線
  router.post('/memoryark/test', async (req: Request, res: Response) => {
    try {
      const memoryArkApi = getMemoryArkApi();
      const result = await memoryArkApi.testConnection();

      systemLogger.info('MemoryArk connection test performed', { 
        success: result.success,
        responseTime: result.responseTime 
      });

      res.status(result.success ? 200 : 503).json(result);

    } catch (error: any) {
      systemLogger.error('MemoryArk connection test failed', { error: error.message });
      
      res.status(500).json({
        success: false,
        message: 'Connection test failed',
        error: error.message,
      });
    }
  });

  // 統計資訊
  router.get('/stats', (req: Request, res: Response) => {
    const stats = {
      service: 'line-service',
      uptime: process.uptime(),
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100,
      },
      cpu: {
        usage: process.cpuUsage(),
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(stats);
  });

  // 錯誤處理
  router.use((error: any, req: Request, res: Response, next: any) => {
    LoggerHelper.logError(error, 'API route error', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

export default createApiRouter;