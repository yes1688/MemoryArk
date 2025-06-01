import { apiRequest } from './index'
import type { User, LoginCredentials, RegisterData } from '@/types/auth'

export const authApi = {
  // 登入
  login: (credentials: LoginCredentials) =>
    apiRequest.post<{ token: string; user: User }>('/auth/login', credentials),

  // 註冊
  register: (data: RegisterData) =>
    apiRequest.post('/auth/register', data),

  // 獲取當前用戶信息
  me: () =>
    apiRequest.get<User>('/auth/me'),

  // 登出
  logout: () =>
    apiRequest.post('/auth/logout'),
}
