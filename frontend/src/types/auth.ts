export interface User {
  id: number
  email: string
  name: string
  phone?: string
  role: 'admin' | 'user'
  status: 'pending' | 'approved' | 'rejected'
  cloudflareId?: string
  approvedBy?: number
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AuthStatus {
  authenticated: boolean
  user?: User
  needsRegistration?: boolean
  pendingApproval?: boolean
}

export interface RegisterData {
  name: string
  phone?: string
  reason?: string
}

export interface UserRegistrationRequest {
  id: number
  email: string
  name: string
  phone?: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  rejection_history?: string
  processed_by?: number
  processed_at?: string
  created_at: string
  processed_by_user?: {
    id: number
    email: string
    name: string
    role: string
  }
}
