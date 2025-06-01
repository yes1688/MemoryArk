export interface FileInfo {
  id: number
  filename: string
  originalName: string
  size: number
  mimeType: string
  category: string
  description?: string
  tags?: string
  uploaderId: number
  uploaderName: string
  downloadCount: number
  createdAt: string
  updatedAt: string
  url: string
  thumbnailUrl?: string
}

export interface UploadResult {
  id: number
  filename: string
  originalName: string
  size: number
  url: string
}

export interface FileCategory {
  id: string
  name: string
  icon: string
  allowedTypes: string[]
  maxSize: number
}
