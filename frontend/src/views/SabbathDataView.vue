<template>
  <div class="h-screen flex flex-col bg-church-bg">
    <!-- 頁面標題區域 -->
    <div class="bg-white border-b border-gray-200 shadow-win11">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-church-primary rounded-win11 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">安息日資料</h1>
              <p class="text-sm text-gray-600">安息日聚會和聖工的珍貴記錄</p>
            </div>
          </div>
          
          <!-- 安息日行事曆資訊 -->
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <div class="text-sm text-gray-600">下個安息日</div>
              <div class="text-lg font-semibold text-church-primary">{{ nextSabbathDate }}</div>
            </div>
            
            <AppButton
              variant="primary"
              @click="showUploadModal = true"
            >
              <template #icon-left>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
              </template>
              上傳資料
            </AppButton>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 主要內容區域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左側年月導航 -->
      <div class="w-80 bg-white border-r border-gray-200 shadow-win11 flex flex-col">
        <!-- 年份選擇器 -->
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">安息日行事曆</h3>
            <select 
              v-model="selectedYear"
              @change="onYearChange"
              class="border border-gray-300 rounded-win11 px-3 py-1 text-sm bg-white focus:ring-2 focus:ring-church-primary focus:border-transparent"
            >
              <option v-for="year in availableYears" :key="year" :value="year">{{ year }} 年</option>
            </select>
          </div>
          
          <!-- 快速跳轉 -->
          <div class="flex space-x-2">
            <AppButton
              variant="ghost"
              size="small"
              @click="jumpToToday"
              class="flex-1"
            >
              今天
            </AppButton>
            <AppButton
              variant="ghost"
              size="small"
              @click="jumpToNextSabbath"
              class="flex-1"
            >
              下個安息日
            </AppButton>
          </div>
        </div>
        
        <!-- 月份和安息日列表 -->
        <div class="flex-1 overflow-y-auto">
          <div v-for="month in monthsData" :key="month.month" class="border-b border-gray-100">
            <button
              @click="toggleMonth(month.month)"
              class="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between"
            >
              <span class="font-medium text-gray-900">{{ month.name }}</span>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500">{{ month.sabbaths.length }} 次</span>
                <svg 
                  :class="['w-4 h-4 text-gray-400 transition-transform duration-200', 
                           expandedMonths.includes(month.month) ? 'rotate-90' : '']"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </button>
            
            <div v-if="expandedMonths.includes(month.month)" class="bg-gray-50">
              <button
                v-for="sabbath in month.sabbaths"
                :key="sabbath.date"
                @click="selectSabbath(sabbath)"
                :class="[
                  'w-full px-6 py-3 text-left transition-colors duration-200 flex items-center justify-between',
                  selectedSabbath?.date === sabbath.date 
                    ? 'bg-church-primary text-white' 
                    : 'hover:bg-white text-gray-700'
                ]"
              >
                <div>
                  <div class="font-medium">{{ formatSabbathDate(sabbath.date) }}</div>
                  <div :class="['text-sm', selectedSabbath?.date === sabbath.date ? 'text-white/80' : 'text-gray-500']">
                    {{ sabbath.filesCount }} 個檔案
                  </div>
                </div>
                
                <div v-if="sabbath.hasSpecialEvent" :class="[
                  'w-2 h-2 rounded-full',
                  selectedSabbath?.date === sabbath.date ? 'bg-white' : 'bg-church-secondary'
                ]"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右側檔案內容 -->
      <div class="flex-1 flex flex-col">
        <!-- 內容工具列 -->
        <div class="bg-white border-b border-gray-200 px-6 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">
                {{ selectedSabbath ? formatSabbathDate(selectedSabbath.date) : '選擇安息日' }}
              </h2>
              <p v-if="selectedSabbath" class="text-sm text-gray-600 mt-1">
                {{ selectedSabbath.theme || '安息日聚會資料' }}
              </p>
            </div>
            
            <div v-if="selectedSabbath" class="flex items-center space-x-3">
              <!-- 分類篩選 -->
              <select 
                v-model="selectedContentType"
                @change="onContentTypeChange"
                class="border border-gray-300 rounded-win11 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-church-primary focus:border-transparent"
              >
                <option value="">所有類型</option>
                <option value="sermon">講道錄音</option>
                <option value="video">聚會錄影</option>
                <option value="bulletin">週報</option>
                <option value="communion">聖餐禮</option>
                <option value="special">特別聚會</option>
              </select>
              
              <!-- 檢視模式 -->
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
            </div>
          </div>
        </div>
        
        <!-- 檔案內容區域 -->
        <div class="flex-1 overflow-auto p-6">
          <div v-if="!selectedSabbath" class="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p class="text-lg font-medium text-gray-600">選擇左側的安息日</p>
            <p class="text-sm text-gray-500 mt-1">查看該日的聚會資料</p>
          </div>
          
          <div v-else-if="isLoading" class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-church-primary"></div>
          </div>
          
          <div v-else-if="filteredSabbathFiles.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-lg font-medium text-gray-600">此安息日暫無資料</p>
            <p class="text-sm text-gray-500 mt-1">歡迎上傳聚會錄音或相關資料</p>
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
              上傳資料
            </AppButton>
          </div>
          
          <!-- 格狀視圖 -->
          <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <SabbathFileCard
              v-for="file in filteredSabbathFiles"
              :key="file.id"
              :file="file as any"
              :sabbath-date="selectedSabbath.date"
              @download="downloadFile"
              @preview="previewFile"
            />
          </div>
          
          <!-- 清單視圖 -->
          <div v-else class="space-y-2">
            <SabbathFileItem
              v-for="file in filteredSabbathFiles"
              :key="file.id"
              :file="file as any"
              :sabbath-date="selectedSabbath.date"
              @download="downloadFile"
              @preview="previewFile"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 模態窗口 -->
    <UploadModal 
      v-if="showUploadModal"
      :is-visible="showUploadModal"
      :sabbath-date="selectedSabbath?.date"
      @close="showUploadModal = false"
      @uploaded="onSabbathFileUploaded"
    />
    
    <!-- 檔案預覽 -->
    <AppFilePreview
      :visible="showFilePreview"
      :file="selectedFile"
      @update:visible="handlePreviewClose"
      @download="handlePreviewDownload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AppButton, AppDialog, AppFilePreview } from '@/components/ui'
import UploadModal from '@/components/UploadModal.vue'
import SabbathFileCard from '@/components/SabbathFileCard.vue'
import SabbathFileItem from '@/components/SabbathFileItem.vue'
import { useFilesStore } from '@/stores/files'
import type { FileInfo } from '@/types/files'
import { fileApi } from '@/api/files'

const filesStore = useFilesStore()

// 響應式狀態
const selectedYear = ref(new Date().getFullYear())
const expandedMonths = ref<number[]>([new Date().getMonth() + 1])
const selectedSabbath = ref<SabbathData | null>(null)
const selectedContentType = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const isLoading = ref(false)
const showUploadModal = ref(false)
const showFilePreview = ref(false)
const selectedFile = ref<FileInfo | null>(null)

// 安息日資料介面
interface SabbathData {
  date: string
  theme?: string
  speaker?: string
  filesCount: number
  hasSpecialEvent: boolean
}

// 可用年份
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
})

// 下個安息日日期
const nextSabbathDate = computed(() => {
  const today = new Date()
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7
  const nextSaturday = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000)
  return nextSaturday.toLocaleDateString('zh-TW', { 
    month: 'long', 
    day: 'numeric' 
  })
})

// 月份資料
const monthsData = computed(() => {
  const months = []
  for (let month = 1; month <= 12; month++) {
    const sabbaths = getSabbathsInMonth(selectedYear.value, month)
    if (sabbaths.length > 0) {
      months.push({
        month,
        name: `${month} 月`,
        sabbaths
      })
    }
  }
  return months
})

// 安息日檔案
const sabbathFiles = ref<FileInfo[]>([])

// 篩選後的安息日檔案
const filteredSabbathFiles = computed(() => {
  if (!selectedContentType.value) return sabbathFiles.value
  return sabbathFiles.value.filter(file => (file as any).contentType === selectedContentType.value)
})

// 方法
const getSabbathsInMonth = (year: number, month: number): SabbathData[] => {
  const sabbaths: SabbathData[] = []
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  
  // 找到該月所有的星期六
  for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
    if (date.getDay() === 6) { // 星期六
      const sabbathDateStr = date.toISOString().split('T')[0]
      
      // 計算該安息日的檔案數量（基於真實數據）
      const filesOnThisDate = filesStore.files.filter(file => {
        if (file.isDeleted || file.categoryId !== 1) return false // categoryId 1 = sabbath
        const fileDate = new Date(file.createdAt).toISOString().split('T')[0]
        return fileDate === sabbathDateStr
      }).length
      
      // 檢查是否有特殊事件（根據檔案名稱判斷）
      const hasSpecialEvent = filesStore.files.some(file => {
        if (file.isDeleted || file.categoryId !== 1) return false // categoryId 1 = sabbath
        const fileDate = new Date(file.createdAt).toISOString().split('T')[0]
        const fileName = (file.name || '').toLowerCase()
        return fileDate === sabbathDateStr && (
          fileName.includes('特別') || fileName.includes('special') ||
          fileName.includes('節慶') || fileName.includes('holiday') ||
          fileName.includes('洗禮') || fileName.includes('baptism')
        )
      })
      
      sabbaths.push({
        date: sabbathDateStr,
        filesCount: filesOnThisDate,
        hasSpecialEvent
      })
    }
  }
  
  return sabbaths
}

const formatSabbathDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  })
}

const toggleMonth = (month: number) => {
  const index = expandedMonths.value.indexOf(month)
  if (index > -1) {
    expandedMonths.value.splice(index, 1)
  } else {
    expandedMonths.value.push(month)
  }
}

const selectSabbath = async (sabbath: SabbathData) => {
  selectedSabbath.value = sabbath
  await loadSabbathFiles(sabbath.date)
}

const loadSabbathFiles = async (sabbathDate: string) => {
  isLoading.value = true
  try {
    // 載入檔案數據
    await filesStore.fetchFiles()
    
    // 篩選該安息日的檔案
    sabbathFiles.value = filesStore.files.filter(file => {
      if (file.isDeleted || file.categoryId !== 1) return false // categoryId 1 = sabbath
      const fileDate = new Date(file.createdAt).toISOString().split('T')[0]
      return fileDate === sabbathDate
    })
  } catch (error) {
    console.error('Failed to load sabbath files:', error)
  } finally {
    isLoading.value = false
  }
}

const jumpToToday = () => {
  const today = new Date()
  selectedYear.value = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  
  if (!expandedMonths.value.includes(currentMonth)) {
    expandedMonths.value.push(currentMonth)
  }
  
  // 找到最近的安息日
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7
  const nextSaturday = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000)
  
  const sabbathData = monthsData.value
    .find(m => m.month === nextSaturday.getMonth() + 1)
    ?.sabbaths.find(s => s.date === nextSaturday.toISOString().split('T')[0])
  
  if (sabbathData) {
    selectSabbath(sabbathData)
  }
}

const jumpToNextSabbath = () => {
  jumpToToday()
}

const onYearChange = () => {
  // 重置選中狀態
  selectedSabbath.value = null
  expandedMonths.value = [new Date().getMonth() + 1]
}

const onContentTypeChange = () => {
  // 篩選邏輯在 computed 中處理
}

const downloadFile = (file: any) => {
  const url = fileApi.downloadFile(file.id)
  window.open(url, '_blank')
}

const previewFile = (file: FileInfo) => {
  selectedFile.value = file
  showFilePreview.value = true
}

const handlePreviewClose = () => {
  showFilePreview.value = false
  selectedFile.value = null
}

const handlePreviewDownload = (file: FileInfo) => {
  downloadFile(file)
}

const onSabbathFileUploaded = () => {
  showUploadModal.value = false
  if (selectedSabbath.value) {
    loadSabbathFiles(selectedSabbath.value.date)
  }
}

// 生命週期
onMounted(async () => {
  // 載入檔案數據
  await filesStore.fetchFiles()
  
  // 自動選擇當前月份
  const currentMonth = new Date().getMonth() + 1
  expandedMonths.value = [currentMonth]
})
</script>