<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    @click="handleBackdropClick"
  >
    <div
      class="relative w-full max-w-md mx-4 rounded-lg shadow-xl transform transition-all"
      :style="{ backgroundColor: 'var(--bg-elevated)' }"
      @click.stop
    >
      <!-- 標題列 -->
      <div class="flex items-center justify-between p-6 border-b" :style="{ borderColor: 'var(--border-light)' }">
        <h2 class="text-xl font-semibold" :style="{ color: 'var(--text-primary)' }">
          新增資料夾
        </h2>
        <button
          @click="close"
          class="transition-colors"
          :style="{ color: 'var(--text-tertiary)' }"
          @mouseenter="$event.target.style.color = 'var(--text-secondary)'"
          @mouseleave="$event.target.style.color = 'var(--text-tertiary)'"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- 內容區域 -->
      <div class="p-6">
        <div class="mb-4">
          <label for="folderName" class="block text-sm font-medium mb-2" :style="{ color: 'var(--text-secondary)' }">
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
              error ? 'border-red-300 focus:ring-red-500' : 'focus:ring-blue-500'
            ]"
            :style="{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              borderColor: error ? '#f87171' : 'var(--border-medium)'
            }"
            @keyup.enter="createFolder"
            @input="clearError"
          />
        </div>

        <!-- 錯誤訊息 -->
        <div v-if="error" class="mb-4 p-3 border rounded-md" :style="{ backgroundColor: 'rgb(254 242 242)', borderColor: 'rgb(252 165 165)' }">
          <div class="flex items-center">
            <ExclamationTriangleIcon class="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <span class="text-sm" :style="{ color: 'rgb(153 27 27)' }">{{ error }}</span>
          </div>
        </div>

        <!-- 提示文字 -->
        <div class="text-sm" :style="{ color: 'var(--text-tertiary)' }">
          資料夾名稱不能包含以下字符：\ / : * ? " &lt; &gt; |
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex items-center justify-end space-x-3 p-6 border-t" :style="{ borderColor: 'var(--border-light)' }">
        <button
          @click="close"
          :disabled="creating"
          class="px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          :style="{
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-secondary)'
          }"
          @mouseenter="$event.target.style.backgroundColor = 'var(--bg-tertiary)'"
          @mouseleave="$event.target.style.backgroundColor = 'var(--bg-secondary)'"
        >
          取消
        </button>
        <button
          @click="createFolder"
          :disabled="!folderName.trim() || creating"
          class="px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50"
          :style="{
            backgroundColor: 'var(--color-primary)'
          }"
          @mouseenter="$event.target.style.backgroundColor = 'var(--color-primary-dark)'"
          @mouseleave="$event.target.style.backgroundColor = 'var(--color-primary)'"
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
    // 直接使用從 store 傳遞過來的錯誤訊息
    error.value = err.message || '建立資料夾失敗'
  } finally {
    creating.value = false
  }
}
</script>
