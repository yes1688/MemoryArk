# LINE 信徒照片接收系統 - 完整實作指南

## 📋 專案概述

本指南詳細說明如何在 MemoryArk2 教會管理系統中整合 LINE Bot 功能，讓信徒可以透過 LINE 直接上傳照片到系統中。採用**容器化微服務架構**，確保系統穩定性和可維護性。

### 🎯 功能需求
- 接收信徒透過 LINE 傳送的照片
- 自動下載並儲存到 MemoryArk2 系統
- 維護使用者資訊和照片關聯
- 提供自動回覆確認功能
- 支援批量照片處理
- 完整的錯誤處理和監控

## 🏗️ 系統架構

### 總體架構圖
```
┌─────────────────┐    HTTPS     ┌─────────────────────────────────┐
│   LINE 平台     │──Webhook────►│        MemoryArk2 System        │
│                 │              │  ┌─────────────┐ ┌─────────────┐│
└─────────────────┘              │  │LINE Service │ │   Backend   ││
                                 │  │(Node.js)    │ │   (Golang)  ││
                                 │  │Port: 3000   │ │  Port: 8081 ││
                                 │  └─────────────┘ └─────────────┘│
                                 │         │               │       │
                                 │         └───────────────┘       │
                                 │                ▼                │
                                 │    ┌─────────────────────┐     │
                                 │    │  Shared Storage     │     │
                                 │    │  • SQLite DB        │     │
                                 │    │  • File Uploads     │     │
                                 │    │  • Redis Queue      │     │
                                 │    └─────────────────────┘     │
                                 └─────────────────────────────────┘
```

### 技術棧選擇
| 組件 | 技術 | 版本 | 說明 |
|------|------|------|------|
| LINE Service | Node.js + TypeScript | 20.x LTS | Webhook 處理與 API 整合 |
| Web 框架 | Express.js | 4.x | 輕量高效的 HTTP 伺服器 |
| LINE SDK | @line/bot-sdk | 9.9.0 | 官方 SDK，功能完整 |
| 任務隊列 | Bull + Redis | 7.x | 非同步處理照片下載 |
| 容器化 | Docker/Podman | - | 與主系統統一容器架構 |
| 監控 | PM2 + Prometheus | - | 程序管理和監控 |

## 📁 專案結構

### LINE Service 目錄結構
```
line-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts              # 應用程式入口
│   ├── config/
│   │   └── index.ts          # 配置管理
│   ├── controllers/
│   │   ├── webhook.ts        # Webhook 控制器
│   │   └── health.ts         # 健康檢查
│   ├── services/
│   │   ├── lineService.ts    # LINE API 服務
│   │   ├── photoService.ts   # 照片處理服務
│   │   └── memoryarkApi.ts   # MemoryArk API 整合
│   ├── queues/
│   │   └── photoQueue.ts     # 照片處理隊列
│   ├── middleware/
│   │   ├── validation.ts     # 請求驗證
│   │   └── errorHandler.ts   # 錯誤處理
│   ├── types/
│   │   └── index.ts          # TypeScript 型別定義
│   └── utils/
│       ├── logger.ts         # 日誌工具
│       └── retry.ts          # 重試機制
├── tests/                    # 測試檔案
└── docker-compose.yml        # 開發環境容器配置
```

## 🔧 詳細實作步驟

### Phase 1: 環境準備與基礎設定

#### 1.1 LINE 開發者帳號設定
```bash
# 1. 前往 LINE Developers Console
# https://developers.line.biz/zh-hant/

# 2. 建立 Provider 和 Channel
# 3. 取得以下憑證：
#    - Channel Access Token
#    - Channel Secret
#    - Channel ID
```

#### 1.2 建立 NODE.js 專案
```bash
# 建立專案目錄
mkdir line-service
cd line-service

# 初始化 Node.js 專案
npm init -y

# 安裝核心依賴
npm install @line/bot-sdk express cors helmet morgan dotenv
npm install bull redis ioredis uuid axios form-data sharp
npm install winston pino

# 安裝開發依賴
npm install -D typescript @types/node @types/express
npm install -D @types/cors @types/morgan @types/uuid
npm install -D nodemon ts-node concurrently
npm install -D jest @types/jest supertest @types/supertest
```

#### 1.3 TypeScript 配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

#### 1.4 環境變數配置
```bash
# .env.example
# LINE Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ID=your_channel_id

# Redis 設定
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# MemoryArk API 設定
MEMORYARK_API_URL=http://backend:8081
MEMORYARK_API_KEY=internal_service_secret_key
MEMORYARK_UPLOAD_CATEGORY_ID=1

# 服務設定
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# 檔案處理設定
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp
PHOTO_DOWNLOAD_TIMEOUT=30000
MAX_CONCURRENT_DOWNLOADS=5
```

### Phase 2: 核心服務實作

#### 2.1 應用程式入口 (src/index.ts)
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { setupQueues } from './queues';

const app = express();

// 安全中間件
app.use(helmet());
app.use(cors({
  origin: config.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// 日誌中間件
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// 解析中間件
app.use(express.json({ limit: '2mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// 路由設定
setupRoutes(app);

// 錯誤處理
app.use(errorHandler);

// 啟動隊列系統
setupQueues();

const PORT = config.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`LINE Service started on port ${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
});

export default app;
```

#### 2.2 配置管理 (src/config/index.ts)
```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // LINE 設定
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET!,
  LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID!,
  
  // Redis 設定
  REDIS_HOST: process.env.REDIS_HOST || 'redis',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  
  // MemoryArk API 設定
  MEMORYARK_API_URL: process.env.MEMORYARK_API_URL || 'http://backend:8081',
  MEMORYARK_API_KEY: process.env.MEMORYARK_API_KEY!,
  MEMORYARK_UPLOAD_CATEGORY_ID: parseInt(process.env.MEMORYARK_UPLOAD_CATEGORY_ID || '1'),
  
  // 服務設定
  PORT: parseInt(process.env.PORT || '3000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // 檔案處理設定
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
  ALLOWED_MIME_TYPES: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
  PHOTO_DOWNLOAD_TIMEOUT: parseInt(process.env.PHOTO_DOWNLOAD_TIMEOUT || '30000'),
  MAX_CONCURRENT_DOWNLOADS: parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '5'),
};

// 驗證必要配置
const requiredConfigs = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
  'MEMORYARK_API_KEY'
];

for (const configKey of requiredConfigs) {
  if (!config[configKey as keyof typeof config]) {
    throw new Error(`Missing required configuration: ${configKey}`);
  }
}
```

#### 2.3 LINE 服務 (src/services/lineService.ts)
```typescript
import { messagingApi, middleware, webhook } from '@line/bot-sdk';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { retryWithBackoff } from '../utils/retry';

export class LineService {
  private client: messagingApi.MessagingApiClient;
  private lineConfig: { channelSecret: string };

  constructor() {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: config.LINE_CHANNEL_ACCESS_TOKEN
    });
    
    this.lineConfig = {
      channelSecret: config.LINE_CHANNEL_SECRET
    };
  }

  // 取得 LINE 中間件
  getMiddleware() {
    return middleware(this.lineConfig);
  }

  // 下載圖片內容
  async downloadImage(messageId: string): Promise<Buffer> {
    try {
      logger.info(`開始下載圖片: ${messageId}`);
      
      const stream = await this.client.getMessageContent(messageId);
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`圖片下載超時: ${messageId}`));
        }, config.PHOTO_DOWNLOAD_TIMEOUT);

        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          clearTimeout(timeout);
          const buffer = Buffer.concat(chunks);
          logger.info(`圖片下載完成: ${messageId}, 大小: ${buffer.length} bytes`);
          resolve(buffer);
        });

        stream.on('error', (error) => {
          clearTimeout(timeout);
          logger.error(`圖片下載失敗: ${messageId}`, error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error(`下載圖片失敗: ${messageId}`, error);
      throw error;
    }
  }

  // 取得使用者資料
  async getUserProfile(userId: string): Promise<any> {
    try {
      const profile = await retryWithBackoff(
        () => this.client.getProfile(userId),
        3
      );
      return profile;
    } catch (error) {
      logger.error(`取得用戶資料失敗: ${userId}`, error);
      throw error;
    }
  }

  // 回覆訊息
  async replyMessage(replyToken: string, messages: any[]): Promise<void> {
    try {
      const retryKey = uuidv4();
      
      await retryWithBackoff(
        () => this.client.replyMessage({
          replyToken,
          messages
        }, {
          'X-Line-Retry-Key': retryKey
        }),
        3
      );
      
      logger.info(`訊息回覆成功: ${replyToken}`);
    } catch (error) {
      logger.error(`訊息回覆失敗: ${replyToken}`, error);
      throw error;
    }
  }

  // 推播訊息
  async pushMessage(userId: string, messages: any[]): Promise<void> {
    try {
      const retryKey = uuidv4();
      
      await retryWithBackoff(
        () => this.client.pushMessage({
          to: userId,
          messages
        }, {
          'X-Line-Retry-Key': retryKey
        }),
        3
      );
      
      logger.info(`推播訊息成功: ${userId}`);
    } catch (error) {
      logger.error(`推播訊息失敗: ${userId}`, error);
      throw error;
    }
  }

  // 驗證檔案類型
  validateImageMessage(event: webhook.MessageEvent): boolean {
    if (event.message.type !== 'image') {
      return false;
    }

    // 可以在這裡加入更多驗證邏輯
    return true;
  }

  // 生成確認訊息
  generateConfirmationMessage(fileName: string, isSuccess: boolean): any {
    if (isSuccess) {
      return {
        type: 'text',
        text: `✅ 照片「${fileName}」已成功上傳！\n\n感謝您的分享，照片已儲存到教會資料庫中。`
      };
    } else {
      return {
        type: 'text',
        text: `❌ 照片「${fileName}」上傳失敗。\n\n請稍後再試，或聯繫管理員協助。`
      };
    }
  }

  // 生成錯誤訊息
  generateErrorMessage(error: string): any {
    return {
      type: 'text',
      text: `❌ 處理失敗：${error}\n\n請確認檔案格式正確，或聯繫管理員協助。`
    };
  }
}

export const lineService = new LineService();
```

#### 2.4 MemoryArk API 整合 (src/services/memoryarkApi.ts)
```typescript
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface UploadPhotoParams {
  file: Buffer;
  filename: string;
  mimeType: string;
  lineUserId: string;
  lineUserName: string;
  lineMessageId: string;
  virtualPath?: string;
}

export interface UploadResponse {
  success: boolean;
  data?: {
    id: number;
    name: string;
    filePath: string;
    virtualPath: string;
    size: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class MemoryArkApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.MEMORYARK_API_URL,
      timeout: 30000,
      headers: {
        'X-Internal-Service-Key': config.MEMORYARK_API_KEY,
        'User-Agent': 'LINE-Service/1.0.0'
      }
    });

    // 請求攔截器
    this.client.interceptors.request.use((config) => {
      logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // 回應攔截器
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error(`API Error: ${error.config?.url}`, {
          status: error.response?.status,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  // 上傳照片到 MemoryArk
  async uploadPhoto(params: UploadPhotoParams): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      
      // 基本檔案資訊
      formData.append('file', params.file, {
        filename: params.filename,
        contentType: params.mimeType
      });
      
      // MemoryArk 檔案欄位
      formData.append('originalName', params.filename);
      formData.append('virtualPath', params.virtualPath || `/LINE上傳/${new Date().getFullYear()}/${params.filename}`);
      formData.append('categoryId', config.MEMORYARK_UPLOAD_CATEGORY_ID.toString());
      
      // LINE 特定欄位（需要擴展 File 模型）
      formData.append('lineUserId', params.lineUserId);
      formData.append('lineUserName', params.lineUserName);
      formData.append('lineMessageId', params.lineMessageId);
      
      // 檔案描述
      formData.append('description', `由 LINE 用戶 ${params.lineUserName} 上傳`);
      formData.append('contentType', 'photo');
      formData.append('tags', 'LINE,照片,信徒分享');

      const response: AxiosResponse<UploadResponse> = await this.client.post(
        '/api/internal/line/upload-photo',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Length': formData.getLengthSync().toString()
          }
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('上傳照片到 MemoryArk 失敗', error);
      
      if (error.response) {
        return {
          success: false,
          error: {
            code: error.response.status.toString(),
            message: error.response.data?.message || '上傳失敗'
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: '網路連線失敗'
        }
      };
    }
  }

  // 取得分類列表
  async getCategories(): Promise<any[]> {
    try {
      const response = await this.client.get('/api/categories');
      return response.data.data || [];
    } catch (error) {
      logger.error('取得分類列表失敗', error);
      return [];
    }
  }

  // 健康檢查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health');
      return response.status === 200;
    } catch (error) {
      logger.error('MemoryArk 健康檢查失敗', error);
      return false;
    }
  }
}

export const memoryarkApi = new MemoryArkApiService();
```

#### 2.5 照片處理隊列 (src/queues/photoQueue.ts)
```typescript
import Bull from 'bull';
import { config } from '../config';
import { lineService } from '../services/lineService';
import { memoryarkApi } from '../services/memoryarkApi';
import { logger } from '../utils/logger';

export interface PhotoJobData {
  messageId: string;
  userId: string;
  replyToken: string;
  timestamp: number;
}

// 建立 Redis 連接
const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100
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
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

// 照片處理工作處理器
photoQueue.process('download-and-upload', config.MAX_CONCURRENT_DOWNLOADS, async (job) => {
  const { messageId, userId, replyToken, timestamp } = job.data as PhotoJobData;
  
  logger.info(`開始處理照片任務: ${messageId}`);
  
  try {
    // 步驟 1: 下載照片
    job.progress(10);
    const imageBuffer = await lineService.downloadImage(messageId);
    
    // 步驟 2: 取得使用者資料
    job.progress(30);
    const userProfile = await lineService.getUserProfile(userId);
    
    // 步驟 3: 驗證檔案
    job.progress(40);
    if (imageBuffer.length > config.MAX_FILE_SIZE) {
      throw new Error(`檔案過大: ${imageBuffer.length} bytes`);
    }
    
    // 步驟 4: 判斷檔案類型
    job.progress(50);
    const mimeType = detectMimeType(imageBuffer);
    if (!config.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`不支援的檔案類型: ${mimeType}`);
    }
    
    // 步驟 5: 上傳到 MemoryArk
    job.progress(70);
    const fileName = `${userProfile.displayName}_${Date.now()}.jpg`;
    const uploadResult = await memoryarkApi.uploadPhoto({
      file: imageBuffer,
      filename: fileName,
      mimeType,
      lineUserId: userId,
      lineUserName: userProfile.displayName,
      lineMessageId: messageId
    });
    
    // 步驟 6: 發送確認訊息
    job.progress(90);
    if (uploadResult.success) {
      const confirmMessage = lineService.generateConfirmationMessage(fileName, true);
      await lineService.replyMessage(replyToken, [confirmMessage]);
      logger.info(`照片處理成功: ${messageId}`);
    } else {
      throw new Error(uploadResult.error?.message || '上傳失敗');
    }
    
    job.progress(100);
    return { success: true, fileName };
    
  } catch (error: any) {
    logger.error(`照片處理失敗: ${messageId}`, error);
    
    // 發送錯誤訊息
    try {
      const errorMessage = lineService.generateErrorMessage(error.message);
      await lineService.replyMessage(replyToken, [errorMessage]);
    } catch (replyError) {
      logger.error(`回覆錯誤訊息失敗: ${messageId}`, replyError);
    }
    
    throw error;
  }
});

// 簡單的 MIME 類型檢測
function detectMimeType(buffer: Buffer): string {
  const header = buffer.toString('hex', 0, 4).toUpperCase();
  
  if (header.startsWith('FFD8FF')) return 'image/jpeg';
  if (header.startsWith('89504E47')) return 'image/png';
  if (header.startsWith('47494638')) return 'image/gif';
  if (header.startsWith('52494646')) return 'image/webp';
  
  return 'application/octet-stream';
}

// 隊列事件監聽
photoQueue.on('completed', (job, result) => {
  logger.info(`照片處理任務完成: ${job.id}`, result);
});

photoQueue.on('failed', (job, err) => {
  logger.error(`照片處理任務失敗: ${job?.id}`, err);
});

photoQueue.on('stalled', (job) => {
  logger.warn(`照片處理任務卡住: ${job.id}`);
});

export const setupQueues = () => {
  logger.info('照片處理隊列已啟動');
};
```

#### 2.6 Webhook 控制器 (src/controllers/webhook.ts)
```typescript
import { Request, Response } from 'express';
import { webhook } from '@line/bot-sdk';
import { lineService } from '../services/lineService';
import { photoQueue } from '../queues/photoQueue';
import { logger } from '../utils/logger';

export class WebhookController {
  // 處理 LINE Webhook 事件
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // LINE SDK 已經透過中間件驗證了簽章
      const events: webhook.Event[] = req.body.events;
      
      // 立即回應 LINE 平台
      res.status(200).send('OK');
      
      // 處理每個事件
      for (const event of events) {
        await this.processEvent(event);
      }
      
    } catch (error) {
      logger.error('Webhook 處理失敗', error);
      res.status(500).send('Internal Server Error');
    }
  }

  // 處理單個事件
  private async processEvent(event: webhook.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'message':
          await this.handleMessageEvent(event);
          break;
        case 'follow':
          await this.handleFollowEvent(event);
          break;
        case 'unfollow':
          await this.handleUnfollowEvent(event);
          break;
        default:
          logger.debug(`未處理的事件類型: ${event.type}`);
      }
    } catch (error) {
      logger.error(`事件處理失敗: ${event.type}`, error);
    }
  }

  // 處理訊息事件
  private async handleMessageEvent(event: webhook.MessageEvent): Promise<void> {
    const { message, source, replyToken, timestamp } = event;
    
    if (source.type !== 'user') {
      logger.debug('忽略非用戶訊息');
      return;
    }

    switch (message.type) {
      case 'image':
        await this.handleImageMessage(event);
        break;
      case 'text':
        await this.handleTextMessage(event);
        break;
      default:
        logger.debug(`未處理的訊息類型: ${message.type}`);
    }
  }

  // 處理圖片訊息
  private async handleImageMessage(event: webhook.MessageEvent): Promise<void> {
    const { message, source, replyToken, timestamp } = event;
    
    if (message.type !== 'image' || source.type !== 'user') {
      return;
    }

    const userId = source.userId;
    const messageId = message.id;

    logger.info(`收到圖片訊息: ${messageId} from ${userId}`);

    try {
      // 驗證圖片訊息
      if (!lineService.validateImageMessage(event)) {
        const errorMessage = lineService.generateErrorMessage('不支援的圖片格式');
        await lineService.replyMessage(replyToken, [errorMessage]);
        return;
      }

      // 加入處理隊列
      await photoQueue.add('download-and-upload', {
        messageId,
        userId,
        replyToken,
        timestamp
      }, {
        priority: 10,
        delay: 1000, // 稍微延遲處理，避免過於頻繁
        jobId: `photo-${messageId}` // 防止重複處理
      });

      logger.info(`圖片處理任務已加入隊列: ${messageId}`);

    } catch (error) {
      logger.error(`處理圖片訊息失敗: ${messageId}`, error);
      
      try {
        const errorMessage = lineService.generateErrorMessage('系統忙碌中，請稍後再試');
        await lineService.replyMessage(replyToken, [errorMessage]);
      } catch (replyError) {
        logger.error(`回覆錯誤訊息失敗: ${messageId}`, replyError);
      }
    }
  }

  // 處理文字訊息
  private async handleTextMessage(event: webhook.MessageEvent): Promise<void> {
    const { message, source, replyToken } = event;
    
    if (message.type !== 'text' || source.type !== 'user') {
      return;
    }

    const text = message.text.toLowerCase().trim();
    const userId = source.userId;

    logger.info(`收到文字訊息: "${text}" from ${userId}`);

    try {
      let replyMessage: any;

      switch (text) {
        case 'help':
        case '幫助':
        case '說明':
          replyMessage = {
            type: 'text',
            text: `📸 歡迎使用教會照片上傳服務！

🔹 直接傳送照片即可自動上傳
🔹 支援 JPG、PNG、GIF、WebP 格式
🔹 單張照片最大 10MB
🔹 上傳後會自動回覆確認訊息

如有問題請聯繫管理員。`
          };
          break;

        case 'status':
        case '狀態':
          const queueStats = await photoQueue.getWaiting();
          replyMessage = {
            type: 'text',
            text: `📊 系統狀態：
🔸 等待處理照片：${queueStats.length} 張
🔸 服務狀態：正常運行`
          };
          break;

        default:
          replyMessage = {
            type: 'text',
            text: '📸 請直接傳送照片，系統會自動為您上傳！\n\n輸入「幫助」查看使用說明。'
          };
      }

      await lineService.replyMessage(replyToken, [replyMessage]);

    } catch (error) {
      logger.error(`處理文字訊息失敗: ${userId}`, error);
    }
  }

  // 處理關注事件
  private async handleFollowEvent(event: webhook.FollowEvent): Promise<void> {
    const { source, replyToken } = event;
    
    if (source.type !== 'user') return;

    const userId = source.userId;
    logger.info(`新用戶關注: ${userId}`);

    try {
      const welcomeMessage = {
        type: 'text',
        text: `🎉 歡迎加入教會照片分享服務！

📸 使用方式：
• 直接傳送照片即可自動上傳
• 照片會儲存到教會資料庫
• 支援多種格式，最大 10MB

輸入「幫助」獲取更多資訊。

願神祝福您！ 🙏`
      };

      await lineService.replyMessage(replyToken, [welcomeMessage]);
    } catch (error) {
      logger.error(`發送歡迎訊息失敗: ${userId}`, error);
    }
  }

  // 處理取消關注事件
  private async handleUnfollowEvent(event: webhook.UnfollowEvent): Promise<void> {
    const { source } = event;
    
    if (source.type !== 'user') return;

    const userId = source.userId;
    logger.info(`用戶取消關注: ${userId}`);
    
    // 可以在這裡記錄統計資訊或清理相關資料
  }
}

export const webhookController = new WebhookController();
```

### Phase 3: Docker 容器化配置

#### 3.1 Dockerfile
```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S lineservice -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=lineservice:nodejs /app/dist ./dist
COPY --from=builder --chown=lineservice:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=lineservice:nodejs /app/package*.json ./

# Create uploads directory
RUN mkdir -p /app/uploads && chown lineservice:nodejs /app/uploads

# Switch to non-root user
USER lineservice

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

#### 3.2 Docker Compose 整合
```yaml
# 更新主專案的 docker-compose.yml
version: '3.8'

services:
  # 原有服務...
  backend:
    # ... 原有配置

  frontend:
    # ... 原有配置

  nginx:
    # ... 原有配置
    # 需要新增 LINE webhook 路由

  # 新增服務
  redis:
    image: redis:7.0.11-alpine
    container_name: memoryark-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - memoryark-network

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
      - LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
      - LINE_CHANNEL_ID=${LINE_CHANNEL_ID}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - MEMORYARK_API_URL=http://backend:8081
      - MEMORYARK_API_KEY=${MEMORYARK_API_KEY}
      - MEMORYARK_UPLOAD_CATEGORY_ID=${MEMORYARK_UPLOAD_CATEGORY_ID}
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - redis
      - backend
    networks:
      - memoryark-network

volumes:
  redis_data:
  # ... 原有 volumes

networks:
  memoryark-network:
    driver: bridge
```

#### 3.3 Nginx 配置更新
```nginx
# nginx/conf.d/default.conf 更新
server {
    listen 80;
    server_name localhost;

    # 原有配置...

    # LINE Webhook 端點
    location /api/line/webhook {
        proxy_pass http://line-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # LINE Webhook 特殊設定
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        
        # 保持 LINE 簽章驗證需要的原始 body
        proxy_buffering off;
        client_max_body_size 2m;
    }

    # LINE 服務健康檢查
    location /api/line/health {
        proxy_pass http://line-service:3000/health;
        proxy_set_header Host $host;
    }

    # 其他原有路由...
}
```

### Phase 4: MemoryArk 後端擴展

#### 4.1 新增 LINE 專用 API 端點
```go
// backend/internal/api/handlers/line_handler.go
package handlers

import (
    "net/http"
    "strconv"
    "time"
    
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    
    "memoryark/internal/models"
    "memoryark/internal/services"
)

type LineHandler struct {
    fileService *services.FileService
    db          *gorm.DB
}

func NewLineHandler(fileService *services.FileService, db *gorm.DB) *LineHandler {
    return &LineHandler{
        fileService: fileService,
        db:          db,
    }
}

// 內部服務中間件
func (h *LineHandler) InternalServiceMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        apiKey := c.GetHeader("X-Internal-Service-Key")
        expectedKey := os.Getenv("MEMORYARK_API_KEY")
        
        if apiKey == "" || apiKey != expectedKey {
            c.JSON(http.StatusUnauthorized, gin.H{
                "success": false,
                "error": gin.H{
                    "code":    "UNAUTHORIZED",
                    "message": "Invalid internal service key",
                },
            })
            c.Abort()
            return
        }
        
        // 設置內部服務標識
        c.Set("internal_service", "line")
        c.Next()
    }
}

// LINE 照片上傳處理
func (h *LineHandler) UploadPhoto(c *gin.Context) {
    // 解析表單資料
    form, err := c.MultipartForm()
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "INVALID_FORM",
                "message": "Invalid multipart form",
            },
        })
        return
    }

    files := form.File["file"]
    if len(files) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "NO_FILE",
                "message": "No file uploaded",
            },
        })
        return
    }

    file := files[0]
    
    // 取得 LINE 特定參數
    lineUserId := c.PostForm("lineUserId")
    lineUserName := c.PostForm("lineUserName")
    lineMessageId := c.PostForm("lineMessageId")
    
    if lineUserId == "" || lineUserName == "" || lineMessageId == "" {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "MISSING_LINE_INFO",
                "message": "Missing LINE user information",
            },
        })
        return
    }

    // 建立或取得 LINE 用戶
    lineUser, err := h.getOrCreateLineUser(lineUserId, lineUserName)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "USER_ERROR",
                "message": "Failed to process LINE user",
            },
        })
        return
    }

    // 準備檔案上傳參數
    uploadParams := services.FileUploadParams{
        File:         file,
        UploadedBy:   lineUser.ID,
        OriginalName: c.PostForm("originalName"),
        VirtualPath:  c.PostForm("virtualPath"),
        CategoryID:   parseUintParam(c.PostForm("categoryId")),
        Description:  c.PostForm("description"),
        Tags:         c.PostForm("tags"),
        ContentType:  c.PostForm("contentType"),
        
        // LINE 特定欄位
        LineUserId:   lineUserId,
        LineMessageId: lineMessageId,
    }

    // 上傳檔案
    uploadedFile, err := h.fileService.UploadFile(uploadParams)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "UPLOAD_FAILED",
                "message": err.Error(),
            },
        })
        return
    }

    // 記錄活動日誌
    h.logActivity(lineUser.ID, "upload", "file", &uploadedFile.ID, 
        fmt.Sprintf("Via LINE: %s", lineMessageId))

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "id":          uploadedFile.ID,
            "name":        uploadedFile.Name,
            "filePath":    uploadedFile.FilePath,
            "virtualPath": uploadedFile.VirtualPath,
            "size":        uploadedFile.FileSize,
        },
    })
}

// 取得或建立 LINE 用戶
func (h *LineHandler) getOrCreateLineUser(lineUserId, lineUserName string) (*models.User, error) {
    var user models.User
    
    // 先查找是否已存在（使用 email 作為唯一識別）
    lineEmail := fmt.Sprintf("line_%s@line.local", lineUserId)
    
    err := h.db.Where("email = ?", lineEmail).First(&user).Error
    if err == nil {
        // 更新用戶名稱（如果有變更）
        if user.Name != lineUserName {
            user.Name = lineUserName
            user.LastLoginAt = &time.Time{}
            *user.LastLoginAt = time.Now()
            h.db.Save(&user)
        }
        return &user, nil
    }
    
    if err != gorm.ErrRecordNotFound {
        return nil, err
    }
    
    // 建立新用戶
    now := time.Now()
    user = models.User{
        Email:       lineEmail,
        Name:        lineUserName,
        Role:        "user",
        Status:      "approved", // LINE 用戶自動審核通過
        LastLoginAt: &now,
        CreatedAt:   now,
        UpdatedAt:   now,
    }
    
    if err := h.db.Create(&user).Error; err != nil {
        return nil, err
    }
    
    return &user, nil
}

// 記錄活動日誌
func (h *LineHandler) logActivity(userID uint, action, resourceType string, resourceID *uint, details string) {
    log := models.ActivityLog{
        UserID:       userID,
        Action:       action,
        ResourceType: resourceType,
        ResourceID:   resourceID,
        Details:      details,
        CreatedAt:    time.Now(),
    }
    h.db.Create(&log)
}

// 輔助函數
func parseUintParam(param string) *uint {
    if param == "" {
        return nil
    }
    val, err := strconv.ParseUint(param, 10, 32)
    if err != nil {
        return nil
    }
    result := uint(val)
    return &result
}
```

#### 4.2 路由註冊
```go
// backend/internal/api/router.go 更新
func SetupRouter(cfg *config.Config, db *gorm.DB) *gin.Engine {
    // ... 原有代碼

    // LINE 服務專用路由
    lineHandler := handlers.NewLineHandler(fileService, db)
    internal := api.Group("/internal")
    internal.Use(lineHandler.InternalServiceMiddleware())
    {
        line := internal.Group("/line")
        {
            line.POST("/upload-photo", lineHandler.UploadPhoto)
            line.GET("/categories", lineHandler.GetCategories)
            line.GET("/health", lineHandler.HealthCheck)
        }
    }

    return r
}
```

#### 4.3 擴展 File 模型
```go
// backend/internal/models/models.go 更新 File 結構
type File struct {
    // ... 原有欄位
    
    // 新增 LINE 相關欄位
    LineUserId    string `json:"lineUserId,omitempty" gorm:"size:100;index"`
    LineMessageId string `json:"lineMessageId,omitempty" gorm:"size:100;index"`
    
    // ... 其他原有欄位
}
```

### Phase 5: 部署與監控

#### 5.1 生產環境部署腳本
```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 開始部署 LINE 照片服務..."

# 檢查環境變數
if [ -z "$LINE_CHANNEL_ACCESS_TOKEN" ]; then
    echo "❌ 缺少 LINE_CHANNEL_ACCESS_TOKEN"
    exit 1
fi

if [ -z "$LINE_CHANNEL_SECRET" ]; then
    echo "❌ 缺少 LINE_CHANNEL_SECRET"
    exit 1
fi

# 備份現有資料
echo "📦 備份現有資料..."
sudo cp -r ./data ./data.backup.$(date +%Y%m%d_%H%M%S)

# 拉取最新代碼
echo "📥 拉取最新代碼..."
git pull origin main

# 建構 LINE 服務
echo "🔨 建構 LINE 服務..."
cd line-service
npm ci --production
npm run build
cd ..

# 停止現有容器
echo "⏹️ 停止現有容器..."
podman-compose down

# 啟動更新後的服務
echo "▶️ 啟動服務..."
podman-compose up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 30

# 健康檢查
echo "🏥 執行健康檢查..."
if curl -f http://localhost:7001/api/line/health; then
    echo "✅ LINE 服務運行正常"
else
    echo "❌ LINE 服務健康檢查失敗"
    podman-compose logs line-service
    exit 1
fi

if curl -f http://localhost:7001/api/health; then
    echo "✅ 主服務運行正常"
else
    echo "❌ 主服務健康檢查失敗"
    exit 1
fi

echo "🎉 部署完成！"
echo "📊 可以查看日誌："
echo "  podman-compose logs -f line-service"
echo "  podman-compose logs -f backend"
```

#### 5.2 監控和日誌配置
```yaml
# monitoring/docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: memoryark-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - memoryark-network

  grafana:
    image: grafana/grafana:latest
    container_name: memoryark-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    networks:
      - memoryark-network

volumes:
  prometheus_data:
  grafana_data:

networks:
  memoryark-network:
    external: true
```

#### 5.3 Prometheus 配置
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'line-service'
    static_configs:
      - targets: ['line-service:3000']
    metrics_path: '/metrics'
    
  - job_name: 'memoryark-backend'
    static_configs:
      - targets: ['backend:8081']
    metrics_path: '/metrics'
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

### Phase 6: 測試與驗證

#### 6.1 單元測試
```typescript
// tests/services/lineService.test.ts
import { LineService } from '../../src/services/lineService';
import { config } from '../../src/config';

describe('LineService', () => {
  let lineService: LineService;

  beforeEach(() => {
    lineService = new LineService();
  });

  describe('validateImageMessage', () => {
    it('should validate image message correctly', () => {
      const mockEvent = {
        type: 'message',
        message: {
          type: 'image',
          id: 'test-message-id'
        }
      };

      const result = lineService.validateImageMessage(mockEvent as any);
      expect(result).toBe(true);
    });

    it('should reject non-image message', () => {
      const mockEvent = {
        type: 'message',
        message: {
          type: 'text',
          text: 'hello'
        }
      };

      const result = lineService.validateImageMessage(mockEvent as any);
      expect(result).toBe(false);
    });
  });

  describe('generateConfirmationMessage', () => {
    it('should generate success message', () => {
      const message = lineService.generateConfirmationMessage('test.jpg', true);
      
      expect(message.type).toBe('text');
      expect(message.text).toContain('成功上傳');
      expect(message.text).toContain('test.jpg');
    });

    it('should generate failure message', () => {
      const message = lineService.generateConfirmationMessage('test.jpg', false);
      
      expect(message.type).toBe('text');
      expect(message.text).toContain('上傳失敗');
      expect(message.text).toContain('test.jpg');
    });
  });
});
```

#### 6.2 整合測試
```typescript
// tests/integration/webhook.test.ts
import request from 'supertest';
import app from '../../src/index';
import { photoQueue } from '../../src/queues/photoQueue';

describe('Webhook Integration', () => {
  afterEach(async () => {
    await photoQueue.clean(0, 'completed');
    await photoQueue.clean(0, 'failed');
  });

  it('should handle image message webhook', async () => {
    const webhookPayload = {
      events: [{
        type: 'message',
        message: {
          type: 'image',
          id: 'test-message-id'
        },
        source: {
          type: 'user',
          userId: 'test-user-id'
        },
        replyToken: 'test-reply-token',
        timestamp: Date.now()
      }]
    };

    const response = await request(app)
      .post('/webhook')
      .send(webhookPayload)
      .expect(200);

    // 驗證任務已加入隊列
    const waiting = await photoQueue.getWaiting();
    expect(waiting.length).toBe(1);
  });
});
```

#### 6.3 負載測試
```bash
#!/bin/bash
# load-test.sh

echo "🧪 執行負載測試..."

# 安裝 artillery
npm install -g artillery

# 建立測試腳本
cat > load-test.yml << EOF
config:
  target: 'http://localhost:7001'
  phases:
    - duration: 60
      arrivalRate: 5
  
scenarios:
  - name: "Health Check"
    requests:
      - get:
          url: "/api/line/health"
          
  - name: "Webhook Simulation"
    requests:
      - post:
          url: "/api/line/webhook"
          headers:
            X-Line-Signature: "test-signature"
          json:
            events: []
EOF

# 執行測試
artillery run load-test.yml

echo "✅ 負載測試完成"
```

## 📊 專案管理與時程規劃

### 開發時程表
| 階段 | 任務 | 預估時間 | 負責人 |
|------|------|---------|--------|
| Week 1 | 環境建置與基礎配置 | 3-4 天 | 後端開發者 |
| Week 2 | LINE Service 核心開發 | 5-6 天 | 全端開發者 |
| Week 3 | MemoryArk 整合與測試 | 4-5 天 | 後端開發者 |
| Week 4 | 部署配置與優化 | 3-4 天 | DevOps |
| Week 5 | 測試與文檔 | 2-3 天 | QA + 技術文檔 |

### 里程碑檢查點
- ✅ **M1**: LINE Webhook 基本接收 (Week 1 結束)
- ✅ **M2**: 照片下載與處理 (Week 2 結束)  
- ✅ **M3**: MemoryArk 上傳整合 (Week 3 結束)
- ✅ **M4**: 生產環境部署 (Week 4 結束)
- ✅ **M5**: 使用者驗收測試 (Week 5 結束)

## 🛡️ 安全性考量

### 資料保護
- LINE 使用者資料最小化收集
- 照片傳輸過程加密
- 敏感配置使用環境變數
- 定期清理暫存檔案

### 存取控制
- 內部 API 使用專用認證金鑰
- LINE Webhook 簽章驗證
- 容器網路隔離
- 非 root 用戶運行容器

### 監控與審計
- 完整的操作日誌記錄
- 異常行為監控告警
- 定期安全性檢查
- 資料備份與災難復原

## 📈 效能優化建議

### 系統效能
- Redis 任務隊列避免阻塞
- 並發處理數量控制
- 圖片壓縮減少儲存空間
- CDN 加速靜態資源

### 成本控制
- LINE API 呼叫次數監控
- 檔案儲存空間優化
- 容器資源使用監控
- 自動化運維減少人力成本

## 🚀 未來擴展規劃

### 功能擴展
- 支援影片檔案上傳
- 批量照片打包下載
- 照片自動分類標籤
- 多語言支援

### 技術擴展
- 支援其他即時通訊平台
- 機器學習影像識別
- 雲端儲存整合
- 微服務架構優化

## 📝 總結

本實作指南提供了完整的 LINE 照片接收功能整合方案，包含：

1. **詳細的技術實作** - 從環境準備到程式碼實現
2. **完整的架構設計** - 容器化微服務架構
3. **生產就緒配置** - Docker、監控、日誌、安全性
4. **測試與部署** - 單元測試、整合測試、負載測試
5. **運維與監控** - 健康檢查、效能監控、錯誤處理

透過這個系統，教會信徒可以方便地透過 LINE 分享照片，系統會自動處理並整合到 MemoryArk2 管理平台中，提升數位資產管理效率。

專案採用現代化的技術棧和最佳實踐，確保系統的穩定性、安全性和可維護性，為教會數位化轉型提供強有力的技術支援。