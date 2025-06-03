<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    @click="handleBackdropClick"
  >
    <div
      class="relative w-full max-w-md mx-4 bg-white rounded-lg shadow-xl transform transition-all"
      @click.stop
    >
      <!-- 標題列 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">
          新增資料夾
        </h2>
        <button
          @click="close"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- 內容區域 -->
      <div class="p-6">
        <div class="mb-4">
          <label for="folderName" class="block text-sm font-medium text-gray-700 mb-2">
            資料夾名稱
          </label>
          <input
            id="folderName"
            ref="nameInput"
            v-model="folderName"
            type="text"
            placeholder="請輸入資料夾名稱"
            :class="[
              'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors',
              error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            ]"
            @keyup.enter="createFolder"
            @input="clearError"
          />
        </div>

        <!-- 錯誤訊息 -->
        <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div class="flex items-center">
            <ExclamationTriangleIcon class="w-5 h-5 text-red-600 mr-2" />
            <span class="text-sm text-red-800">{{ error }}</span>
          </div>
        </div>

        <!-- 提示文字 -->
        <div class="text-sm text-gray-500">
          資料夾名稱不能包含以下字符：\ / : * ? " &lt; &gt; |
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
        <button
          @click="close"
          :disabled="creating"
          class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          取消
        </button>
        <button
          @click="createFolder"
          :disabled="!folderName.trim() || creating"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {{ creating ? '建立中...' : '建立' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { useFilesStore } from '@/stores/files'

interface Props {
  isVisible: boolean
  currentFolderId?: number
}

interface Emits {
  (e: 'close'): void
  (e: 'created', folderId: number): void
}

const props = withDefaults(defineProps<Props>(), {
  currentFolderId: undefined
})

const emit = defineEmits<Emits>()

const filesStore = useFilesStore()

// 狀態
const folderName = ref('')
const creating = ref(false)
const error = ref('')

// 元素引用
const nameInput = ref<HTMLInputElement>()

// 監聽模態窗口顯示，自動聚焦輸入框
watch(() => props.isVisible, (visible) => {
  if (visible) {
    nextTick(() => {
      nameInput.value?.focus()
    })
  }
})

// 關閉模態窗口
const close = () => {
  if (!creating.value) {
    folderName.value = ''
    error.value = ''
    emit('close')
  }
}

// 背景點擊關閉
const handleBackdropClick = () => {
  close()
}

// 清除錯誤
const clearError = () => {
  error.value = ''
}

// 驗證資料夾名稱
const validateFolderName = (name: string): string | null => {
  const trimmedName = name.trim()
  
  if (!trimmedName) {
    return '請輸入資料夾名稱'
  }
  
  if (trimmedName.length > 255) {
    return '資料夾名稱不能超過 255 個字符'
  }
  
  // 檢查不允許的字符
  const invalidChars = /[\\/:*?"<>|]/
  if (invalidChars.test(trimmedName)) {
    return '資料夾名稱包含無效字符'
  }
  
  // 檢查是否為保留名稱
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  if (reservedNames.includes(trimmedName.toUpperCase())) {
    return '不能使用系統保留名稱'
  }
  
  // 檢查是否以點或空格結尾
  if (trimmedName.endsWith('.') || trimmedName.endsWith(' ')) {
    return '資料夾名稱不能以點或空格結尾'
  }
  
  return null
}

// 建立資料夾
const createFolder = async () => {
  const trimmedName = folderName.value.trim()
  
  // 驗證名稱
  const validationError = validateFolderName(trimmedName)
  if (validationError) {
    error.value = validationError
    return
  }
  
  creating.value = true
  error.value = ''
  
  try {
    const newFolder = await filesStore.createFolder(trimmedName, props.currentFolderId)
    emit('created', newFolder.id)
    close()
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      error.value = '此位置已存在同名資料夾'
    } else if (err.message.includes('permission')) {
      error.value = '您沒有在此位置建立資料夾的權限'
    } else {
      error.value = err.message || '建立資料夾失敗'
    }
  } finally {
    creating.value = false
  }
}
</script>
