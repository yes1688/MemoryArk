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
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewComment?: string
  reviewedBy?: number
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}
