export interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'user'
  status: 'pending' | 'approved' | 'rejected'
  cloudflareId?: string
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  reason?: string
}

export interface RegistrationRequest {
  id: number
  email: string
  name: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewComment?: string
  reviewedBy?: number
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}
