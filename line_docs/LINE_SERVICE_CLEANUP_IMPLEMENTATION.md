# LINE Service 自動清理機制實作

## 🎯 選定方案：node-cron + 容器生命週期清理

採用 **node-cron 定時清理** + **容器啟動/關閉時清理** 的雙重機制，確保 Redis 隊列不會累積過多任務。

## 🔧 核心實作

### 1. 清理服務主體

```typescript
// src/services/cleanupService.ts
import cron from 'node-cron';
import { photoQueue } from '../queues/photoQueue';
import { logger } from '../utils/logger';
import { config } from '../config';

export class CleanupService {
  private tasks: cron.ScheduledTask[] = [];
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('清理服務已在運行中');
      return;
    }

    // 容器啟動時立即清理
    await this.onStartupCleanup();

    // 設定定時清理任務
    this.setupScheduledCleanup();
    
    this.isRunning = true;
    logger.info('🧹 清理服務已啟動');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    logger.info('🛑 正在停止清理服務...');
    
    // 停止所有定時任務
    this.tasks.forEach(task => {
      task.stop();
      task.destroy();
    });
    this.tasks = [];
    
    // 容器關閉前最後清理
    await this.onShutdownCleanup();
    
    this.isRunning = false;
    logger.info('✅ 清理服務已停止');
  }

  // 容器啟動時清理
  private async onStartupCleanup(): Promise<void> {
    logger.info('🚀 容器啟動清理開始...');
    
    try {
      // 清理所有卡住的任務
      const stalledJobs = await photoQueue.getJobs(['stalled']);
      if (stalledJobs.length > 0) {
        await photoQueue.clean(0, 'stalled');
        logger.info(`清理了 ${stalledJobs.length} 個卡住的任務`);
      }

      // 清理過多的完成任務
      const stats = await photoQueue.getJobCounts();
      if (stats.completed > config.CLEANUP.KEEP_COMPLETED) {
        const toRemove = stats.completed - config.CLEANUP.KEEP_COMPLETED;
        await photoQueue.clean(0, 'completed', toRemove);
        logger.info(`清理了 ${toRemove} 個舊的完成任務`);
      }

      // 清理過多的失敗任務
      if (stats.failed > config.CLEANUP.KEEP_FAILED) {
        const toRemove = stats.failed - config.CLEANUP.KEEP_FAILED;
        await photoQueue.clean(0, 'failed', toRemove);
        logger.info(`清理了 ${toRemove} 個舊的失敗任務`);
      }

      logger.info('✅ 容器啟動清理完成');
    } catch (error) {
      logger.error('❌ 容器啟動清理失敗', error);
    }
  }

  // 容器關閉前清理
  private async onShutdownCleanup(): Promise<void> {
    logger.info('🔄 容器關閉前清理開始...');
    
    try {
      // 等待當前處理中的任務完成（最多等 30 秒）
      await this.waitForActiveJobs(30000);
      
      // 清理卡住的任務
      await photoQueue.clean(0, 'stalled');
      
      // 保留少量任務，其餘清理
      await photoQueue.clean(0, 'completed', config.CLEANUP.KEEP_COMPLETED);
      await photoQueue.clean(0, 'failed', config.CLEANUP.KEEP_FAILED);
      
      logger.info('✅ 容器關閉前清理完成');
    } catch (error) {
      logger.error('❌ 容器關閉前清理失敗', error);
    }
  }

  // 設定定時清理任務
  private setupScheduledCleanup(): void {
    logger.info('⏰ 設定定時清理任務...');

    // 每 30 分鐘輕量清理
    const lightCleanupTask = cron.schedule('*/30 * * * *', async () => {
      await this.lightCleanup();
    }, { 
      scheduled: true,
      name: 'light-cleanup'
    });

    // 每 6 小時中度清理
    const mediumCleanupTask = cron.schedule('0 */6 * * *', async () => {
      await this.mediumCleanup();
    }, { 
      scheduled: true,
      name: 'medium-cleanup'
    });

    // 每天凌晨 2 點深度清理
    const deepCleanupTask = cron.schedule('0 2 * * *', async () => {
      await this.deepCleanup();
    }, { 
      scheduled: true,
      name: 'deep-cleanup'
    });

    this.tasks = [lightCleanupTask, mediumCleanupTask, deepCleanupTask];

    logger.info('📅 定時清理任務已設定', {
      lightCleanup: '每 30 分鐘',
      mediumCleanup: '每 6 小時', 
      deepCleanup: '每天凌晨 2 點'
    });
  }

  // 輕量清理（每 30 分鐘）
  private async lightCleanup(): Promise<void> {
    try {
      logger.debug('🧽 執行輕量清理...');
      
      // 只清理卡住的任務
      const stalledCleaned = await photoQueue.clean(0, 'stalled');
      
      if (stalledCleaned.length > 0) {
        logger.info(`輕量清理：清理了 ${stalledCleaned.length} 個卡住的任務`);
      }
    } catch (error) {
      logger.error('輕量清理失敗', error);
    }
  }

  // 中度清理（每 6 小時）
  private async mediumCleanup(): Promise<void> {
    try {
      logger.info('🧼 執行中度清理...');
      
      const stats = await photoQueue.getJobCounts();
      let cleanedCount = 0;

      // 如果完成任務超過限制，清理多餘的
      if (stats.completed > config.CLEANUP.KEEP_COMPLETED) {
        const toRemove = Math.min(
          stats.completed - config.CLEANUP.KEEP_COMPLETED,
          50 // 一次最多清理 50 個
        );
        const cleaned = await photoQueue.clean(0, 'completed', toRemove);
        cleanedCount += cleaned.length;
      }

      // 如果失敗任務超過限制，清理多餘的
      if (stats.failed > config.CLEANUP.KEEP_FAILED) {
        const toRemove = Math.min(
          stats.failed - config.CLEANUP.KEEP_FAILED,
          25 // 一次最多清理 25 個
        );
        const cleaned = await photoQueue.clean(0, 'failed', toRemove);
        cleanedCount += cleaned.length;
      }

      // 清理卡住的任務
      const stalledCleaned = await photoQueue.clean(0, 'stalled');
      cleanedCount += stalledCleaned.length;

      if (cleanedCount > 0) {
        logger.info(`中度清理完成：清理了 ${cleanedCount} 個任務`);
      }
    } catch (error) {
      logger.error('中度清理失敗', error);
    }
  }

  // 深度清理（每天凌晨 2 點）
  private async deepCleanup(): Promise<void> {
    try {
      logger.info('🧽 執行深度清理...');
      
      const oneDayAgo = 24 * 60 * 60 * 1000;
      const threeDaysAgo = 3 * 24 * 60 * 60 * 1000;
      
      // 清理 1 天前的完成任務
      const oldCompleted = await photoQueue.clean(oneDayAgo, 'completed');
      
      // 清理 3 天前的失敗任務
      const oldFailed = await photoQueue.clean(threeDaysAgo, 'failed');
      
      // 清理所有卡住的任務
      const stalled = await photoQueue.clean(0, 'stalled');
      
      // 清理暫存檔案
      const tempFilesCleared = await this.cleanupTempFiles();
      
      logger.info('深度清理完成', {
        oldCompleted: oldCompleted.length,
        oldFailed: oldFailed.length,
        stalled: stalled.length,
        tempFiles: tempFilesCleared
      });
    } catch (error) {
      logger.error('深度清理失敗', error);
    }
  }

  // 清理暫存檔案
  private async cleanupTempFiles(): Promise<number> {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      
      // 確保暫存目錄存在
      try {
        await fs.access(tempDir);
      } catch {
        return 0; // 目錄不存在，跳過
      }
      
      const files = await fs.readdir(tempDir);
      let cleanedCount = 0;
      
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          // 刪除 24 小時前的檔案
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
          if (stats.mtime.getTime() < oneDayAgo) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          logger.warn(`清理暫存檔案失敗: ${file}`, error);
        }
      }
      
      return cleanedCount;
    } catch (error) {
      logger.error('清理暫存檔案失敗', error);
      return 0;
    }
  }

  // 等待處理中的任務完成
  private async waitForActiveJobs(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const activeJobs = await photoQueue.getJobs(['active']);
      
      if (activeJobs.length === 0) {
        logger.info('所有處理中的任務已完成');
        return;
      }
      
      logger.info(`等待 ${activeJobs.length} 個任務完成...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    logger.warn('等待任務完成超時，強制關閉');
  }

  // 取得清理統計
  async getCleanupStats(): Promise<any> {
    const queueStats = await photoQueue.getJobCounts();
    
    return {
      isRunning: this.isRunning,
      scheduledTasks: this.tasks.length,
      queueStats,
      config: {
        keepCompleted: config.CLEANUP.KEEP_COMPLETED,
        keepFailed: config.CLEANUP.KEEP_FAILED
      },
      lastUpdate: new Date().toISOString()
    };
  }
}

export const cleanupService = new CleanupService();
```

### 2. 配置設定

```typescript
// src/config/index.ts 更新
export const config = {
  // ... 原有配置
  
  CLEANUP: {
    ENABLED: process.env.CLEANUP_ENABLED !== 'false', // 預設啟用
    KEEP_COMPLETED: parseInt(process.env.CLEANUP_KEEP_COMPLETED || '100'),
    KEEP_FAILED: parseInt(process.env.CLEANUP_KEEP_FAILED || '50'),
    TEMP_FILES_AGE: parseInt(process.env.CLEANUP_TEMP_FILES_AGE || '86400000') // 24小時
  }
};
```

### 3. 主程式整合

```typescript
// src/index.ts 完整版本
import express from 'express';
import { cleanupService } from './services/cleanupService';
import { photoQueue } from './queues/photoQueue';
import { logger } from './utils/logger';
import { config } from './config';

const app = express();

// ... 其他中間件設定

// 優雅關閉處理
const gracefulShutdown = async (signal: string) => {
  logger.info(`收到 ${signal} 信號，開始優雅關閉...`);
  
  try {
    // 1. 停止清理服務（會等待當前任務完成）
    await cleanupService.stop();
    
    // 2. 停止隊列處理
    await photoQueue.close();
    
    // 3. 關閉 HTTP 伺服器
    server.close(() => {
      logger.info('HTTP 伺服器已關閉');
      process.exit(0);
    });
    
    // 4. 強制超時
    setTimeout(() => {
      logger.error('優雅關閉超時，強制退出');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    logger.error('優雅關閉失敗', error);
    process.exit(1);
  }
};

// 監聽關閉信號
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 啟動應用程式
const server = app.listen(config.PORT, async () => {
  logger.info(`LINE Service started on port ${config.PORT}`);
  
  // 啟動清理服務
  if (config.CLEANUP.ENABLED) {
    await cleanupService.start();
  } else {
    logger.info('清理服務已停用');
  }
});

export default app;
```

### 4. 隊列配置更新

```typescript
// src/queues/photoQueue.ts 優化版本
import Bull from 'bull';
import { config } from '../config';
import { logger } from '../utils/logger';

// Redis 配置
const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true
};

// 建立照片處理隊列
export const photoQueue = new Bull('photo-processing', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    // 重要：設定自動清理，但保留較少數量
    removeOnComplete: 20,  // 只保留最近 20 個成功任務
    removeOnFail: 10,      // 只保留最近 10 個失敗任務
    
    // 防止重複任務
    jobId: (job) => `photo-${job.data.messageId}`,
  },
  settings: {
    stalledInterval: 30 * 1000,    // 30秒檢查卡住任務
    maxStalledCount: 1             // 最多重試 1 次卡住任務
  }
});

// 隊列事件監聽
photoQueue.on('ready', () => {
  logger.info('📋 照片處理隊列已就緒');
});

photoQueue.on('error', (error) => {
  logger.error('📋 隊列錯誤', error);
});

photoQueue.on('stalled', (job) => {
  logger.warn(`📋 任務卡住: ${job.id}`);
});

// ... 其他處理邏輯保持不變
```

### 5. Docker 配置

```yaml
# docker-compose.yml 更新
version: '3.8'

services:
  line-service:
    build: 
      context: ./line-service
      dockerfile: Dockerfile
    container_name: memoryark-line-service
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - CLEANUP_ENABLED=true              # 啟用清理
      - CLEANUP_KEEP_COMPLETED=100        # 保留完成任務數
      - CLEANUP_KEEP_FAILED=50            # 保留失敗任務數
      # ... 其他環境變數
    volumes:
      - ./line-service/temp:/app/temp     # 暫存目錄
      - ./logs:/app/logs
    depends_on:
      - redis
      - backend
    networks:
      - memoryark-network
    # 健康檢查
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  redis:
    image: redis:7.0.11-alpine
    container_name: memoryark-redis
    restart: unless-stopped
    command: |
      redis-server 
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - memoryark-network
    # Redis 健康檢查
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  redis_data:

networks:
  memoryark-network:
    driver: bridge
```

### 6. 健康檢查端點

```typescript
// src/controllers/healthController.ts
import { Request, Response } from 'express';
import { cleanupService } from '../services/cleanupService';
import { photoQueue } from '../queues/photoQueue';

export class HealthController {
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // 檢查清理服務
      const cleanupStats = await cleanupService.getCleanupStats();
      
      // 檢查 Redis 連接
      const queueHealth = await photoQueue.isReady();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          cleanup: {
            isRunning: cleanupStats.isRunning,
            scheduledTasks: cleanupStats.scheduledTasks
          },
          queue: {
            isReady: queueHealth,
            stats: cleanupStats.queueStats
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async cleanupStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await cleanupService.getCleanupStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const healthController = new HealthController();
```

### 7. 環境變數範例

```bash
# .env.production
# 基本設定
NODE_ENV=production
PORT=3000

# LINE 設定
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here
LINE_CHANNEL_ID=your_channel_id_here

# Redis 設定
REDIS_HOST=redis
REDIS_PORT=6379

# MemoryArk 整合
MEMORYARK_API_URL=http://backend:8081
MEMORYARK_API_KEY=your_internal_api_key
MEMORYARK_UPLOAD_CATEGORY_ID=1

# 清理設定
CLEANUP_ENABLED=true
CLEANUP_KEEP_COMPLETED=100
CLEANUP_KEEP_FAILED=50
CLEANUP_TEMP_FILES_AGE=86400000

# 日誌設定
LOG_LEVEL=info
```

## 🚀 部署與測試

### 1. 部署腳本

```bash
#!/bin/bash
# scripts/deploy-with-cleanup.sh

echo "🚀 部署 LINE 服務（含清理機制）..."

# 停止現有容器
echo "⏹️ 停止現有服務..."
podman-compose down

# 清理 Redis 資料（如果需要）
if [ "$1" = "--clean-redis" ]; then
    echo "🗑️ 清理 Redis 資料..."
    podman volume rm memoryark_redis_data || true
fi

# 啟動服務
echo "▶️ 啟動服務..."
podman-compose up -d

# 等待服務就緒
echo "⏳ 等待服務啟動..."
sleep 30

# 健康檢查
echo "🏥 檢查服務健康狀態..."
curl -f http://localhost:7001/api/line/health || {
    echo "❌ 健康檢查失敗"
    podman-compose logs line-service
    exit 1
}

echo "✅ 部署完成！清理機制已啟用"
echo "📊 查看清理統計: curl http://localhost:7001/api/line/cleanup/stats"
```

### 2. 測試清理功能

```bash
#!/bin/bash
# scripts/test-cleanup.sh

echo "🧪 測試清理功能..."

# 檢查清理統計
echo "📊 當前隊列狀態:"
curl -s http://localhost:7001/api/line/cleanup/stats | jq .

# 等待一段時間觀察自動清理
echo "⏰ 等待 60 秒觀察自動清理..."
sleep 60

echo "📊 清理後隊列狀態:"
curl -s http://localhost:7001/api/line/cleanup/stats | jq .

echo "✅ 清理功能測試完成"
```

## 📊 監控建議

### 1. 日誌監控關鍵字
```bash
# 監控清理相關日誌
podman-compose logs -f line-service | grep -E "(清理|cleanup|stalled)"
```

### 2. Grafana 監控面板指標
- 隊列任務數量趨勢
- 清理任務執行頻率
- Redis 記憶體使用量
- 容器重啟次數

## 📝 總結

**此方案的優勢：**

1. ✅ **自動啟動清理** - 容器啟動時立即清理異常任務
2. ✅ **定時清理** - 30分鐘/6小時/每日三級清理策略
3. ✅ **優雅關閉** - 容器關閉前等待任務完成並清理
4. ✅ **配置靈活** - 環境變數控制清理參數
5. ✅ **監控友善** - 健康檢查和統計端點
6. ✅ **安全穩定** - 錯誤處理和超時保護

**清理時程：**
- **即時**: 容器啟動/關閉時
- **30分鐘**: 清理卡住任務
- **6小時**: 清理過多任務
- **每日**: 深度清理舊任務和暫存檔案

這樣設計確保 Redis 隊列始終保持在合理範圍內，系統長期穩定運行！