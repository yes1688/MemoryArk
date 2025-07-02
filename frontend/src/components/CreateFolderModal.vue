<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center glass-overlay backdrop-blur-glass-xl"
    @click="handleBackdropClick"
  >
    <div
      class="relative w-full max-w-md mx-4 glass-modal rounded-2xl shadow-glass-2xl transform transition-all duration-300 ease-glass border border-glass-border-strong"
      @click.stop
    >
      <!-- 玻璃化標題列 -->
      <div class="flex items-center justify-between p-6 border-b border-glass-border">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          新增資料夾
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
        <div class="mb-4">
          <label for="folderName" class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            資料夾名稱
          </label>
          <input
            id="folderName"
            ref="nameInput"
            v-model="folderName"
            type="text"
            placeholder="請輸入資料夾名稱"
            :class="[
              'glass-input w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ease-glass backdrop-blur-glass-sm',
              error ? 'border-red-400/60 focus:ring-red-500/50 glass-light' : 'border-glass-border focus:ring-blue-500/50 hover:glass-light focus:glass-medium'
            ]"
            @keyup.enter="createFolder"
            @input="clearError"
          />
        </div>

        <!-- 玻璃化錯誤訊息 -->
        <div v-if="error" class="mb-4 p-3 glass-light border border-red-400/60 rounded-lg bg-red-50/80 dark:bg-red-900/20">
          <div class="flex items-center">
            <ExclamationTriangleIcon class="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <span class="text-sm text-red-700 dark:text-red-300">{{ error }}</span>
          </div>
        </div>

        <!-- 玻璃化提示文字 -->
        <div class="text-sm text-gray-500 dark:text-gray-400">
          資料夾名稱不能包含以下字符：\ / : * ? " &lt; &gt; |
        </div>
      </div>

      <!-- 玻璃化操作按鈕 -->
      <div class="flex items-center justify-end space-x-3 p-6 border-t border-glass-border glass-light">
        <button
          @click="close"
          :disabled="creating"
          class="glass-button px-4 py-2 rounded-lg transition-all duration-200 ease-glass hover:glass-medium active:glass-heavy disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="createFolder"
          :disabled="!folderName.trim() || creating"
          class="glass-button px-4 py-2 text-white rounded-lg transition-all duration-200 ease-glass hover:glass-medium active:glass-heavy disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500/80 hover:bg-blue-600/80 border border-blue-400/60"
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

<style scoped>
/* 玻璃化資料夾創建模態框樣式 */
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

/* 玻璃化輸入框樣式 */
.glass-input {
  background: rgba(255, 255, 255, 0.7);
  color: theme('colors.gray.900');
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

@media (prefers-color-scheme: dark) {
  .glass-input {
    background: rgba(0, 0, 0, 0.5);
    color: theme('colors.gray.100');
  }
}

.glass-input::placeholder {
  color: theme('colors.gray.500');
}

@media (prefers-color-scheme: dark) {
  .glass-input::placeholder {
    color: theme('colors.gray.400');
  }
}

.glass-input:focus {
  background: rgba(255, 255, 255, 0.9);
}

@media (prefers-color-scheme: dark) {
  .glass-input:focus {
    background: rgba(0, 0, 0, 0.7);
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
  .glass-button,
  .glass-input {
    transition: none;
  }
}

/* 高對比度模式支援 */
@media (prefers-contrast: high) {
  .glass-modal {
    border: 2px solid theme('colors.gray.900');
    background: rgba(255, 255, 255, 1);
  }
  
  .glass-input {
    border: 2px solid theme('colors.gray.900');
    background: rgba(255, 255, 255, 1);
  }
  
  @media (prefers-color-scheme: dark) {
    .glass-modal {
      background: rgba(0, 0, 0, 1);
      border-color: theme('colors.gray.100');
    }
    
    .glass-input {
      background: rgba(0, 0, 0, 1);
      border-color: theme('colors.gray.100');
    }
  }
}
</style>
