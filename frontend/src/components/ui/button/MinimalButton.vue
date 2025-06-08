<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  disabled?: boolean
  loading?: boolean
  iconOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  fullWidth: false,
  disabled: false,
  loading: false,
  iconOnly: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

// 計算按鈕類名
const buttonClasses = computed(() => {
  const base = 'minimal-button relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  // 變體樣式
  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500'
  }
  
  // 尺寸樣式
  const sizes = {
    small: props.iconOnly ? 'p-2' : 'px-3 py-1.5 text-sm',
    medium: props.iconOnly ? 'p-2.5' : 'px-4 py-2 text-base',
    large: props.iconOnly ? 'p-3' : 'px-6 py-3 text-lg'
  }
  
  // 圓角樣式
  const radius = props.iconOnly ? 'rounded-full' : 'rounded-lg'
  
  // 寬度樣式
  const width = props.fullWidth ? 'w-full' : ''
  
  // 禁用樣式
  const disabled = props.disabled || props.loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
  
  return [
    base,
    variants[props.variant],
    sizes[props.size],
    radius,
    width,
    disabled
  ].filter(Boolean).join(' ')
})

// 處理點擊事件
const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  
  // 創建漣漪效果
  createRipple(event)
  emit('click', event)
}

// 漣漪效果
const createRipple = (event: MouseEvent) => {
  const button = event.currentTarget as HTMLElement
  const ripple = document.createElement('span')
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2
  
  ripple.style.width = ripple.style.height = size + 'px'
  ripple.style.left = x + 'px'
  ripple.style.top = y + 'px'
  ripple.classList.add('ripple')
  
  button.appendChild(ripple)
  
  setTimeout(() => {
    ripple.remove()
  }, 600)
}
</script>

<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
    v-bind="$attrs"
  >
    <!-- 載入動畫 -->
    <span v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>
    
    <!-- 按鈕內容 -->
    <span :class="{ 'opacity-0': loading }" class="flex items-center space-x-2">
      <slot name="icon-left" />
      <span v-if="!iconOnly && $slots.default">
        <slot />
      </span>
      <slot name="icon-right" />
    </span>
  </button>
</template>

<style scoped>
/* 漣漪效果 */
.minimal-button {
  position: relative;
  overflow: hidden;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: scale(0);
  animation: ripple-animation 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* 按鈕懸停效果 */
.minimal-button {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.minimal-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
}

.minimal-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* 聚焦樣式 */
.minimal-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

/* 過渡動畫 */
.minimal-button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 深色模式支援 */
@media (prefers-color-scheme: dark) {
  .minimal-button.bg-white {
    background: var(--color-gray-800);
    color: var(--color-gray-100);
    border-color: var(--color-gray-600);
  }
  
  .minimal-button.bg-white:hover {
    background: var(--color-gray-700);
  }
  
  .minimal-button.bg-transparent:hover {
    background: var(--color-gray-800);
  }
}
</style>