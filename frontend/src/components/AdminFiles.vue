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
  let filtered = files.value

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

const loadFiles = async () => {
  isLoading.value = true
  try {
    console.log('🔍 正在載入檔案列表...')
    const response = await adminApi.getAllFiles()
    console.log('📋 完整 API 回應:', response)
    console.log('📁 檔案資料:', response.data)
    console.log('📄 檔案數量:', response.data?.files?.length)
    if (response.data?.files?.length > 0) {
      console.log('📄 第一個檔案完整資料:', JSON.stringify(response.data.files[0], null, 2))
    }
    // 轉換後端回傳的資料格式到前端期望的格式
    const transformedFiles = (response.data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      originalName: file.original_name,
      size: file.file_size,
      mimeType: file.mime_type,
      isDirectory: file.is_directory,
      parentId: file.parent_id,
      path: file.file_path,
      uploaderId: file.uploaded_by,
      uploaderName: file.uploader?.name,
      downloadCount: file.download_count || 0,
      isDeleted: file.is_deleted,
      deletedAt: file.deleted_at,
      deletedBy: file.deleted_by,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
      url: file.url,
      thumbnailUrl: file.thumbnail_url
    }))
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

<template>
  <div class="space-y-6">
    <!-- 搜尋和篩選工具列 -->
    <div class="bg-white p-4 rounded-lg border">
      <div class="flex flex-col lg:flex-row gap-4">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋檔名或上傳者..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div class="flex gap-4">
          <select
            v-model="selectedType"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 檔案統計 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-lg border">
        <div class="text-2xl font-bold text-blue-600">{{ files.length }}</div>
        <div class="text-sm text-gray-600">總檔案數</div>
      </div>
      <div class="bg-white p-4 rounded-lg border">
        <div class="text-2xl font-bold text-green-600">
          {{ formatFileSize(files.reduce((sum, file) => sum + (file.size || 0), 0)) }}
        </div>
        <div class="text-sm text-gray-600">總檔案大小</div>
      </div>
      <div class="bg-white p-4 rounded-lg border">
        <div class="text-2xl font-bold text-purple-600">
          {{ files.filter(f => f.mimeType?.startsWith('image/')).length }}
        </div>
        <div class="text-sm text-gray-600">圖片檔案</div>
      </div>
      <div class="bg-white p-4 rounded-lg border">
        <div class="text-2xl font-bold text-orange-600">
          {{ files.filter(f => f.mimeType?.startsWith('video/')).length }}
        </div>
        <div class="text-sm text-gray-600">影片檔案</div>
      </div>
    </div>

    <!-- 檔案列表 -->
    <div class="bg-white rounded-lg border overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">載入中...</p>
      </div>

      <div v-else-if="filteredAndSortedFiles.length === 0" class="p-8 text-center text-gray-500">
        <p>沒有找到符合條件的檔案</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                @click="toggleSort('name')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                檔案名稱
                <span v-if="sortBy === 'name'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                類型
              </th>
              <th
                @click="toggleSort('size')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                大小
                <span v-if="sortBy === 'size'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th
                @click="toggleSort('uploader')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                上傳者
                <span v-if="sortBy === 'uploader'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th
                @click="toggleSort('uploadDate')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                上傳時間
                <span v-if="sortBy === 'uploadDate'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="file in filteredAndSortedFiles"
              :key="file.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <span class="text-2xl mr-3">{{ getFileIcon(file.mimeType) }}</span>
                  <div>
                    <div class="text-sm font-medium text-gray-900 max-w-xs truncate">
                      {{ file.name }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ file.mimeType || '未知' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatFileSize(file.size || 0) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ file.uploaderName || '未知' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ file.createdAt ? new Date(file.createdAt).toLocaleString() : '未知' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  @click="downloadFile(file)"
                  class="text-blue-600 hover:text-blue-800"
                >
                  下載
                </button>
                <button
                  @click="deleteFile(file.id)"
                  class="text-red-600 hover:text-red-800"
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
