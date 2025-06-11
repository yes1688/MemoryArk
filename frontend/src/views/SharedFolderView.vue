<template>
  <div class="h-screen flex flex-col bg-church-bg">
    <!-- 頁面標題區域 -->
    <div class="bg-white border-b border-gray-200 shadow-win11">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-church-primary rounded-win11 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">共享資料夾</h1>
              <p class="text-sm text-gray-600">教會成員共享的聖工資源</p>
            </div>
          </div>
          
          <div class="flex items-center space-x-3">
            <AppButton
              variant="secondary"
              @click="showSubscriptionModal = true"
            >
              <template #icon-left>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM15 17H9a4 4 0 01-4-4V6a4 4 0 014-4h6a4 4 0 014 4v7a4 4 0 01-4 4z"/>
                </svg>
              </template>
              訂閱通知
            </AppButton>
            
            <AppButton
              variant="primary"
              @click="showUploadModal = true"
            >
              <template #icon-left>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </template>
              貢獻資源
            </AppButton>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 主要內容區域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左側分類導航 -->
      <div class="w-80 bg-white border-r border-gray-200 shadow-win11 flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">資源分類</h3>
          
          <!-- 搜尋框 -->
          <AppInput
            v-model="searchQuery"
            placeholder="搜尋資源..."
            size="small"
            clearable
            @input="onSearch"
          >
            <template #prefix>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </template>
          </AppInput>
        </div>
        
        <!-- 分類列表 -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="space-y-1">
            <button
              v-for="category in churchCategories"
              :key="category.id"
              @click="selectCategory(category)"
              :class="[
                'w-full text-left px-3 py-3 rounded-win11 transition-colors duration-200 flex items-center space-x-3',
                selectedCategory?.id === category.id 
                  ? 'bg-church-primary text-white' 
                  : 'hover:bg-church-primary/10 text-gray-700'
              ]"
            >
              <div :class="[
                'w-10 h-10 rounded-win11 flex items-center justify-center',
                selectedCategory?.id === category.id ? 'bg-white/20' : 'bg-church-primary/10'
              ]">
                <component :is="category.icon" :class="[
                  'w-5 h-5',
                  selectedCategory?.id === category.id ? 'text-white' : 'text-church-primary'
                ]" />
              </div>
              <div class="flex-1">
                <h4 class="font-medium">{{ category.name }}</h4>
                <p :class="[
                  'text-sm',
                  selectedCategory?.id === category.id ? 'text-white/80' : 'text-gray-500'
                ]">
                  {{ category.fileCount }} 個檔案
                </p>
              </div>
            </button>
          </div>
        </div>
        
        <!-- 底部統計 -->
        <div class="p-4 border-t border-gray-200 bg-gray-50">
          <div class="space-y-2 text-sm text-gray-600">
            <div class="flex justify-between">
              <span>總資源數</span>
              <span class="font-medium">{{ totalFiles }}</span>
            </div>
            <div class="flex justify-between">
              <span>本月新增</span>
              <span class="font-medium text-church-primary">{{ monthlyNewFiles }}</span>
            </div>
            <div class="flex justify-between">
              <span>熱門下載</span>
              <span class="font-medium text-church-secondary">{{ popularDownloads }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右側檔案列表 -->
      <div class="flex-1 flex flex-col">
        <!-- 分類標題和工具列 -->
        <div class="bg-white border-b border-gray-200 px-6 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">{{ selectedCategory?.name || '所有資源' }}</h2>
              <p class="text-sm text-gray-600 mt-1">{{ selectedCategory?.description || '教會共享的所有資源' }}</p>
            </div>
            
            <div class="flex items-center space-x-3">
              <!-- 檢視模式切換 -->
              <div class="flex items-center bg-gray-100 rounded-win11 p-1">
                <AppButton
                  variant="ghost"
                  size="small"
                  :class="viewMode === 'grid' ? 'bg-white shadow-sm' : ''"
                  @click="viewMode = 'grid'"
                >
                  <template #icon-left>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                    </svg>
                  </template>
                </AppButton>
                
                <AppButton
                  variant="ghost"
                  size="small"
                  :class="viewMode === 'list' ? 'bg-white shadow-sm' : ''"
                  @click="viewMode = 'list'"
                >
                  <template #icon-left>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                    </svg>
                  </template>
                </AppButton>
              </div>
              
              <!-- 排序選項 -->
              <select 
                v-model="sortBy"
                @change="onSortChange"
                class="border border-gray-300 rounded-win11 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-church-primary focus:border-transparent"
              >
                <option value="name">檔案名稱</option>
                <option value="createdAt">上傳時間</option>
                <option value="downloadCount">下載次數</option>
                <option value="size">檔案大小</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- 檔案內容區域 -->
        <div class="flex-1 overflow-auto p-6">
          <div v-if="isLoading" class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-church-primary"></div>
          </div>
          
          <div v-else-if="filteredFiles.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-lg font-medium text-gray-600">此分類暫無資源</p>
            <p class="text-sm text-gray-500 mt-1">歡迎貢獻您的資源給教會弟兄姊妹</p>
            <AppButton 
              variant="primary"
              @click="showUploadModal = true"
              class="mt-4"
            >
              <template #icon-left>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
              </template>
              貢獻資源
            </AppButton>
          </div>
          
          <!-- 格狀視圖 -->
          <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <SharedResourceCard
              v-for="file in filteredFiles"
              :key="file.id"
              :file="file as any"
              @download="downloadFile"
              @preview="previewFile"
              @like="toggleLike"
            />
          </div>
          
          <!-- 清單視圖 -->
          <div v-else class="space-y-2">
            <SharedResourceItem
              v-for="file in filteredFiles"
              :key="file.id"
              :file="file as any"
              @download="downloadFile"
              @preview="previewFile"
              @like="toggleLike"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 模態窗口 -->
    <UploadModal 
      v-if="showUploadModal"
      :is-visible="showUploadModal"
      :current-folder-id="selectedCategory?.id"
      @close="showUploadModal = false"
      @uploaded="onResourceUploaded"
    />
    
    <AppDialog
      :visible="showSubscriptionModal"
      title="訂閱通知設定"
      size="medium"
      @update:visible="showSubscriptionModal = $event"
    >
      <template #content>
        <div class="space-y-4">
          <p class="text-gray-600">選擇您想要接收通知的資源分類：</p>
          <div class="space-y-3">
            <label 
              v-for="category in churchCategories"
              :key="category.id"
              class="flex items-center space-x-3 cursor-pointer"
            >
              <input
                type="checkbox"
                :value="category.id"
                v-model="subscriptions"
                class="rounded border-gray-300 text-church-primary focus:ring-church-primary"
              />
              <span class="text-sm">{{ category.name }}</span>
            </label>
          </div>
        </div>
      </template>
      
      <template #footer>
        <div class="flex justify-end space-x-3">
          <AppButton
            variant="secondary"
            @click="showSubscriptionModal = false"
          >
            取消
          </AppButton>
          <AppButton
            variant="primary"
            @click="saveSubscriptions"
          >
            儲存設定
          </AppButton>
        </div>
      </template>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AppButton, AppInput, AppDialog } from '@/components/ui'
import UploadModal from '@/components/UploadModal.vue'
import SharedResourceCard from '@/components/SharedResourceCard.vue'
import SharedResourceItem from '@/components/SharedResourceItem.vue'
import { useFilesStore } from '@/stores/files'
import type { FileInfo } from '@/types/files'
import { fileApi } from '@/api/files'

const filesStore = useFilesStore()

// 響應式狀態
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const sortBy = ref('name')
const isLoading = ref(false)
const showUploadModal = ref(false)
const showSubscriptionModal = ref(false)
const subscriptions = ref<number[]>([])

// 選中的分類
const selectedCategory = ref<ChurchCategory | null>(null)

// 教會分類定義
interface ChurchCategory {
  id: number
  name: string
  description: string
  icon: string
  fileCount: number
}

// 從真實數據計算教會分類
const churchCategories = computed(() => {
  // 統計各分類的檔案數量
  const categorizeFile = (file: FileInfo) => {
    const name = (file.name || '').toLowerCase()
    const mimeType = (file.mimeType || '').toLowerCase()
    
    if (mimeType.startsWith('video/') || mimeType.startsWith('audio/') || name.includes('講道') || name.includes('sermon')) {
      return 1 // 講道影音
    } else if (name.includes('詩歌') || name.includes('hymn') || name.includes('song')) {
      return 2 // 詩歌本
    } else if (name.includes('聖經') || name.includes('bible') || name.includes('查經') || name.includes('靈修')) {
      return 3 // 聖經研讀
    } else if (mimeType.startsWith('image/') || name.includes('活動') || name.includes('照片') || name.includes('photo')) {
      return 4 // 教會活動
    } else if (name.includes('見證') || name.includes('分享') || name.includes('testimony')) {
      return 5 // 見證分享
    } else if (name.includes('教育') || name.includes('教材') || name.includes('education')) {
      return 6 // 宗教教育
    }
    return null
  }

  const counts = [0, 0, 0, 0, 0, 0]
  filesStore.files.forEach(file => {
    if (file.categoryId && file.categoryId >= 1 && file.categoryId <= 6 && !file.isDeleted) {
      counts[file.categoryId - 1]++
    }
  })

  return [
    {
      id: 1,
      name: '講道影音',
      description: '安息日講道和特別聚會的錄音錄影',
      icon: 'MicrophoneIcon',
      fileCount: counts[0]
    },
    {
      id: 2,
      name: '詩歌本',
      description: '讚美詩歌和聖歌資源',
      icon: 'MusicalNoteIcon',
      fileCount: counts[1]
    },
    {
      id: 3,
      name: '聖經研讀',
      description: '查經資料和靈修材料',
      icon: 'BookOpenIcon',
      fileCount: counts[2]
    },
    {
      id: 4,
      name: '教會活動',
      description: '教會活動照片和紀錄',
      icon: 'CameraIcon',
      fileCount: counts[3]
    },
    {
      id: 5,
      name: '見證分享',
      description: '弟兄姊妹的見證和分享',
      icon: 'HeartIcon',
      fileCount: counts[4]
    },
    {
      id: 6,
      name: '宗教教育',
      description: '宗教教育教材和資源',
      icon: 'AcademicCapIcon',
      fileCount: counts[5]
    }
  ]
})

// 使用真實檔案資料
const files = computed(() => {
  return filesStore.files.filter(file => file.categoryId && file.categoryId >= 1 && file.categoryId <= 6 && !file.isDeleted)
})

// 計算屬性
const totalFiles = computed(() => files.value.length)

const monthlyNewFiles = computed(() => {
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  
  return files.value.filter(file => 
    new Date(file.createdAt) >= oneMonthAgo
  ).length
})

const popularDownloads = computed(() => {
  return files.value.reduce((sum, file) => sum + (file.downloadCount || 0), 0)
})

const filteredFiles = computed(() => {
  let result = files.value
  
  // 按分類篩選
  if (selectedCategory.value) {
    result = result.filter(file => file.categoryId === selectedCategory.value?.id)
  }
  
  // 按搜尋詞篩選
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(file => 
      file.name.toLowerCase().includes(query) ||
      file.description?.toLowerCase().includes(query)
    )
  }
  
  // 排序
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'createdAt':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'downloadCount':
        return (b.downloadCount || 0) - (a.downloadCount || 0)
      case 'size':
        return b.size - a.size
      default:
        return 0
    }
  })
  
  return result
})

// 方法
const selectCategory = (category: ChurchCategory) => {
  selectedCategory.value = category
  loadFiles()
}

const onSearch = () => {
  // 搜尋邏輯已在 computed 中處理
}

const onSortChange = () => {
  // 排序邏輯已在 computed 中處理
}

const loadFiles = async () => {
  isLoading.value = true
  try {
    // 載入真實檔案數據
    await filesStore.fetchFiles()
  } catch (error) {
    console.error('Failed to load files:', error)
  } finally {
    isLoading.value = false
  }
}

const downloadFile = (file: FileInfo) => {
  const url = fileApi.downloadFile(file.id)
  window.open(url, '_blank')
}

const previewFile = (file: FileInfo) => {
  // 實作預覽功能
  console.log('Preview file:', file.name)
}

const toggleLike = (file: FileInfo) => {
  // 實作按讚功能
  console.log('Toggle like for file:', file.name)
}

const onResourceUploaded = () => {
  showUploadModal.value = false
  loadFiles()
}

const saveSubscriptions = () => {
  // 儲存訂閱設定
  console.log('Saving subscriptions:', subscriptions.value)
  showSubscriptionModal.value = false
}

// 生命週期
onMounted(() => {
  // 預設選擇第一個分類
  if (churchCategories.value.length > 0) {
    selectedCategory.value = churchCategories.value[0]
  }
  loadFiles()
})
</script>