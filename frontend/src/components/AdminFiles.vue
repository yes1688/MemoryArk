<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '@/api/admin'
import type { FileInfo } from '@/types/files'

const files = ref<FileInfo[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedType = ref('all')
const sortBy = ref('uploadDate')
const sortOrder = ref<'asc' | 'desc'>('desc')

const fileTypes = [
  { value: 'all', label: '全部類型' },
  { value: 'image', label: '圖片' },
  { value: 'video', label: '影片' },
  { value: 'audio', label: '音檔' },
  { value: 'document', label: '文件' }
]

const sortOptions = [
  { value: 'name', label: '檔名' },
  { value: 'size', label: '檔案大小' },
  { value: 'uploadDate', label: '上傳時間' },
  { value: 'uploader', label: '上傳者' }
]

const filteredAndSortedFiles = computed(() => {
  // 只顯示實際檔案（排除資料夾和已刪除的檔案）
  let filtered = files.value.filter(f => !f.isDirectory && !f.isDeleted)

  // 搜尋篩選
  if (searchQuery.value) {
    filtered = filtered.filter(file => 
      file.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (file.uploaderName?.toLowerCase().includes(searchQuery.value.toLowerCase()) ?? false)
    )
  }

  // 類型篩選（根據 mimeType 前綴判斷）
  if (selectedType.value !== 'all') {
    filtered = filtered.filter(file => file.mimeType?.startsWith(selectedType.value))
  }

  // 排序
  filtered.sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy.value) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'size':
        aValue = a.size
        bValue = b.size
        break
      case 'uploadDate':
        aValue = new Date(a.createdAt)
        bValue = new Date(b.createdAt)
        break
      case 'uploader':
        aValue = a.uploaderName?.toLowerCase() ?? ''
        bValue = b.uploaderName?.toLowerCase() ?? ''
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })

  return filtered
})

// 計算檔案統計資料
const fileStats = computed(() => {
  const actualFiles = files.value.filter(f => !f.isDirectory && !f.isDeleted)
  const totalSize = actualFiles.reduce((sum, file) => sum + (file.size || 0), 0)
  
  return {
    totalFiles: actualFiles.length,
    totalSize: totalSize,
    imageFiles: actualFiles.filter(f => f.mimeType?.startsWith('image/')).length,
    videoFiles: actualFiles.filter(f => f.mimeType?.startsWith('video/')).length
  }
})

const loadFiles = async () => {
  isLoading.value = true
  try {
    console.log('🔍 正在載入檔案列表...')
    const response = await adminApi.getAllFiles()
    console.log('📋 完整 API 回應:', response)
    console.log('📁 檔案資料:', response.data)
    console.log('📄 檔案數量:', response.data?.files?.length)
    if (response.data?.files?.length && response.data.files.length > 0) {
      console.log('📄 第一個檔案完整資料:', JSON.stringify(response.data.files[0], null, 2))
    }
    // 轉換後端回傳的資料格式到前端期望的格式
    const transformedFiles = (response.data?.files || []).map((file: any) => {
      // 檢查是否為資料夾 - 後端使用駝峰式命名
      const isDir = file.isDirectory === true || 
                    file.isDirectory === 1 || 
                    file.isDirectory === '1' ||
                    file.mimeType === 'directory' ||
                    file.mimeType === 'folder' ||
                    (!file.mimeType && file.size === 0)
      
      console.log(`🗂️ ${file.name}: isDirectory=${file.isDirectory}, mimeType=${file.mimeType}, 判斷為資料夾=${isDir}`)
      
      return {
        id: file.id,
        name: file.name,
        originalName: file.originalName || file.name,
        size: Number(file.size || file.fileSize) || 0,
        mimeType: file.mimeType || '',
        isDirectory: isDir,
        parentId: file.parentId,
        path: file.filePath || file.virtualPath,
        uploaderId: file.uploadedBy,
        uploaderName: file.uploader?.name,
        downloadCount: file.downloadCount || 0,
        isDeleted: file.isDeleted === true || file.isDeleted === 1 || file.isDeleted === '1',
        deletedAt: file.deletedAt,
        deletedBy: file.deletedBy,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl
      }
    })
    files.value = transformedFiles
  } catch (error: any) {
    console.error('❌ 載入檔案列表失敗:', error)
    console.error('❌ 錯誤詳情:', error.response?.data)
    console.error('❌ 狀態碼:', error.response?.status)
  } finally {
    isLoading.value = false
  }
}

const deleteFile = async (fileId: number) => {
  if (!confirm('確定要刪除此檔案嗎？此操作無法復原。')) {
    return
  }

  try {
    await adminApi.deleteFile(fileId)
    await loadFiles() // 重新載入列表
  } catch (error) {
    console.error('刪除檔案失敗:', error)
  }
}

const downloadFile = async (file: FileInfo) => {
  try {
    const response = await adminApi.downloadFile(file.id)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', file.name)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下載檔案失敗:', error)
  }
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (mimeType: string | undefined): string => {
  if (!mimeType) return '📁'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎥'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return '📄'
  return '📎'
}

const toggleSort = (field: string) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
}

// 組件載入時立即輸出調試訊息
console.log('🚀 AdminFiles 組件已載入!')

onMounted(() => {
  console.log('🎯 AdminFiles onMounted 被觸發')
  loadFiles()
})
</script>

<style scoped>
/* 管理員面板樣式 */
.admin-panel {
  background: var(--bg-elevated);
  border-color: var(--border-light);
}

/* 輸入框樣式 */
.admin-input {
  background: var(--bg-primary);
  border: 1px solid var(--border-medium);
  color: var(--text-primary);
  transition: all var(--duration-fast) var(--ease-smooth);
}

.admin-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* 排序按鈕樣式 */
.admin-sort-btn {
  background: var(--bg-primary);
  border: 1px solid var(--border-medium);
  color: var(--text-primary);
  transition: all var(--duration-fast) var(--ease-smooth);
}

.admin-sort-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--color-primary);
}

/* 統計卡片樣式 */
.admin-stat-card {
  background: var(--bg-elevated);
  border-color: var(--border-light);
  transition: all var(--duration-fast) var(--ease-smooth);
}

.admin-stat-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.admin-stat-number {
  color: var(--color-primary);
}

.admin-stat-label {
  color: var(--text-tertiary);
}

/* 表格樣式 */
.admin-table {
  border-collapse: separate;
  border-spacing: 0;
}

.admin-table-header {
  background: var(--bg-secondary);
}

.admin-table-th {
  color: var(--text-tertiary);
}

.admin-table-th-sortable {
  color: var(--text-tertiary);
  transition: all var(--duration-fast) var(--ease-smooth);
}

.admin-table-th-sortable:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.admin-table-body {
  background: var(--bg-elevated);
}

.admin-table-row {
  border-top: 1px solid var(--border-light);
  transition: background-color var(--duration-fast) var(--ease-smooth);
}

.admin-table-row:hover {
  background: var(--bg-secondary);
}

/* MIME類型標籤樣式 */
.admin-mime-badge {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}

/* 操作按鈕樣式 */
.admin-action-btn {
  color: var(--color-primary);
  transition: color var(--duration-fast) var(--ease-smooth);
}

.admin-action-btn:hover {
  color: var(--color-primary-dark);
}

.admin-delete-btn {
  color: var(--color-danger);
  transition: color var(--duration-fast) var(--ease-smooth);
}

.admin-delete-btn:hover {
  color: var(--color-danger-dark);
}
</style>

<template>
  <div class="space-y-6">
    <!-- 搜尋和篩選工具列 -->
    <div class="p-4 rounded-lg border admin-panel">
      <div class="flex flex-col lg:flex-row gap-4">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋檔名或上傳者..."
            class="w-full px-3 py-2 rounded-md admin-input"
          />
        </div>
        <div class="flex gap-4">
          <select
            v-model="selectedType"
            class="px-3 py-2 rounded-md admin-input"
          >
            <option
              v-for="type in fileTypes"
              :key="type.value"
              :value="type.value"
            >
              {{ type.label }}
            </option>
          </select>
          <select
            v-model="sortBy"
            class="px-3 py-2 rounded-md admin-input"
          >
            <option
              v-for="option in sortOptions"
              :key="option.value"
              :value="option.value"
            >
              排序：{{ option.label }}
            </option>
          </select>
          <button
            @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
            class="px-4 py-2 rounded-md admin-sort-btn"
          >
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 檔案統計 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="p-4 rounded-lg border admin-stat-card">
        <div class="text-2xl font-bold admin-stat-number">{{ fileStats.totalFiles }}</div>
        <div class="text-sm admin-stat-label">總檔案數</div>
      </div>
      <div class="p-4 rounded-lg border admin-stat-card">
        <div class="text-2xl font-bold admin-stat-number">
          {{ formatFileSize(fileStats.totalSize) }}
        </div>
        <div class="text-sm admin-stat-label">總檔案大小</div>
      </div>
      <div class="p-4 rounded-lg border admin-stat-card">
        <div class="text-2xl font-bold admin-stat-number">
          {{ fileStats.imageFiles }}
        </div>
        <div class="text-sm admin-stat-label">圖片檔案</div>
      </div>
      <div class="p-4 rounded-lg border admin-stat-card">
        <div class="text-2xl font-bold admin-stat-number">
          {{ fileStats.videoFiles }}
        </div>
        <div class="text-sm admin-stat-label">影片檔案</div>
      </div>
    </div>

    <!-- 檔案列表 -->
    <div class="rounded-lg border overflow-hidden admin-panel">
      <div v-if="isLoading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style="border-color: var(--color-primary)"></div>
        <p class="mt-2 admin-stat-label">載入中...</p>
      </div>

      <div v-else-if="filteredAndSortedFiles.length === 0" class="p-8 text-center admin-stat-label">
        <p>沒有找到符合條件的檔案</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full admin-table">
          <thead class="admin-table-header">
            <tr>
              <th
                @click="toggleSort('name')"
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer admin-table-th-sortable"
              >
                檔案名稱
                <span v-if="sortBy === 'name'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider admin-table-th">
                類型
              </th>
              <th
                @click="toggleSort('size')"
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer admin-table-th-sortable"
              >
                大小
                <span v-if="sortBy === 'size'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th
                @click="toggleSort('uploader')"
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer admin-table-th-sortable"
              >
                上傳者
                <span v-if="sortBy === 'uploader'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th
                @click="toggleSort('uploadDate')"
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer admin-table-th-sortable"
              >
                上傳時間
                <span v-if="sortBy === 'uploadDate'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider admin-table-th">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="admin-table-body">
            <tr
              v-for="file in filteredAndSortedFiles"
              :key="file.id"
              class="admin-table-row"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <span class="text-2xl mr-3">{{ getFileIcon(file.mimeType) }}</span>
                  <div>
                    <div class="text-sm font-medium max-w-xs truncate" style="color: var(--text-primary)">
                      {{ file.name }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium admin-mime-badge">
                  {{ file.mimeType || 'unknown' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: var(--text-primary)">
                {{ formatFileSize(file.size || 0) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: var(--text-primary)">
                {{ file.uploaderName || '未知' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm admin-stat-label">
                {{ file.createdAt ? new Date(file.createdAt).toLocaleString() : '未知' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  @click="downloadFile(file)"
                  class="admin-action-btn"
                >
                  下載
                </button>
                <button
                  @click="deleteFile(file.id)"
                  class="admin-delete-btn"
                >
                  刪除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
