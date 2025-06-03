import { apiRequest } from './index'
import type { User, UserRegistrationRequest } from '@/types/auth'

export interface UserListResponse {
  users: User[]
  total: number
  page: number
  totalPages: number
}

export interface RegistrationListResponse {
  requests: UserRegistrationRequest[]
  total: number
  page: number
  totalPages: number
}

export interface SystemStats {
  totalUsers: number
  activeUsers: number
  pendingRegistrations: number
  totalFiles: number
  totalSize: number
  storageUsed: string
}

export interface ActivityLog {
  id: number
  userId: number
  userName: string
  action: string
  target: string
  details?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface ActivityLogResponse {
  logs: ActivityLog[]
  total: number
  page: number
  totalPages: number
}

export const adminApi = {
  // 用戶管理
  getUsers: (params?: {
    search?: string
    role?: string
    status?: string
    page?: number
    limit?: number
  }) =>
    apiRequest.get<UserListResponse>('/admin/users', params),

  updateUserRole: (userId: number, role: string) =>
    apiRequest.put(`/admin/users/${userId}/role`, { role }),

  updateUserStatus: (userId: number, status: string) =>
    apiRequest.put(`/admin/users/${userId}/status`, { status }),

  // 註冊申請管理
  getRegistrations: (params?: {
    status?: 'pending' | 'approved' | 'rejected'
    page?: number
    limit?: number
  }) =>
    apiRequest.get<RegistrationListResponse>('/admin/registrations', params),

  approveRegistration: (requestId: number, comment?: string) =>
    apiRequest.put(`/admin/registrations/${requestId}/approve`, { comment }),

  rejectRegistration: (requestId: number, comment?: string) =>
    apiRequest.put(`/admin/registrations/${requestId}/reject`, { comment }),

  // 系統管理
  getSystemStats: () =>
    apiRequest.get<SystemStats>('/admin/stats'),

  getActivityLogs: (params?: {
    userId?: number
    action?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }) =>
    apiRequest.get<ActivityLogResponse>('/admin/logs', params),
}
