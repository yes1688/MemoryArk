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
        class="dialog-overlay"
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
              class="dialog-close"
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

// Dialog classes
const dialogClasses = computed(() => {
  const baseClasses = [
    'dialog-content',
    'relative',
    'rounded-win11-xl',
    'shadow-xl',
    'transform',
    'transition-all',
    'duration-300',
    'ease-out',
    'max-h-[90vh]',
    'overflow-hidden',
    'flex',
    'flex-col'
  ]

  const sizeClasses = {
    small: ['w-full', 'max-w-md'],
    medium: ['w-full', 'max-w-lg'],
    large: ['w-full', 'max-w-2xl'],
    xlarge: ['w-full', 'max-w-4xl'],
    fullscreen: ['w-full', 'h-full', 'max-w-none', 'max-h-none', 'rounded-none']
  }

  const variantClasses = {
    default: [],
    danger: ['border-l-4', 'border-red-500'],
    warning: ['border-l-4', 'border-yellow-500'],
    success: ['border-l-4', 'border-green-500']
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
.dialog-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center p-4;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

.dialog-content {
  @apply animate-scale-in;
  background: var(--bg-elevated);
}

.dialog-header {
  @apply flex items-center justify-between p-6;
  border-bottom: 1px solid var(--border-light);
}

.dialog-title {
  @apply text-lg font-semibold leading-6;
  color: var(--text-primary);
}

.dialog-close {
  @apply p-2 focus:outline-none transition-colors duration-200 rounded-md;
  color: var(--text-tertiary);
}

.dialog-close:hover {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.dialog-body {
  @apply flex-1 p-6 overflow-y-auto;
}

.dialog-footer {
  @apply p-6;
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.dialog-actions {
  @apply flex justify-end space-x-3;
}

/* Transition classes */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-active .dialog-content,
.dialog-leave-active .dialog-content {
  transition: all 0.3s ease;
}

.dialog-enter-from .dialog-content,
.dialog-leave-to .dialog-content {
  transform: scale(0.9) translateY(-10px);
  opacity: 0;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .dialog-overlay {
    @apply p-2;
  }
  
  .dialog-content {
    @apply w-full max-w-none;
  }
  
  .dialog-header,
  .dialog-body,
  .dialog-footer {
    @apply p-4;
  }
}
</style>