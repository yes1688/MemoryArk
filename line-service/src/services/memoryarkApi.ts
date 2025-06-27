import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { MemoryArkConfig, PhotoUploadData, MemoryArkUploadResponse } from '../types/line';
import { memoryArkLogger, LoggerHelper } from '../utils/logger';

/**
 * MemoryArk API 整合服務
 * 負責與 MemoryArk 系統進行通訊，包括照片上傳、查詢等功能
 */
export class MemoryArkApiService {
  private axiosInstance: AxiosInstance;
  private config: MemoryArkConfig;

  constructor(config: MemoryArkConfig) {
    this.config = config;
    this.axiosInstance = this.createAxiosInstance();
  }

  /**
   * 建立 Axios 實例
   */
  private createAxiosInstance(): AxiosInstance {
    const baseHeaders: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'MemoryArk-LINE-Service/1.0.0',
    };

    // 只有在設定了 API Token 時才加入 Authorization 標頭
    if (this.config.apiToken && this.config.apiToken.trim()) {
      baseHeaders['Authorization'] = `Bearer ${this.config.apiToken}`;
    }

    const instance = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 30000, // 30 秒超時
      headers: baseHeaders,
    });

    // 請求攔截器
    instance.interceptors.request.use(
      (config) => {
        const startTime = Date.now();
        (config as any).metadata = { startTime };
        
        memoryArkLogger.debug('MemoryArk API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: config.headers,
        });
        
        return config;
      },
      (error) => {
        LoggerHelper.logError(error, 'MemoryArk API request error');
        return Promise.reject(error);
      }
    );

    // 回應攔截器
    instance.interceptors.response.use(
      (response) => {
        const duration = Date.now() - ((response.config as any).metadata?.startTime || 0);
        
        LoggerHelper.logMemoryArkApiCall(
          response.config.url || '',
          response.config.method?.toUpperCase() || '',
          response.status,
          duration
        );
        
        return response;
      },
      (error) => {
        const duration = Date.now() - ((error.config as any)?.metadata?.startTime || 0);
        
        LoggerHelper.logMemoryArkApiCall(
          error.config?.url || '',
          error.config?.method?.toUpperCase() || '',
          error.response?.status || 0,
          duration
        );
        
        LoggerHelper.logError(error, 'MemoryArk API response error', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
        });
        
        return Promise.reject(error);
      }
    );

    return instance;
  }

  /**
   * 上傳照片到 MemoryArk
   */
  async uploadPhoto(photoData: PhotoUploadData): Promise<MemoryArkUploadResponse> {
    try {
      const formData = new FormData();
      
      // 添加檔案
      formData.append('file', photoData.file, {
        filename: photoData.fileName,
        contentType: photoData.mimeType,
      });

      // 添加其他資料
      if (photoData.description) {
        formData.append('description', photoData.description);
      }

      if (photoData.tags && photoData.tags.length > 0) {
        formData.append('tags', JSON.stringify(photoData.tags));
      }

      if (photoData.location) {
        formData.append('location', JSON.stringify(photoData.location));
      }

      if (photoData.metadata) {
        formData.append('metadata', JSON.stringify(photoData.metadata));
      }

      // 新增：資料夾路徑支援 (使用後端支援的 relative_path 參數)
      if (photoData.folderPath) {
        formData.append('relative_path', photoData.folderPath);
      }

      // 設定上傳配置
      const uploadHeaders = {
        ...formData.getHeaders(),
      };

      // 只有在設定了 API Token 時才加入 Authorization 標頭
      if (this.config.apiToken && this.config.apiToken.trim()) {
        uploadHeaders['Authorization'] = `Bearer ${this.config.apiToken}`;
      }

      const uploadConfig: AxiosRequestConfig = {
        method: 'POST',
        url: this.config.uploadEndpoint || '/api/believers/photos/upload',
        data: formData,
        headers: uploadHeaders,
        maxContentLength: this.config.maxFileSize || 50 * 1024 * 1024, // 預設 50MB
        maxBodyLength: this.config.maxFileSize || 50 * 1024 * 1024,
      };

      memoryArkLogger.info('Starting photo upload', {
        fileName: photoData.fileName,
        fileSize: photoData.file.length,
        mimeType: photoData.mimeType,
        hasDescription: !!photoData.description,
        tagCount: photoData.tags?.length || 0,
      });

      const response: AxiosResponse = await this.axiosInstance.request(uploadConfig);

      const result: MemoryArkUploadResponse = {
        success: true,
        photoId: response.data.data?.id?.toString() || response.data.photoId || response.data.id,
        message: response.data.message || 'Photo uploaded successfully',
      };

      memoryArkLogger.info('Photo upload successful', {
        photoId: result.photoId,
        fileName: photoData.fileName,
      });

      return result;

    } catch (error: any) {
      const errorResult: MemoryArkUploadResponse = {
        success: false,
        message: 'Failed to upload photo to MemoryArk',
        error: error.message,
      };

      if (error.response) {
        errorResult.error = `HTTP ${error.response.status}: ${error.response.data?.message || error.message}`;
        memoryArkLogger.error('Photo upload failed - HTTP error', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          fileName: photoData.fileName,
        });
      } else if (error.request) {
        errorResult.error = 'No response from MemoryArk API';
        memoryArkLogger.error('Photo upload failed - Network error', {
          error: error.message,
          fileName: photoData.fileName,
        });
      } else {
        memoryArkLogger.error('Photo upload failed - Unknown error', {
          error: error.message,
          fileName: photoData.fileName,
        });
      }

      return errorResult;
    }
  }

  /**
   * 檢查 MemoryArk API 健康狀態
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      // Try multiple possible health check endpoints
      const healthEndpoints = ['/health', '/api/health', '/status'];
      
      for (const endpoint of healthEndpoints) {
        try {
          const response = await this.axiosInstance.get(endpoint, { timeout: 5000 });
          const isHealthy = response.status === 200;
          
          memoryArkLogger.info('MemoryArk API health check', {
            endpoint,
            status: response.status,
            healthy: isHealthy,
            response: response.data,
          });
          
          if (isHealthy) {
            return true;
          }
        } catch (endpointError: any) {
          memoryArkLogger.debug('Health check endpoint failed', {
            endpoint,
            error: endpointError.message,
          });
          // Continue to next endpoint
        }
      }
      
      return false;
    } catch (error: any) {
      memoryArkLogger.error('MemoryArk API health check failed', {
        error: error.message,
        status: error.response?.status,
      });
      return false;
    }
  }

  /**
   * 查詢照片資訊
   */
  async getPhotoInfo(photoId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/api/photos/${photoId}`);
      memoryArkLogger.info('Photo info retrieved', { photoId });
      return response.data;
    } catch (error: any) {
      memoryArkLogger.error('Failed to get photo info', {
        photoId,
        error: error.message,
        status: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * 刪除照片
   */
  async deletePhoto(photoId: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.delete(`/api/photos/${photoId}`);
      const success = response.status === 200 || response.status === 204;
      
      memoryArkLogger.info('Photo deletion attempt', {
        photoId,
        success,
        status: response.status,
      });
      
      return success;
    } catch (error: any) {
      memoryArkLogger.error('Failed to delete photo', {
        photoId,
        error: error.message,
        status: error.response?.status,
      });
      return false;
    }
  }

  /**
   * 驗證檔案類型
   */
  validateFileType(mimeType: string): boolean {
    const allowedTypes = this.config.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
    ];
    
    return allowedTypes.includes(mimeType);
  }

  /**
   * 驗證檔案大小
   */
  validateFileSize(fileSize: number): boolean {
    const maxSize = this.config.maxFileSize || 50 * 1024 * 1024; // 預設 50MB
    return fileSize <= maxSize;
  }

  /**
   * 取得 API 配置資訊
   */
  getConfig(): MemoryArkConfig {
    return { ...this.config };
  }

  /**
   * 更新 API Token
   */
  updateToken(newToken: string): void {
    this.config.apiToken = newToken;
    
    if (newToken && newToken.trim()) {
      this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${newToken}`;
      memoryArkLogger.info('MemoryArk API token updated');
    } else {
      delete this.axiosInstance.defaults.headers['Authorization'];
      memoryArkLogger.info('MemoryArk API token removed - using internal communication');
    }
  }

  /**
   * 保存 LINE 用戶資訊
   */
  async saveLineUser(userProfile: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
    language?: string;
  }): Promise<{ success: boolean; message: string; user?: any; created?: boolean }> {
    try {
      const response = await this.axiosInstance.post('/api/api-access/line/users', {
        lineUserId: userProfile.userId,
        displayName: userProfile.displayName,
        pictureUrl: userProfile.pictureUrl,
        statusMessage: userProfile.statusMessage,
        language: userProfile.language,
      });

      memoryArkLogger.info('LINE user saved successfully', {
        userId: userProfile.userId,
        displayName: userProfile.displayName,
        created: response.data.data?.created,
      });

      return {
        success: true,
        message: response.data.data?.message || 'User saved successfully',
        user: response.data.data?.user,
        created: response.data.data?.created,
      };
    } catch (error: any) {
      memoryArkLogger.error('Failed to save LINE user', {
        userId: userProfile.userId,
        error: error.message,
        status: error.response?.status,
      });

      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 創建上傳記錄
   */
  async createUploadRecord(fileId: string, lineUserID: string, metadata: {
    messageId: string;
    timestamp: string;
    userProfile?: any;
    source?: any;
  }): Promise<{ success: boolean; message: string; record?: any }> {
    try {
      const response = await this.axiosInstance.post('/api/api-access/line/upload-records', {
        fileId: parseInt(fileId, 10),
        lineUserId: lineUserID,
        lineMessageId: metadata.messageId,
        lineGroupId: metadata.source?.type === 'group' ? metadata.source.groupId : undefined,
        messageType: 'image',
        metadata: metadata,
      });

      memoryArkLogger.info('Upload record created successfully', {
        fileId,
        lineUserId: lineUserID,
        messageId: metadata.messageId,
      });

      return {
        success: true,
        message: response.data.data?.message || 'Upload record created successfully',
        record: response.data.data?.record,
      };
    } catch (error: any) {
      memoryArkLogger.error('Failed to create upload record', {
        fileId,
        lineUserId: lineUserID,
        messageId: metadata.messageId,
        error: error.message,
        status: error.response?.status,
      });

      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 測試 API 連線
   */
  async testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      const response = await this.axiosInstance.get('/api/status');
      const responseTime = Date.now() - startTime;
      
      memoryArkLogger.info('MemoryArk API connection test successful', {
        responseTime,
        status: response.status,
      });
      
      return {
        success: true,
        message: 'Connection successful',
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      memoryArkLogger.error('MemoryArk API connection test failed', {
        error: error.message,
        responseTime,
        status: error.response?.status,
      });
      
      return {
        success: false,
        message: error.message,
        responseTime,
      };
    }
  }
}

// 建立預設的 MemoryArk API 服務實例
let memoryArkApiService: MemoryArkApiService | null = null;

/**
 * 初始化 MemoryArk API 服務
 */
export function initializeMemoryArkApi(config: MemoryArkConfig): MemoryArkApiService {
  memoryArkApiService = new MemoryArkApiService(config);
  memoryArkLogger.info('MemoryArk API service initialized', {
    apiUrl: config.apiUrl,
    uploadEndpoint: config.uploadEndpoint,
    maxFileSize: config.maxFileSize,
  });
  return memoryArkApiService;
}

/**
 * 取得 MemoryArk API 服務實例
 */
export function getMemoryArkApi(): MemoryArkApiService {
  if (!memoryArkApiService) {
    throw new Error('MemoryArk API service not initialized. Call initializeMemoryArkApi() first.');
  }
  return memoryArkApiService;
}

export default MemoryArkApiService;