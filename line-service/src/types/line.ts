import { EventMessage, WebhookEvent, MessageEvent, PostbackEvent, FollowEvent, UnfollowEvent } from '@line/bot-sdk';

// LINE Bot SDK 擴展類型
export interface LineWebhookBody {
  destination: string;
  events: WebhookEvent[];
}

// 照片訊息處理相關類型
export interface PhotoMessage {
  id: string;
  contentProvider: {
    type: 'line' | 'external';
    originalContentUrl?: string;
    previewImageUrl?: string;
  };
  fileName?: string;
  fileSize?: number;
}

// LINE 使用者資訊
export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

// LINE 群組/聊天室資訊
export interface LineGroupInfo {
  groupId: string;
  groupName: string;
  pictureUrl?: string;
}

export interface LineRoomInfo {
  roomId: string;
}

// 訊息來源類型
export type LineMessageSource = {
  type: 'user';
  userId: string;
} | {
  type: 'group';
  groupId: string;
  userId?: string;
} | {
  type: 'room';
  roomId: string;
  userId?: string;
};

// 照片上傳到 MemoryArk 的資料結構
export interface PhotoUploadData {
  file: Buffer;
  fileName: string;
  mimeType: string;
  description?: string;
  tags?: string[];
  folderPath?: string;  // 新增：指定上傳的資料夾路徑
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: {
    lineUserId: string;
    lineMessageId: string;
    timestamp: string;
    source: LineMessageSource;
    userProfile?: LineUserProfile;
  };
}

// MemoryArk API 回應
export interface MemoryArkUploadResponse {
  success: boolean;
  photoId?: string;
  message: string;
  error?: string;
}

// 事件處理結果
export interface EventProcessResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

// LINE Webhook 事件處理器類型
export type LineEventHandler<T extends WebhookEvent = WebhookEvent> = (
  event: T,
  source: LineMessageSource
) => Promise<EventProcessResult>;

// 支援的 LINE 事件類型別名
export type SupportedLineEvent = MessageEvent | PostbackEvent | FollowEvent | UnfollowEvent;

// 照片處理狀態
export enum PhotoProcessStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// 照片處理任務
export interface PhotoProcessTask {
  id: string;
  messageId: string;
  userId: string;
  status: PhotoProcessStatus;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  memoryArkPhotoId?: string;
}

// LINE Bot 配置
export interface LineBotConfig {
  channelAccessToken: string;
  channelSecret: string;
  channelId: string;
}

// MemoryArk API 配置
export interface MemoryArkConfig {
  apiUrl: string;
  apiToken: string;
  uploadEndpoint?: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}

// 服務配置
export interface ServiceConfig {
  line: LineBotConfig;
  memoryArk: MemoryArkConfig;
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  server: {
    port: number;
    env: 'development' | 'production' | 'test';
  };
}