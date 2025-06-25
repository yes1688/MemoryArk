// LINE 功能相關的 TypeScript 類型定義

export interface LineUploadRecord {
  id: string
  file_id: number
  line_user_id: string
  line_user_name: string
  line_message_id: string
  line_group_id?: string
  line_group_name?: string
  message_type: 'image' | 'video' | 'file'
  original_url?: string
  download_status: 'pending' | 'downloading' | 'completed' | 'failed'
  error_message?: string
  retry_count: number
  created_at: string
  updated_at: string
  
  // 關聯資料
  file?: {
    id: number
    name: string
    original_name: string
    file_path: string
    size: number
    mime_type: string
  }
  line_user?: LineUser
}

export interface LineUser {
  id: number
  line_user_id: string
  display_name: string
  picture_url?: string
  status_message?: string
  language?: string
  is_blocked: boolean
  is_active: boolean
  first_interaction_at?: string
  last_interaction_at?: string
  total_uploads: number
  created_at: string
  updated_at: string
  
  // 關聯資料
  upload_records?: LineUploadRecord[]
  group_members?: LineGroupMember[]
}

export interface LineGroup {
  id: number
  line_group_id: string
  group_name: string
  group_type: 'group' | 'room'
  is_active: boolean
  member_count: number
  total_uploads: number
  first_interaction_at?: string
  last_interaction_at?: string
  created_at: string
  updated_at: string
  
  // 關聯資料
  members?: LineGroupMember[]
}

export interface LineGroupMember {
  id: number
  line_group_id: string
  line_user_id: string
  role: 'admin' | 'member'
  join_date?: string
  leave_date?: string
  is_active: boolean
  upload_count: number
  last_upload_at?: string
  created_at: string
  updated_at: string
  
  // 關聯資料
  line_group?: LineGroup
  line_user?: LineUser
}

export interface LineWebhookLog {
  id: string
  webhook_type: string
  line_user_id?: string
  line_group_id?: string
  message_id?: string
  message_type?: string
  event_data: Record<string, any>
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  processing_time?: number // 毫秒
  error_message?: string
  retry_count: number
  created_at: string
  updated_at: string
}

export interface LineSetting {
  id: number
  setting_key: string
  setting_value?: string
  setting_type: 'string' | 'integer' | 'boolean' | 'json'
  description?: string
  is_active: boolean
  created_by?: number
  created_at: string
  updated_at: string
  
  // 關聯資料
  creator?: {
    id: number
    name: string
    email: string
  }
}

export interface LineUploadStat {
  id: number
  stat_date: string
  stat_type: 'daily' | 'weekly' | 'monthly'
  line_user_id?: string
  line_group_id?: string
  upload_count: number
  file_size_total: number
  image_count: number
  video_count: number
  other_count: number
  active_users: number
  created_at: string
  updated_at: string
}

export interface LineStatistics {
  basic_stats: {
    total_uploads: number
    total_users: number
    total_groups: number
    active_users: number
    today_uploads: number
    weekly_uploads: number
    monthly_uploads: number
    failed_downloads: number
    pending_downloads: number
  }
  time_series_stats: LineUploadStat[]
  top_users: LineUser[]
  top_groups: LineGroup[]
}

// API 請求和響應類型
export interface LineUploadRecordsResponse {
  records: LineUploadRecord[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface LineUsersResponse {
  users: LineUser[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface LineGroupsResponse {
  groups: LineGroup[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface LineWebhookLogsResponse {
  logs: LineWebhookLog[]
  total: number
  page: number
  page_size: number
  pages: number
}

// API 請求參數類型
export interface LineUploadRecordsParams {
  page?: number
  page_size?: number
  line_user_id?: string
  line_group_id?: string
  message_type?: string
  download_status?: string
  start_date?: string
  end_date?: string
}

export interface LineUsersParams {
  page?: number
  page_size?: number
  display_name?: string
  is_blocked?: boolean
  is_active?: boolean
}

export interface LineGroupsParams {
  page?: number
  page_size?: number
  group_name?: string
  is_active?: boolean
}

export interface LineWebhookLogsParams {
  page?: number
  page_size?: number
  webhook_type?: string
  processing_status?: string
  line_user_id?: string
}

export interface LineStatisticsParams {
  start_date?: string
  end_date?: string
  stat_type?: 'daily' | 'weekly' | 'monthly'
}

// 更新請求類型
export interface UpdateUserStatusRequest {
  is_blocked?: boolean
  is_active?: boolean
}

export interface UpdateSettingRequest {
  setting_value: string
  description?: string
}

export interface BatchDeleteRequest {
  ids: string[]
}

// 錯誤類型
export interface LineApiError {
  message: string
  code?: string
  details?: Record<string, any>
}

// API 響應包裝類型
export interface LineApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  error?: LineApiError
}

// 組件 Props 類型
export interface LineManagementProps {
  initialTab?: string
}

export interface LineUploadsPanelProps {
  uploads: LineUploadRecord[]
  loading: boolean
}

export interface LineUsersPanelProps {
  users: LineUser[]
  loading: boolean
}

export interface LineGroupsPanelProps {
  groups: LineGroup[]
  loading: boolean
}

export interface LineStatisticsPanelProps {
  statistics: LineStatistics | null
  loading: boolean
}

export interface LineSettingsPanelProps {
  settings: LineSetting[]
  loading: boolean
}

export interface LineLogsPanelProps {
  logs: LineWebhookLog[]
  loading: boolean
}

// 事件類型
export interface LineUploadEvent {
  type: 'upload' | 'delete' | 'update'
  record: LineUploadRecord
  timestamp: string
}

export interface LineUserEvent {
  type: 'status_change' | 'block' | 'unblock'
  user: LineUser
  changes: Record<string, any>
  timestamp: string
}

// 篩選器類型
export interface LineUploadFilters {
  lineUserName: string
  lineGroupId: string
  messageType: string
  downloadStatus: string
  startDate: string
  endDate: string
}

export interface LineUserFilters {
  displayName: string
  isBlocked: boolean | null
  isActive: boolean | null
}

export interface LineGroupFilters {
  groupName: string
  isActive: boolean | null
}

export interface LineLogFilters {
  webhookType: string
  processingStatus: string
  lineUserId: string
}

// 統計圖表資料類型
export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface ChartSeries {
  name: string
  data: ChartDataPoint[]
  color?: string
}

export interface LineChartData {
  series: ChartSeries[]
  categories: string[]
}

// 表格排序類型
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// 分頁配置類型
export interface PaginationConfig {
  page: number
  pageSize: number
  total: number
  showSizeChanger: boolean
  pageSizeOptions: number[]
}

// 操作權限類型
export interface LinePermissions {
  canViewUploads: boolean
  canDeleteUploads: boolean
  canManageUsers: boolean
  canViewGroups: boolean
  canViewLogs: boolean
  canUpdateSettings: boolean
  canViewStatistics: boolean
}