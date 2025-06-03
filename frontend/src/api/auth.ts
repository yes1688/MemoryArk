import { apiRequest } from './index'
import type { User, RegisterData, AuthStatus } from '@/types/auth'

export const authApi = {
  // 檢查認證狀態
  getAuthStatus: () =>
    apiRequest.get<AuthStatus>('/auth/status'),

  // 獲取當前用戶信息
  getCurrentUser: () =>
    apiRequest.get<User>('/auth/me'),

  // 註冊申請（需要通過 Cloudflare Access 後才能註冊）
  register: (data: RegisterData) =>
    apiRequest.post('/auth/register', data),
}
