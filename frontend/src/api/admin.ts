import { apiRequest } from './index'
import type { User, RegistrationRequest } from '@/types/auth'

export const adminApi = {
  // 用戶管理
  getAllUsers: (params?: {
    search?: string
    role?: string
    status?: string
    page?: number
    limit?: number
  }) =>
    apiRequest.get<{
      users: User[]
      total: number
      page: number
      totalPages: number
    }>('/admin/users', params),

  getUser: (userId: number) =>
    apiRequest.get<User>(`/admin/users/${userId}`),

  deleteUser: (userId: number) =>
    apiRequest.delete(`/admin/users/${userId}`),

  // 註冊申請管理
  getRegistrationRequests: (params?: {
    status?: 'pending' | 'approved' | 'rejected'
    page?: number
    limit?: number
  }) =>
    apiRequest.get<{
      requests: RegistrationRequest[]
      total: number
      page: number
      totalPages: number
    }>('/admin/registration-requests', params),

  approveRegistration: (requestId: number) =>
    apiRequest.post(`/admin/registration-requests/${requestId}/approve`),

  rejectRegistration: (requestId: number, reason?: string) =>
    apiRequest.post(`/admin/registration-requests/${requestId}/reject`, { reason }),

  // 檔案管理
  getAllFiles: (params?: {
    category?: string
    search?: string
    uploader?: string
    page?: number
    limit?: number
  }) =>
    apiRequest.get('/admin/files', params),

  deleteFileAdmin: (fileId: number, permanent?: boolean) =>
    apiRequest.delete(`/admin/files/${fileId}`, { permanent }),

  // 系統統計
  getSystemStats: () =>
    apiRequest.get('/admin/stats'),

  // 活動日誌
  getActivityLogs: (params?: {
    action?: string
    user?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }) =>
    apiRequest.get('/admin/activity-logs', params),
}
