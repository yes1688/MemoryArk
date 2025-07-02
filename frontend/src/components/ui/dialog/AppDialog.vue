<template>
  <Teleport to="body">
    <Transition
      name="dialog"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="visible"
        class="dialog-overlay glass-overlay backdrop-blur-glass-lg"
        @click="handleOverlayClick"
        @keydown.esc="handleEscape"
      >
        <div
          ref="dialogRef"
          :class="dialogClasses"
          role="dialog"
          :aria-modal="true"
          :aria-labelledby="headerId"
          :aria-describedby="bodyId"
          @click.stop
        >
          <!-- Header -->
          <div v-if="$slots.header || title" :id="headerId" class="dialog-header">
            <slot name="header">
              <h2 class="dialog-title">{{ title }}</h2>
            </slot>
            
            <button
              v-if="closable"
              type="button"
              class="dialog-close glass-button transition-all duration-200 ease-glass hover:glass-medium active:glass-heavy"
              @click="handleClose"
              aria-label="關閉對話框"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div :id="bodyId" class="dialog-body">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer || showDefaultActions" class="dialog-footer">
            <slot name="footer">
              <div v-if="showDefaultActions" class="dialog-actions">
                <AppButton
                  v-if="showCancel"
                  variant="secondary"
                  @click="handleCancel"
                >
                  {{ cancelText }}
                </AppButton>
                <AppButton
                  :variant="confirmVariant"
                  :loading="loading"
                  @click="handleConfirm"
                >
                  {{ confirmText }}
                </AppButton>
              </div>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import AppButton from '../button/AppButton.vue'

interface Props {
  visible?: boolean
  title?: string
  closable?: boolean
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'fullscreen'
  variant?: 'default' | 'danger' | 'warning' | 'success'
  showDefaultActions?: boolean
  showCancel?: boolean
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  persistent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  closable: true,
  closeOnOverlay: true,
  closeOnEscape: true,
  size: 'medium',
  variant: 'default',
  showDefaultActions: false,
  showCancel: true,
  confirmText: '確認',
  cancelText: '取消',
  confirmVariant: 'primary',
  loading: false,
  persistent: false
})

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  close: []
  confirm: []
  cancel: []
}>()

const dialogRef = ref<HTMLElement>()

// Generate unique IDs
const headerId = computed(() => `dialog-header-${Math.random().toString(36).substr(2, 9)}`)
const bodyId = computed(() => `dialog-body-${Math.random().toString(36).substr(2, 9)}`)

// 玻璃化對話框類別
const dialogClasses = computed(() => {
  const baseClasses = [
    'dialog-content',
    'glass-modal',
    'relative',
    'rounded-2xl',
    'shadow-glass-2xl',
    'transform',
    'transition-all',
    'duration-300',
    'ease-glass',
    'max-h-[90vh]',
    'overflow-hidden',
    'flex',
    'flex-col',
    'border',
    'border-glass-border-strong'
  ]

  const sizeClasses = {
    small: ['w-full', 'max-w-md'],
    medium: ['w-full', 'max-w-lg'],
    large: ['w-full', 'max-w-2xl'],
    xlarge: ['w-full', 'max-w-4xl'],
    fullscreen: ['w-full', 'h-full', 'max-w-none', 'max-h-none', 'rounded-none', 'glass-heavy']
  }

  const variantClasses = {
    default: ['glass-heavy'],
    danger: ['glass-heavy', 'border-l-4', 'border-red-500/70', 'shadow-red-500/20'],
    warning: ['glass-heavy', 'border-l-4', 'border-yellow-500/70', 'shadow-yellow-500/20'],
    success: ['glass-heavy', 'border-l-4', 'border-green-500/70', 'shadow-green-500/20']
  }

  return [
    ...baseClasses,
    ...sizeClasses[props.size],
    ...variantClasses[props.variant]
  ]
})

// Event handlers
const handleClose = () => {
  if (!props.persistent) {
    emit('update:visible', false)
    emit('close')
  }
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay && !props.persistent) {
    handleClose()
  }
}

const handleEscape = () => {
  if (props.closeOnEscape && !props.persistent) {
    handleClose()
  }
}

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  if (!props.persistent) {
    handleClose()
  }
}

// Transition handlers
const onBeforeEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.opacity = '0'
  element.style.transform = 'scale(0.9) translateY(-10px)'
}

const onEnter = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  element.offsetHeight // Force reflow
  element.style.transition = 'all 0.3s ease-out'
  element.style.opacity = '1'
  element.style.transform = 'scale(1) translateY(0)'
  setTimeout(done, 300)
}

const onLeave = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  element.style.transition = 'all 0.2s ease-in'
  element.style.opacity = '0'
  element.style.transform = 'scale(0.95) translateY(-5px)'
  setTimeout(done, 200)
}

// Focus management
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await nextTick()
    // Focus the first focusable element or the dialog itself
    const focusableElements = dialogRef.value?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus()
    } else {
      dialogRef.value?.focus()
    }
  }
})

// Body scroll lock
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
/* 玻璃化對話框樣式 */
.dialog-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center p-4;
  background: linear-gradient(135deg, 
    rgba(0, 0, 0, 0.4), 
    rgba(0, 0, 0, 0.6)
  );
  /* 玻璃遮罩效果由類別提供 */
}

.glass-overlay {
  /* 增強背景模糊效果 */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.dialog-content {
  /* 玻璃模態框效果由類別提供 */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.dialog-header {
  @apply flex items-center justify-between p-6;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05)
  );
}

@media (prefers-color-scheme: dark) {
  .dialog-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.dialog-title {
  @apply text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100;
}

.dialog-close {
  @apply p-2 focus:outline-none rounded-lg;
  color: theme('colors.gray.600');
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (prefers-color-scheme: dark) {
  .dialog-close {
    color: theme('colors.gray.400');
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.dialog-close:hover {
  color: theme('colors.gray.900');
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

@media (prefers-color-scheme: dark) {
  .dialog-close:hover {
    color: theme('colors.gray.100');
  }
}

.dialog-close:active {
  transform: scale(0.95);
}

.dialog-body {
  @apply flex-1 p-6 overflow-y-auto;
  color: theme('colors.gray.700');
}

@media (prefers-color-scheme: dark) {
  .dialog-body {
    color: theme('colors.gray.300');
  }
}

.dialog-footer {
  @apply p-6;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.05), 
    rgba(255, 255, 255, 0.02)
  );
}

@media (prefers-color-scheme: dark) {
  .dialog-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.dialog-actions {
  @apply flex justify-end space-x-3;
}

/* 玻璃化過渡動畫 */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-active .dialog-content,
.dialog-leave-active .dialog-content {
  transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.dialog-enter-from .dialog-content,
.dialog-leave-to .dialog-content {
  transform: scale(0.9) translateY(-10px);
  opacity: 0;
}

/* 響應式調整 */
@media (max-width: 640px) {
  .dialog-overlay {
    @apply p-2;
  }
  
  .dialog-content {
    @apply w-full max-w-none;
    border-radius: 1rem; /* 減少圓角半徑 */
  }
  
  .dialog-header,
  .dialog-body,
  .dialog-footer {
    @apply p-4;
  }
  
  .dialog-title {
    @apply text-base;
  }
}

/* 減少動畫偏好設定 */
@media (prefers-reduced-motion: reduce) {
  .dialog-enter-active,
  .dialog-leave-active,
  .dialog-enter-active .dialog-content,
  .dialog-leave-active .dialog-content {
    transition: none;
  }
  
  .dialog-close {
    transition: none;
  }
  
  .dialog-close:hover,
  .dialog-close:active {
    transform: none;
  }
}

/* 高對比度模式支援 */
@media (prefers-contrast: high) {
  .dialog-content {
    border: 2px solid theme('colors.gray.900');
  }
  
  .dialog-header,
  .dialog-footer {
    border-color: theme('colors.gray.900');
  }
  
  .dialog-close {
    border-color: theme('colors.gray.900');
  }
}
</style>