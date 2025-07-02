<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center glass-overlay backdrop-blur-glass-xl"
    @click="handleBackdropClick"
  >
    <div
      class="relative w-full max-w-lg mx-4 glass-modal rounded-2xl shadow-glass-2xl transform transition-all duration-300 ease-glass border border-glass-border-strong"
      @click.stop
    >
      <!-- 玻璃化標題列 -->
      <div class="flex items-center justify-between p-6 border-b border-glass-border">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {{ operationType === 'copy' ? '複製檔案' : '移動檔案' }}
        </h2>
        <button
          @click="close"
          class="glass-button p-2 rounded-lg transition-all duration-200 ease-glass hover:glass-medium active:glass-heavy text-gray-600 dark:text-gray-400"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- 內容區域 -->
      <div class="p-6">
        <!-- 玻璃化操作檔案列表 -->
        <div class="mb-6">
          <h3 class="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
            {{ operationType === 'copy' ? '要複製的檔案' : '要移動的檔案' }}
            <span class="text-blue-600 dark:text-blue-400">({{ selectedFiles.length }} 個)</span>
          </h3>
          
          <div class="max-h-32 overflow-y-auto space-y-2 p-3 rounded-lg glass-light border border-glass-border">
            <div
              v-for="file in selectedFiles"
              :key="file.id"
              class="flex items-center space-x-2"
            >
              <component
                :is="file.isDirectory ? FolderIcon : DocumentIcon"
                class="w-4 h-4 flex-shrink-0"
                :class="file.isDirectory ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'"
              />
              <span class="text-sm truncate text-gray-900 dark:text-gray-100">
                {{ file.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- 目標資料夾選擇 -->
        <div class="mb-6">
          <h3 class="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
            選擇目標資料夾
          </h3>
          
          <FolderSelector
            v-model="targetFolderId"
            :disabled-folder-ids="disabledFolderIds"
            @select="onFolderSelect"
          />
        </div>

        <!-- 玻璃化操作提示 -->
        <div
          v-if="operationType === 'move' && targetFolderId === currentParentId"
          class="mb-4 p-3 rounded-lg glass-light border border-yellow-400/60 bg-yellow-50/80 dark:bg-yellow-900/20"
        >
          <div class="flex items-start">
            <ExclamationTriangleIcon class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p class="text-sm text-yellow-800 dark:text-yellow-200">
                目標資料夾與目前位置相同，移動操作不會改變檔案位置。
              </p>
            </div>
          </div>
        </div>

        <!-- 玻璃化名稱衝突提示 -->
        <div
          v-if="operationType === 'copy' && targetFolderId === currentParentId"
          class="mb-4 p-3 rounded-lg glass-light border border-blue-400/60 bg-blue-50/80 dark:bg-blue-900/20"
        >
          <div class="flex items-start">
            <InformationCircleIcon class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p class="text-sm text-blue-800 dark:text-blue-200">
                複製到相同資料夾時，系統會自動重新命名避免衝突。
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 玻璃化操作按鈕 -->
      <div class="flex items-center justify-end space-x-3 p-6 border-t border-glass-border glass-light">
        <button
          @click="close"
          :disabled="loading"
          class="glass-button px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-glass hover:glass-medium active:glass-heavy disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        
        <button
          @click="executeOperation"
          :disabled="loading || !targetFolderId && targetFolderId !== null"
          class="glass-button px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 ease-glass hover:glass-medium active:glass-heavy disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500/80 hover:bg-blue-600/80 border border-blue-400/60 flex items-center space-x-2"
        >
          <div v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>
            {{ loading ? '處理中...' : (operationType === 'copy' ? '複製' : '移動') }}
          </span>
        </button>
      </div>

      <!-- 玻璃化結果顯示 -->
      <div
        v-if="operationResult"
        class="absolute inset-0 flex items-center justify-center glass-heavy backdrop-blur-glass-xl rounded-2xl"
      >
        <div class="text-center p-8">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
               :class="operationResult.success_count > 0 ? 'bg-green-100' : 'bg-red-100'">
            <CheckCircleIcon
              v-if="operationResult.success_count > 0"
              class="w-8 h-8 text-green-600"
            />
            <XCircleIcon
              v-else
              class="w-8 h-8 text-red-600"
            />
          </div>
          
          <h3 class="text-lg font-semibold mb-2" :style="{ color: 'var(--text-primary)' }">
            操作完成
          </h3>
          
          <div class="space-y-1 text-sm" :style="{ color: 'var(--text-secondary)' }">
            <p>成功：{{ operationResult.success_count }} 個檔案</p>
            <p v-if="operationResult.failed_count > 0" class="text-red-600">
              失敗：{{ operationResult.failed_count }} 個檔案
            </p>
          </div>

          <!-- 失敗詳情 -->
          <div v-if="operationResult.failed_files.length > 0" class="mt-4">
            <details class="text-left">
              <summary class="cursor-pointer text-sm text-red-600 hover:text-red-700">
                查看失敗詳情
              </summary>
              <div class="mt-2 p-3 bg-red-50 rounded-md text-sm">
                <div
                  v-for="failed in operationResult.failed_files"
                  :key="failed.original_id"
                  class="text-red-800"
                >
                  {{ failed.file_name }}: {{ failed.error }}
                </div>
              </div>
            </details>
          </div>
          
          <button
            @click="closeWithRefresh"
            class="mt-6 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            確定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  XMarkIcon,
  FolderIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/vue/24/outline'
import FolderSelector from './FolderSelector.vue'
import { fileApi } from '@/api/files'
import type { FileInfo, FileOperationResponse } from '@/types/files'

interface Props {
  isVisible: boolean
  operationType: 'copy' | 'move'
  selectedFiles: FileInfo[]
  currentParentId?: number | null
}

interface Emits {
  (e: 'close'): void
  (e: 'success', result: FileOperationResponse): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 狀態
const loading = ref(false)
const targetFolderId = ref<number | null>(null)
const targetFolderPath = ref<string>('')
const operationResult = ref<FileOperationResponse | null>(null)

// 計算禁用的資料夾ID
const disabledFolderIds = computed(() => {
  const disabled = new Set<number>()
  
  if (props.operationType === 'move') {
    // 移動時禁用選中的資料夾本身和其子資料夾
    props.selectedFiles.forEach(file => {
      if (file.isDirectory) {
        disabled.add(file.id)
        // 這裡可以遞迴添加所有子資料夾ID，但需要完整的樹狀結構
        // 簡化實現：只禁用直接選中的資料夾
      }
    })
  }
  
  return disabled
})

// 選擇資料夾處理
const onFolderSelect = (folderId: number | null, folderPath: string) => {
  targetFolderId.value = folderId
  targetFolderPath.value = folderPath
}

// 執行操作
const executeOperation = async () => {
  if (!props.selectedFiles.length) return
  
  try {
    loading.value = true
    operationResult.value = null
    
    const fileIds = props.selectedFiles.map(file => file.id)
    
    let response: FileOperationResponse
    
    if (props.operationType === 'copy') {
      response = await fileApi.copyFiles(fileIds, targetFolderId.value || undefined)
    } else {
      response = await fileApi.moveFiles(fileIds, targetFolderId.value || undefined)
    }
    
    operationResult.value = response
    
    // 如果有成功的操作，觸發成功事件
    if (response.success_count > 0) {
      emit('success', response)
    }
    
  } catch (error) {
    console.error('檔案操作失敗:', error)
    
    // 創建錯誤結果
    operationResult.value = {
      success_count: 0,
      failed_count: props.selectedFiles.length,
      success_files: [],
      failed_files: props.selectedFiles.map(file => ({
        original_id: file.id,
        file_name: file.name,
        error: '操作失敗：' + (error as Error).message,
        virtual_path: file.virtualPath || file.name
      })),
      total_count: props.selectedFiles.length
    }
  } finally {
    loading.value = false
  }
}

// 關閉對話框
const close = () => {
  if (!loading.value) {
    emit('close')
  }
}

// 關閉並刷新
const closeWithRefresh = () => {
  operationResult.value = null
  targetFolderId.value = null
  targetFolderPath.value = ''
  emit('close')
}

// 背景點擊處理
const handleBackdropClick = (e: Event) => {
  if (e.target === e.currentTarget) {
    close()
  }
}

// 監聽對話框顯示狀態
watch(() => props.isVisible, (visible) => {
  if (visible) {
    // 重置狀態
    operationResult.value = null
    targetFolderId.value = null
    targetFolderPath.value = ''
    loading.value = false
  }
})
</script>

<style scoped>
/* 玻璃化檔案操作模態框樣式 */
.glass-overlay {
  background: linear-gradient(135deg, 
    rgba(0, 0, 0, 0.4), 
    rgba(0, 0, 0, 0.6)
  );
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.glass-modal {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.9);
}

@media (prefers-color-scheme: dark) {
  .glass-modal {
    background: rgba(0, 0, 0, 0.8);
  }
}

/* 玻璃化滾動條樣式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

@media (prefers-color-scheme: dark) {
  .overflow-y-auto::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: rgba(107, 114, 128, 0.5);
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(107, 114, 128, 0.7);
  }
}

/* 響應式設計 */
@media (max-width: 640px) {
  .glass-modal {
    margin: 1rem;
    border-radius: 1rem;
  }
  
  .glass-modal > div {
    padding: 1rem;
  }
}

/* 減少動畫偏好設定 */
@media (prefers-reduced-motion: reduce) {
  .glass-modal,
  .glass-button {
    transition: none;
  }
}

/* 高對比度模式支援 */
@media (prefers-contrast: high) {
  .glass-modal {
    border: 2px solid theme('colors.gray.900');
    background: rgba(255, 255, 255, 1);
  }
  
  .glass-light {
    background: rgba(255, 255, 255, 1);
    border-color: theme('colors.gray.900');
  }
  
  @media (prefers-color-scheme: dark) {
    .glass-modal {
      background: rgba(0, 0, 0, 1);
      border-color: theme('colors.gray.100');
    }
    
    .glass-light {
      background: rgba(0, 0, 0, 1);
      border-color: theme('colors.gray.100');
    }
  }
}
</style>