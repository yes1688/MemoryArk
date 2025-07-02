<template>
  <Transition
    name="glass-modal"
    @enter="onModalEnter"
    @leave="onModalLeave"
  >
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center glass-overlay glass-fade-in backdrop-blur-glass-xl p-4"
      @click="handleBackdropClick"
    >
      <div
        class="relative w-full max-w-2xl max-h-[90vh] flex flex-col glass-modal glass-scale-in glass-optimized rounded-2xl shadow-glass-2xl transform transition-all duration-300 ease-glass border border-glass-border-strong"
        @click.stop
      >
      <!-- 玻璃化標題列 -->
      <div class="flex items-center justify-between p-6 border-b border-glass-border glass-shimmer-subtle">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          上傳檔案
        </h2>
        <button
          @click="close"
          class="glass-button glass-hover-enhance glass-ripple p-2 rounded-lg transition-all duration-200 ease-glass text-gray-600 dark:text-gray-400"
          @mousedown="handleRippleEffect"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- 內容區域 - 使用統一上傳組件 -->
      <div class="flex-1 overflow-y-auto p-6">
        <UnifiedUploader
          ref="uploader"
          :parent-id="currentFolderId"
          :support-folder="true"
          :auto-upload="false"
          :hide-actions="false"
          :show-metadata-form="true"
          @upload-complete="handleUploadComplete"
          @error="handleError"
          @cancel="close"
          @upload-status="uploading = $event"
        />
      </div>

      <!-- 玻璃化底部操作區 -->
      <div class="flex items-center justify-end p-6 border-t border-glass-border glass-light glass-shimmer-subtle">
        <button
          @click="close"
          :disabled="uploading"
          class="glass-button glass-hover-enhance glass-ripple px-4 py-2 rounded-lg transition-all duration-200 ease-glass disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
          @mousedown="handleRippleEffect"
        >
          關閉
        </button>
      </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { XMarkIcon, CloudArrowUpIcon } from '@heroicons/vue/24/outline'
import UnifiedUploader from '@/components/ui/upload/UnifiedUploader.vue'
import type { UnifiedUploadResult } from '@/services/unifiedUploadService'

interface Props {
  isVisible: boolean
  currentFolderId?: number
}

interface Emits {
  (e: 'close'): void
  (e: 'uploaded'): void
  (e: 'upload-complete', results: UnifiedUploadResult[]): void
}

const props = withDefaults(defineProps<Props>(), {
  currentFolderId: undefined
})

const emit = defineEmits<Emits>()

// 狀態
const uploading = ref(false)

// 關閉模態窗口
const close = () => {
  if (!uploading.value) {
    emit('close')
  }
}

// 背景點擊關閉
const handleBackdropClick = () => {
  close()
}

// 處理上傳完成
const handleUploadComplete = (results: UnifiedUploadResult[]) => {
  uploading.value = false
  emit('uploaded')
  emit('upload-complete', results)
  close()
}

// 處理錯誤
const handleError = (error: string) => {
  console.error('上傳錯誤:', error)
}

// Modal 動畫事件處理
const onModalEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.opacity = '0'
  element.style.transform = 'scale(0.9)'
  element.style.backdropFilter = 'blur(0px)'
  
  setTimeout(() => {
    element.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    element.style.opacity = '1'
    element.style.transform = 'scale(1)'
    element.style.backdropFilter = 'blur(16px)'
  }, 10)
}

const onModalLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.transition = 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  element.style.opacity = '0'
  element.style.transform = 'scale(0.95)'
  element.style.backdropFilter = 'blur(0px)'
}

// 水波紋效果處理
const handleRippleEffect = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const ripple = document.createElement('div')
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2
  
  ripple.classList.add('glass-ripple-effect')
  ripple.style.width = ripple.style.height = size + 'px'
  ripple.style.left = x + 'px'
  ripple.style.top = y + 'px'
  
  // 確保按鈕具有 relative positioning
  const computedStyle = window.getComputedStyle(target)
  if (computedStyle.position === 'static') {
    target.style.position = 'relative'
  }
  target.style.overflow = 'hidden'
  
  target.appendChild(ripple)
  
  // 動畫結束後移除元素
  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple)
    }
  }, 600)
}
</script>

<style scoped>
/* 玻璃化上傳模態框樣式 */
.glass-overlay {
  background: linear-gradient(135deg, 
    rgba(0, 0, 0, 0.4), 
    rgba(0, 0, 0, 0.6)
  );
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

/* Modal 動畫效果 */
.glass-modal-enter-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.glass-modal-leave-active {
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.glass-modal-enter-from {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.glass-modal-enter-from .glass-modal {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

.glass-modal-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.glass-modal-leave-to .glass-modal {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
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

/* 響應式設計 */
@media (max-width: 768px) {
  .glass-modal {
    margin: 1rem;
    max-width: calc(100vw - 2rem);
    border-radius: 1rem;
  }
  
  .glass-modal > div {
    padding: 1rem;
  }
}

/* 減少動畫偏好設定 */
@media (prefers-reduced-motion: reduce) {
  .glass-modal {
    transition: none;
  }
  
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
  
  @media (prefers-color-scheme: dark) {
    .glass-modal {
      background: rgba(0, 0, 0, 1);
      border-color: theme('colors.gray.100');
    }
  }
}
</style>
