<template>
  <div class="line-uploads-panel">
    <!-- 篩選和操作區 -->
    <div class="panel-header">
      <div class="header-title">
        <h2>上傳記錄管理</h2>
        <p>管理 LINE 群組和個人聊天中上傳的照片記錄</p>
      </div>
      
      <div class="header-actions">
        <button @click="refreshData" :disabled="loading" class="btn btn-secondary">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
          重新整理
        </button>
        
        <button 
          v-if="selectedRecords.length > 0" 
          @click="showBatchDeleteConfirm = true"
          class="btn btn-danger"
        >
          <i class="fas fa-trash"></i>
          批量刪除 ({{ selectedRecords.length }})
        </button>
      </div>
    </div>

    <!-- 篩選器 -->
    <div class="filters-section">
      <div class="filters-grid">
        <div class="filter-group">
          <label>用戶搜尋</label>
          <input 
            v-model="filters.lineUserName" 
            type="text" 
            placeholder="搜尋用戶名稱..."
            class="filter-input"
          >
        </div>
        
        <div class="filter-group">
          <label>群組篩選</label>
          <select v-model="filters.lineGroupId" class="filter-select">
            <option value="">所有群組</option>
            <option v-for="group in availableGroups" :key="group.id" :value="group.line_group_id">
              {{ group.group_name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>檔案類型</label>
          <select v-model="filters.messageType" class="filter-select">
            <option value="">所有類型</option>
            <option value="image">圖片</option>
            <option value="video">影片</option>
            <option value="file">其他檔案</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>下載狀態</label>
          <select v-model="filters.downloadStatus" class="filter-select">
            <option value="">所有狀態</option>
            <option value="completed">下載完成</option>
            <option value="failed">下載失敗</option>
            <option value="pending">等待下載</option>
            <option value="downloading">下載中</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>日期範圍</label>
          <div class="date-range">
            <input v-model="filters.startDate" type="date" class="filter-input">
            <span>至</span>
            <input v-model="filters.endDate" type="date" class="filter-input">
          </div>
        </div>
        
        <div class="filter-actions">
          <button @click="applyFilters" class="btn btn-primary">
            <i class="fas fa-search"></i>
            篩選
          </button>
          <button @click="clearFilters" class="btn btn-secondary">
            <i class="fas fa-times"></i>
            清除
          </button>
        </div>
      </div>
    </div>

    <!-- 記錄列表 -->
    <div class="records-section">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>載入中...</p>
      </div>
      
      <div v-else-if="filteredUploads.length === 0" class="empty-state">
        <i class="fas fa-inbox fa-3x"></i>
        <h3>沒有上傳記錄</h3>
        <p>目前沒有符合條件的上傳記錄</p>
      </div>
      
      <div v-else class="records-table">
        <!-- 表格標題 -->
        <div class="table-header">
          <div class="header-cell checkbox-cell">
            <input 
              type="checkbox" 
              :checked="allSelected" 
              @change="toggleSelectAll"
              class="record-checkbox"
            >
          </div>
          <div class="header-cell">檔案預覽</div>
          <div class="header-cell">用戶資訊</div>
          <div class="header-cell">群組資訊</div>
          <div class="header-cell">檔案資訊</div>
          <div class="header-cell">狀態</div>
          <div class="header-cell">上傳時間</div>
          <div class="header-cell">操作</div>
        </div>
        
        <!-- 記錄項目 -->
        <div 
          v-for="upload in paginatedUploads" 
          :key="upload.id"
          class="table-row"
          :class="{ selected: selectedRecords.includes(upload.id) }"
        >
          <!-- 選擇框 -->
          <div class="table-cell checkbox-cell">
            <input 
              type="checkbox" 
              :checked="selectedRecords.includes(upload.id)"
              @change="toggleSelectRecord(upload.id)"
              class="record-checkbox"
            >
          </div>
          
          <!-- 檔案預覽 -->
          <div class="table-cell">
            <div class="file-preview">
              <img 
                v-if="upload.file && isImageFile(upload.file.name)"
                :src="getFileUrl(upload.file.file_path)"
                :alt="upload.file.original_name"
                class="preview-image"
                @error="handleImageError"
              >
              <div v-else class="file-icon">
                <i :class="getFileIcon(upload.message_type)"></i>
              </div>
            </div>
          </div>
          
          <!-- 用戶資訊 -->
          <div class="table-cell">
            <div class="user-info">
              <div class="user-name">{{ upload.line_user_name }}</div>
              <div class="user-id">{{ upload.line_user_id }}</div>
            </div>
          </div>
          
          <!-- 群組資訊 -->
          <div class="table-cell">
            <div v-if="upload.line_group_id" class="group-info">
              <div class="group-name">{{ upload.line_group_name }}</div>
              <div class="group-id">{{ upload.line_group_id }}</div>
            </div>
            <div v-else class="private-chat">
              <i class="fas fa-user"></i>
              個人聊天
            </div>
          </div>
          
          <!-- 檔案資訊 -->
          <div class="table-cell">
            <div v-if="upload.file" class="file-info">
              <div class="file-name">{{ upload.file.original_name }}</div>
              <div class="file-size">{{ formatFileSize(upload.file.size) }}</div>
              <div class="file-type">{{ upload.message_type }}</div>
            </div>
          </div>
          
          <!-- 狀態 -->
          <div class="table-cell">
            <span class="status-badge" :class="getStatusClass(upload.download_status)">
              <i :class="getStatusIcon(upload.download_status)"></i>
              {{ getStatusText(upload.download_status) }}
            </span>
            <div v-if="upload.error_message" class="error-message">
              {{ upload.error_message }}
            </div>
          </div>
          
          <!-- 上傳時間 -->
          <div class="table-cell">
            <div class="timestamp">
              <div class="date">{{ formatDate(upload.created_at) }}</div>
              <div class="time">{{ formatTime(upload.created_at) }}</div>
            </div>
          </div>
          
          <!-- 操作 -->
          <div class="table-cell">
            <div class="action-buttons">
              <button 
                v-if="upload.file"
                @click="downloadFile(upload.file)"
                class="btn btn-sm btn-primary"
                title="下載檔案"
              >
                <i class="fas fa-download"></i>
              </button>
              
              <button 
                @click="showUploadDetails(upload)"
                class="btn btn-sm btn-secondary"
                title="查看詳細"
              >
                <i class="fas fa-eye"></i>
              </button>
              
              <button 
                @click="confirmDelete(upload)"
                class="btn btn-sm btn-danger"
                title="刪除記錄"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 分頁 -->
      <div v-if="filteredUploads.length > 0" class="pagination">
        <div class="pagination-info">
          顯示 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredUploads.length) }} 
          共 {{ filteredUploads.length }} 筆記錄
        </div>
        
        <div class="pagination-controls">
          <button 
            @click="currentPage--" 
            :disabled="currentPage === 1"
            class="btn btn-secondary"
          >
            <i class="fas fa-chevron-left"></i>
            上一頁
          </button>
          
          <span class="page-info">
            第 {{ currentPage }} 頁，共 {{ totalPages }} 頁
          </span>
          
          <button 
            @click="currentPage++" 
            :disabled="currentPage === totalPages"
            class="btn btn-secondary"
          >
            下一頁
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 批量刪除確認對話框 -->
    <div v-if="showBatchDeleteConfirm" class="modal-overlay" @click="showBatchDeleteConfirm = false">
      <div class="modal-content" @click.stop>
        <h3>確認批量刪除</h3>
        <p>您確定要刪除選中的 {{ selectedRecords.length }} 筆記錄嗎？</p>
        <p class="warning-text">此操作無法復原！</p>
        
        <div class="modal-actions">
          <button @click="showBatchDeleteConfirm = false" class="btn btn-secondary">
            取消
          </button>
          <button @click="performBatchDelete" class="btn btn-danger">
            確認刪除
          </button>
        </div>
      </div>
    </div>

    <!-- 刪除確認對話框 -->
    <div v-if="deleteCandidate" class="modal-overlay" @click="deleteCandidate = null">
      <div class="modal-content" @click.stop>
        <h3>確認刪除</h3>
        <p>您確定要刪除此上傳記錄嗎？</p>
        <div class="delete-preview">
          <strong>檔案：</strong>{{ deleteCandidate.file?.original_name }}<br>
          <strong>上傳者：</strong>{{ deleteCandidate.line_user_name }}
        </div>
        
        <div class="modal-actions">
          <button @click="deleteCandidate = null" class="btn btn-secondary">
            取消
          </button>
          <button @click="performDelete" class="btn btn-danger">
            確認刪除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { LineUploadRecord, LineGroup } from '@/types/line'

// Props
interface Props {
  uploads: LineUploadRecord[]
  loading: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  refresh: []
  delete: [id: string]
  'batch-delete': [ids: string[]]
}>()

// 響應式狀態
const filters = ref({
  lineUserName: '',
  lineGroupId: '',
  messageType: '',
  downloadStatus: '',
  startDate: '',
  endDate: ''
})

const selectedRecords = ref<string[]>([])
const currentPage = ref(1)
const pageSize = ref(20)
const showBatchDeleteConfirm = ref(false)
const deleteCandidate = ref<LineUploadRecord | null>(null)
const availableGroups = ref<LineGroup[]>([])

// 計算屬性
const filteredUploads = computed(() => {
  let filtered = [...props.uploads]
  
  if (filters.value.lineUserName) {
    filtered = filtered.filter(upload => 
      upload.line_user_name.toLowerCase().includes(filters.value.lineUserName.toLowerCase())
    )
  }
  
  if (filters.value.lineGroupId) {
    filtered = filtered.filter(upload => upload.line_group_id === filters.value.lineGroupId)
  }
  
  if (filters.value.messageType) {
    filtered = filtered.filter(upload => upload.message_type === filters.value.messageType)
  }
  
  if (filters.value.downloadStatus) {
    filtered = filtered.filter(upload => upload.download_status === filters.value.downloadStatus)
  }
  
  if (filters.value.startDate) {
    filtered = filtered.filter(upload => 
      new Date(upload.created_at) >= new Date(filters.value.startDate)
    )
  }
  
  if (filters.value.endDate) {
    filtered = filtered.filter(upload => 
      new Date(upload.created_at) <= new Date(filters.value.endDate + 'T23:59:59')
    )
  }
  
  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const totalPages = computed(() => Math.ceil(filteredUploads.value.length / pageSize.value))

const paginatedUploads = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredUploads.value.slice(start, end)
})

const allSelected = computed(() => {
  return paginatedUploads.value.length > 0 && 
         paginatedUploads.value.every(upload => selectedRecords.value.includes(upload.id))
})

// 方法
const refreshData = () => {
  emit('refresh')
}

const applyFilters = () => {
  currentPage.value = 1
}

const clearFilters = () => {
  filters.value = {
    lineUserName: '',
    lineGroupId: '',
    messageType: '',
    downloadStatus: '',
    startDate: '',
    endDate: ''
  }
  currentPage.value = 1
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedRecords.value = selectedRecords.value.filter(id => 
      !paginatedUploads.value.some(upload => upload.id === id)
    )
  } else {
    const currentPageIds = paginatedUploads.value.map(upload => upload.id)
    selectedRecords.value = [...new Set([...selectedRecords.value, ...currentPageIds])]
  }
}

const toggleSelectRecord = (id: string) => {
  const index = selectedRecords.value.indexOf(id)
  if (index > -1) {
    selectedRecords.value.splice(index, 1)
  } else {
    selectedRecords.value.push(id)
  }
}

const confirmDelete = (upload: LineUploadRecord) => {
  deleteCandidate.value = upload
}

const performDelete = () => {
  if (deleteCandidate.value) {
    emit('delete', deleteCandidate.value.id)
    deleteCandidate.value = null
  }
}

const performBatchDelete = () => {
  emit('batch-delete', selectedRecords.value)
  selectedRecords.value = []
  showBatchDeleteConfirm.value = false
}

const isImageFile = (filename: string) => {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp)$/i
  return imageExtensions.test(filename)
}

const getFileUrl = (filePath: string) => {
  return `/uploads/files/${filePath}`
}

const getFileIcon = (messageType: string) => {
  switch (messageType) {
    case 'image': return 'fas fa-image'
    case 'video': return 'fas fa-video'
    case 'file': return 'fas fa-file'
    default: return 'fas fa-file'
  }
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'completed': return 'status-success'
    case 'failed': return 'status-error'
    case 'pending': return 'status-warning'
    case 'downloading': return 'status-info'
    default: return 'status-default'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return 'fas fa-check-circle'
    case 'failed': return 'fas fa-exclamation-circle'
    case 'pending': return 'fas fa-clock'
    case 'downloading': return 'fas fa-spinner fa-spin'
    default: return 'fas fa-question-circle'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return '下載完成'
    case 'failed': return '下載失敗'
    case 'pending': return '等待下載'
    case 'downloading': return '下載中'
    default: return '未知狀態'
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW')
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('zh-TW', { hour12: false })
}

const downloadFile = (file: any) => {
  const url = getFileUrl(file.file_path)
  const link = document.createElement('a')
  link.href = url
  link.download = file.original_name
  link.click()
}

const showUploadDetails = (upload: LineUploadRecord) => {
  // TODO: 實作詳細資訊對話框
  console.log('顯示上傳詳細資訊:', upload)
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

// 監聽器
watch(() => props.uploads, () => {
  // 提取可用的群組列表
  const groups = new Map()
  props.uploads.forEach(upload => {
    if (upload.line_group_id && upload.line_group_name) {
      groups.set(upload.line_group_id, {
        id: upload.line_group_id,
        line_group_id: upload.line_group_id,
        group_name: upload.line_group_name
      })
    }
  })
  availableGroups.value = Array.from(groups.values())
})
</script>

<style scoped>
.line-uploads-panel {
  padding: 1.5rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-title h2 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1a365d;
  margin-bottom: 0.5rem;
}

.header-title p {
  color: #718096;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.filters-section {
  background: #f7fafc;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 600;
  color: #4a5568;
  font-size: 0.9rem;
}

.filter-input,
.filter-select {
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-range span {
  color: #718096;
  font-size: 0.9rem;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
}

.records-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #718096;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state i {
  color: #cbd5e0;
  margin-bottom: 1rem;
}

.records-table {
  display: flex;
  flex-direction: column;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 50px 120px 1fr 1fr 1fr 120px 150px 120px;
  gap: 1rem;
  padding: 1rem;
  align-items: center;
}

.table-header {
  background: #f7fafc;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  color: #4a5568;
  font-size: 0.9rem;
}

.table-row {
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background: #f7fafc;
}

.table-row.selected {
  background: #ebf8ff;
  border-color: #90cdf4;
}

.checkbox-cell {
  display: flex;
  justify-content: center;
}

.record-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.file-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 60px;
  background: #f7fafc;
  border-radius: 8px;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.file-icon {
  color: #cbd5e0;
  font-size: 1.5rem;
}

.user-info,
.group-info,
.file-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-name,
.group-name,
.file-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 0.9rem;
}

.user-id,
.group-id,
.file-size,
.file-type {
  font-size: 0.8rem;
  color: #718096;
}

.private-chat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #718096;
  font-size: 0.9rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-success {
  background: #c6f6d5;
  color: #22543d;
}

.status-error {
  background: #fed7d7;
  color: #742a2a;
}

.status-warning {
  background: #fefcbf;
  color: #744210;
}

.status-info {
  background: #bee3f8;
  color: #2a4365;
}

.status-default {
  background: #e2e8f0;
  color: #4a5568;
}

.error-message {
  font-size: 0.8rem;
  color: #e53e3e;
  margin-top: 0.25rem;
}

.timestamp {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.date {
  font-weight: 600;
  color: #2d3748;
}

.time {
  color: #718096;
  font-size: 0.8rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f7fafc;
  border-top: 1px solid #e2e8f0;
}

.pagination-info {
  font-size: 0.9rem;
  color: #718096;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-info {
  font-size: 0.9rem;
  color: #4a5568;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
}

.modal-content h3 {
  margin-bottom: 1rem;
  color: #1a365d;
}

.warning-text {
  color: #e53e3e;
  font-weight: 600;
  margin-top: 0.5rem;
}

.delete-preview {
  background: #f7fafc;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  font-size: 0.9rem;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

/* 通用按鈕樣式 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  font-size: 0.9rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover:not(:disabled) {
  background: #cbd5e0;
}

.btn-danger {
  background: #e53e3e;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c53030;
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(229, 62, 62, 0.3);
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
}

/* 響應式設計 */
@media (max-width: 1024px) {
  .table-header,
  .table-row {
    grid-template-columns: 50px 100px 1fr 1fr 100px 100px;
    gap: 0.5rem;
  }
  
  .table-cell:nth-child(4) {
    display: none;
  }
}

@media (max-width: 768px) {
  .panel-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .header-actions {
    flex-direction: column;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .table-row {
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }
  
  .table-cell {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f1f5f9;
  }
  
  .table-cell:before {
    content: attr(data-label);
    font-weight: 600;
    color: #4a5568;
    margin-right: 1rem;
  }
  
  .pagination {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>