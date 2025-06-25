// LINE 功能 API 客戶端

import apiClient from './index'
import type {
  LineUploadRecord,
  LineUploadRecordsResponse,
  LineUploadRecordsParams,
  LineUser,
  LineUsersResponse,
  LineUsersParams,
  LineGroup,
  LineGroupsResponse,
  LineGroupsParams,
  LineWebhookLog,
  LineWebhookLogsResponse,
  LineWebhookLogsParams,
  LineSetting,
  LineStatistics,
  LineStatisticsParams,
  UpdateUserStatusRequest,
  UpdateSettingRequest,
  BatchDeleteRequest,
  LineApiResponse
} from '@/types/line'

class LineAPI {
  private baseUrl = '/api/admin/line'

  // 上傳記錄相關 API
  async getUploadRecords(params?: LineUploadRecordsParams): Promise<LineApiResponse<LineUploadRecordsResponse>> {
    const response = await apiClient.get(`${this.baseUrl}/upload-records`, { params })
    return response.data
  }

  async getUploadRecord(id: string): Promise<LineApiResponse<LineUploadRecord>> {
    const response = await apiClient.get(`${this.baseUrl}/upload-records/${id}`)
    return response.data
  }

  async deleteUploadRecord(id: string): Promise<LineApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`${this.baseUrl}/upload-records/${id}`)
    return response.data
  }

  async batchDeleteUploadRecords(ids: string[]): Promise<LineApiResponse<{ message: string; deleted_count: number }>> {
    const response = await apiClient.delete(`${this.baseUrl}/upload-records/batch`, {
      data: { ids } as BatchDeleteRequest
    })
    return response.data
  }

  // 用戶管理相關 API
  async getUsers(params?: LineUsersParams): Promise<LineApiResponse<LineUsersResponse>> {
    const response = await apiClient.get(`${this.baseUrl}/users`, { params })
    return response.data
  }

  async getUser(lineUserId: string): Promise<LineApiResponse<LineUser>> {
    const response = await apiClient.get(`${this.baseUrl}/users/${lineUserId}`)
    return response.data
  }

  async updateUserStatus(lineUserId: string, updates: UpdateUserStatusRequest): Promise<LineApiResponse<{ message: string }>> {
    const response = await apiClient.put(`${this.baseUrl}/users/${lineUserId}/status`, updates)
    return response.data
  }

  // 群組管理相關 API
  async getGroups(params?: LineGroupsParams): Promise<LineApiResponse<LineGroupsResponse>> {
    const response = await apiClient.get(`${this.baseUrl}/groups`, { params })
    return response.data
  }

  async getGroup(lineGroupId: string): Promise<LineApiResponse<LineGroup>> {
    const response = await apiClient.get(`${this.baseUrl}/groups/${lineGroupId}`)
    return response.data
  }

  // Webhook 日誌相關 API
  async getWebhookLogs(params?: LineWebhookLogsParams): Promise<LineApiResponse<LineWebhookLogsResponse>> {
    const response = await apiClient.get(`${this.baseUrl}/webhook-logs`, { params })
    return response.data
  }

  // 設定管理相關 API
  async getSettings(): Promise<LineApiResponse<LineSetting[]>> {
    const response = await apiClient.get(`${this.baseUrl}/settings`)
    return response.data
  }

  async updateSetting(settingKey: string, updates: UpdateSettingRequest): Promise<LineApiResponse<{ message: string }>> {
    const response = await apiClient.put(`${this.baseUrl}/settings/${settingKey}`, updates)
    return response.data
  }

  // 統計資料相關 API
  async getStatistics(params?: LineStatisticsParams): Promise<LineApiResponse<LineStatistics>> {
    const response = await apiClient.get(`${this.baseUrl}/statistics`, { params })
    return response.data
  }

  // 檔案下載
  async downloadFile(fileId: number): Promise<Blob> {
    const response = await apiClient.get(`/api/files/${fileId}/download`, {
      responseType: 'blob'
    })
    return response.data
  }

  // 檔案預覽
  async previewFile(fileId: number): Promise<Blob> {
    const response = await apiClient.get(`/api/files/${fileId}/preview`, {
      responseType: 'blob'
    })
    return response.data
  }

  // 批量操作
  async batchUpdateUploadStatus(ids: string[], status: string): Promise<LineApiResponse<{ message: string; updated_count: number }>> {
    const response = await apiClient.put(`${this.baseUrl}/upload-records/batch-status`, {
      ids,
      status
    })
    return response.data
  }

  async batchBlockUsers(lineUserIds: string[]): Promise<LineApiResponse<{ message: string; updated_count: number }>> {
    const response = await apiClient.put(`${this.baseUrl}/users/batch-block`, {
      line_user_ids: lineUserIds,
      is_blocked: true
    })
    return response.data
  }

  async batchUnblockUsers(lineUserIds: string[]): Promise<LineApiResponse<{ message: string; updated_count: number }>> {
    const response = await apiClient.put(`${this.baseUrl}/users/batch-block`, {
      line_user_ids: lineUserIds,
      is_blocked: false
    })
    return response.data
  }

  // 匯出功能
  async exportUploadRecords(params?: LineUploadRecordsParams): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/upload-records/export`, {
      params,
      responseType: 'blob'
    })
    return response.data
  }

  async exportUsers(params?: LineUsersParams): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/users/export`, {
      params,
      responseType: 'blob'
    })
    return response.data
  }

  async exportStatistics(params?: LineStatisticsParams): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/statistics/export`, {
      params,
      responseType: 'blob'
    })
    return response.data
  }

  // 實用工具方法
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
    return new Date(dateString).toLocaleString('zh-TW', { ...defaultOptions, ...options })
  }

  formatRelativeTime(dateString: string): string {
    const now = new Date()
    const date = new Date(dateString)
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) return '剛剛'
    if (minutes < 60) return `${minutes} 分鐘前`
    if (hours < 24) return `${hours} 小時前`
    if (days < 7) return `${days} 天前`
    
    return this.formatDate(dateString, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      completed: '#48bb78',
      failed: '#f56565',
      pending: '#ed8936',
      downloading: '#4299e1',
      processing: '#9f7aea',
      blocked: '#e53e3e',
      active: '#38a169'
    }
    return colors[status] || '#718096'
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      completed: 'fas fa-check-circle',
      failed: 'fas fa-exclamation-circle',
      pending: 'fas fa-clock',
      downloading: 'fas fa-spinner fa-spin',
      processing: 'fas fa-cog fa-spin',
      blocked: 'fas fa-ban',
      active: 'fas fa-check-circle'
    }
    return icons[status] || 'fas fa-question-circle'
  }

  getFileIcon(messageType: string, mimeType?: string): string {
    if (messageType === 'image' || mimeType?.startsWith('image/')) {
      return 'fas fa-image'
    }
    if (messageType === 'video' || mimeType?.startsWith('video/')) {
      return 'fas fa-video'
    }
    if (mimeType?.startsWith('audio/')) {
      return 'fas fa-music'
    }
    if (mimeType?.includes('pdf')) {
      return 'fas fa-file-pdf'
    }
    if (mimeType?.includes('word') || mimeType?.includes('document')) {
      return 'fas fa-file-word'
    }
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) {
      return 'fas fa-file-excel'
    }
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) {
      return 'fas fa-file-powerpoint'
    }
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('tar')) {
      return 'fas fa-file-archive'
    }
    return 'fas fa-file'
  }

  isImageFile(filename: string, mimeType?: string): boolean {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i
    return imageExtensions.test(filename) || (mimeType?.startsWith('image/') ?? false)
  }

  isVideoFile(filename: string, mimeType?: string): boolean {
    const videoExtensions = /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i
    return videoExtensions.test(filename) || (mimeType?.startsWith('video/') ?? false)
  }

  // 驗證方法
  validateLineUserId(lineUserId: string): boolean {
    return /^U[a-f0-9]{32}$/.test(lineUserId)
  }

  validateLineGroupId(lineGroupId: string): boolean {
    return /^[CR][a-f0-9]{32}$/.test(lineGroupId)
  }

  validateLineMessageId(messageId: string): boolean {
    return /^[0-9]+$/.test(messageId)
  }

  // 快取相關
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  private getCacheKey(method: string, params?: any): string {
    return `${method}_${JSON.stringify(params || {})}`
  }

  private setCache(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  private getCache(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  // 帶快取的 API 方法
  async getCachedStatistics(params?: LineStatisticsParams, ttl?: number): Promise<LineApiResponse<LineStatistics>> {
    const cacheKey = this.getCacheKey('statistics', params)
    const cached = this.getCache(cacheKey)
    
    if (cached) {
      return cached
    }
    
    const result = await this.getStatistics(params)
    this.setCache(cacheKey, result, ttl)
    return result
  }

  async getCachedSettings(ttl?: number): Promise<LineApiResponse<LineSetting[]>> {
    const cacheKey = this.getCacheKey('settings')
    const cached = this.getCache(cacheKey)
    
    if (cached) {
      return cached
    }
    
    const result = await this.getSettings()
    this.setCache(cacheKey, result, ttl)
    return result
  }

  // 清除快取
  clearCache(): void {
    this.cache.clear()
  }

  clearCacheByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

// 建立單例實例
export const lineApi = new LineAPI()
export default lineApi