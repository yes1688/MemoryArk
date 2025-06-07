<template>
  <AppDialog
    :visible="visible"
    size="large"
    title="進階搜尋"
    @update:visible="$emit('update:visible', $event)"
    @close="handleClose"
  >
    <template #content>
      <div class="space-y-6">
        <!-- 基本搜尋 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">檔案名稱</label>
          <AppInput
            v-model="searchFilters.name"
            placeholder="輸入檔案名稱..."
            clearable
          />
        </div>
        
        <!-- 檔案類型 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">檔案類型</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label 
              v-for="type in fileTypes" 
              :key="type.value"
              class="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                :value="type.value"
                v-model="searchFilters.types"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm">{{ type.label }}</span>
            </label>
          </div>
        </div>
        
        <!-- 檔案大小 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">檔案大小</label>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">最小大小 (MB)</label>
              <AppInput
                v-model.number="searchFilters.minSize"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">最大大小 (MB)</label>
              <AppInput
                v-model.number="searchFilters.maxSize"
                type="number"
                min="0"
                step="0.1"
                placeholder="無限制"
              />
            </div>
          </div>
        </div>
        
        <!-- 上傳時間 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">上傳時間</label>
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <label 
                v-for="preset in datePresets" 
                :key="preset.value"
                class="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="radio"
                  :value="preset.value"
                  v-model="selectedDatePreset"
                  @change="handleDatePresetChange"
                  class="text-primary-600 focus:ring-primary-500"
                />
                <span class="text-sm">{{ preset.label }}</span>
              </label>
            </div>
            
            <div v-if="selectedDatePreset === 'custom'" class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1">開始日期</label>
                <input
                  v-model="searchFilters.startDate"
                  type="date"
                  class="w-full border border-gray-300 rounded-win11 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">結束日期</label>
                <input
                  v-model="searchFilters.endDate"
                  type="date"
                  class="w-full border border-gray-300 rounded-win11 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- 上傳者 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">上傳者</label>
          <AppInput
            v-model="searchFilters.uploader"
            placeholder="輸入上傳者名稱..."
            clearable
          />
        </div>
        
        <!-- 排序選項 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">排序方式</label>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <select 
                v-model="searchFilters.sortBy"
                class="w-full border border-gray-300 rounded-win11 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="name">檔案名稱</option>
                <option value="size">檔案大小</option>
                <option value="createdAt">建立時間</option>
                <option value="updatedAt">修改時間</option>
                <option value="downloadCount">下載次數</option>
              </select>
            </div>
            <div>
              <select 
                v-model="searchFilters.sortOrder"
                class="w-full border border-gray-300 rounded-win11 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="asc">升序</option>
                <option value="desc">降序</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <template #footer>
      <div class="flex justify-between">
        <AppButton
          variant="ghost"
          @click="resetFilters"
        >
          重設
        </AppButton>
        <div class="flex space-x-3">
          <AppButton
            variant="secondary"
            @click="handleClose"
          >
            取消
          </AppButton>
          <AppButton
            variant="primary"
            @click="handleSearch"
          >
            搜尋
          </AppButton>
        </div>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { AppDialog, AppButton, AppInput } from '@/components/ui'

export interface SearchFilters {
  name?: string
  types: string[]
  minSize?: number
  maxSize?: number
  startDate?: string
  endDate?: string
  uploader?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface Props {
  visible: boolean
  filters?: Partial<SearchFilters>
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'search', filters: SearchFilters): void
  (e: 'reset'): void
}

const props = withDefaults(defineProps<Props>(), {
  filters: () => ({})
})

const emit = defineEmits<Emits>()

const searchFilters = reactive<SearchFilters>({
  name: '',
  types: [],
  minSize: undefined,
  maxSize: undefined,
  startDate: '',
  endDate: '',
  uploader: '',
  sortBy: 'name',
  sortOrder: 'asc'
})

const selectedDatePreset = ref<string>('all')

const fileTypes = [
  { value: 'image', label: '圖片' },
  { value: 'video', label: '影片' },
  { value: 'audio', label: '音頻' },
  { value: 'document', label: '文件' },
  { value: 'pdf', label: 'PDF' },
  { value: 'archive', label: '壓縮檔' },
  { value: 'text', label: '文字檔' },
  { value: 'other', label: '其他' }
]

const datePresets = [
  { value: 'all', label: '全部時間' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '最近一週' },
  { value: 'month', label: '最近一個月' },
  { value: 'year', label: '最近一年' },
  { value: 'custom', label: '自定義' }
]

const handleDatePresetChange = () => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  switch (selectedDatePreset.value) {
    case 'today':
      searchFilters.startDate = today
      searchFilters.endDate = today
      break
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      searchFilters.startDate = weekAgo.toISOString().split('T')[0]
      searchFilters.endDate = today
      break
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      searchFilters.startDate = monthAgo.toISOString().split('T')[0]
      searchFilters.endDate = today
      break
    case 'year':
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      searchFilters.startDate = yearAgo.toISOString().split('T')[0]
      searchFilters.endDate = today
      break
    case 'all':
    case 'custom':
      searchFilters.startDate = ''
      searchFilters.endDate = ''
      break
  }
}

const resetFilters = () => {
  Object.assign(searchFilters, {
    name: '',
    types: [],
    minSize: undefined,
    maxSize: undefined,
    startDate: '',
    endDate: '',
    uploader: '',
    sortBy: 'name',
    sortOrder: 'asc'
  })
  selectedDatePreset.value = 'all'
  emit('reset')
}

const handleSearch = () => {
  // 清理空值
  const cleanFilters: SearchFilters = {
    name: searchFilters.name?.trim() || undefined,
    types: searchFilters.types.length > 0 ? searchFilters.types : [],
    minSize: searchFilters.minSize || undefined,
    maxSize: searchFilters.maxSize || undefined,
    startDate: searchFilters.startDate || undefined,
    endDate: searchFilters.endDate || undefined,
    uploader: searchFilters.uploader?.trim() || undefined,
    sortBy: searchFilters.sortBy,
    sortOrder: searchFilters.sortOrder
  }
  
  emit('search', cleanFilters)
  handleClose()
}

const handleClose = () => {
  emit('update:visible', false)
}

// 監聽 props 變化，同步到本地狀態
watch(
  () => props.filters,
  (newFilters) => {
    if (newFilters) {
      Object.assign(searchFilters, {
        name: newFilters.name || '',
        types: newFilters.types || [],
        minSize: newFilters.minSize,
        maxSize: newFilters.maxSize,
        startDate: newFilters.startDate || '',
        endDate: newFilters.endDate || '',
        uploader: newFilters.uploader || '',
        sortBy: newFilters.sortBy || 'name',
        sortOrder: newFilters.sortOrder || 'asc'
      })
    }
  },
  { immediate: true, deep: true }
)
</script>