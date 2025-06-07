<template>
  <div 
    ref="container"
    class="ripple-container"
    :class="{ 'ripple-disabled': disabled }"
    @click="createRipple"
    @touchstart="createRipple"
  >
    <slot />
    
    <!-- 波紋元素 -->
    <span
      v-for="ripple in ripples"
      :key="ripple.id"
      class="ripple"
      :class="[`ripple-${color}`, { 'ripple-centered': centered }]"
      :style="{
        left: ripple.x + 'px',
        top: ripple.y + 'px',
        width: ripple.size + 'px',
        height: ripple.size + 'px',
        animationDuration: duration + 'ms'
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

interface Props {
  color?: 'light' | 'dark' | 'primary' | 'secondary'
  duration?: number
  disabled?: boolean
  centered?: boolean
  unbounded?: boolean
}

interface Emits {
  (e: 'ripple-start', event: MouseEvent | TouchEvent): void
  (e: 'ripple-end', rippleId: number): void
}

const props = withDefaults(defineProps<Props>(), {
  color: 'light',
  duration: 600,
  disabled: false,
  centered: false,
  unbounded: false
})

const emit = defineEmits<Emits>()

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

const container = ref<HTMLElement>()
const ripples = ref<Ripple[]>([])
let nextId = 0

const createRipple = async (event: MouseEvent | TouchEvent) => {
  if (props.disabled) return
  
  const el = container.value
  if (!el) return
  
  // 觸發事件
  emit('ripple-start', event)
  
  const rect = el.getBoundingClientRect()
  
  // 獲取點擊座標
  let clientX: number, clientY: number
  
  if (event instanceof TouchEvent) {
    clientX = event.touches[0]?.clientX || event.changedTouches[0]?.clientX || rect.left + rect.width / 2
    clientY = event.touches[0]?.clientY || event.changedTouches[0]?.clientY || rect.top + rect.height / 2
  } else {
    clientX = event.clientX
    clientY = event.clientY
  }
  
  // 計算波紋大小
  const size = props.unbounded 
    ? Math.max(rect.width, rect.height) * 2.5
    : Math.sqrt(Math.pow(rect.width, 2) + Math.pow(rect.height, 2)) * 2
  
  // 計算波紋位置
  let x: number, y: number
  
  if (props.centered) {
    x = rect.width / 2 - size / 2
    y = rect.height / 2 - size / 2
  } else {
    x = clientX - rect.left - size / 2
    y = clientY - rect.top - size / 2
  }
  
  const ripple: Ripple = {
    id: nextId++,
    x,
    y,
    size
  }
  
  ripples.value.push(ripple)
  
  // 等待下一個渲染週期，確保 DOM 已更新
  await nextTick()
  
  // 移除波紋
  setTimeout(() => {
    const index = ripples.value.findIndex(r => r.id === ripple.id)
    if (index > -1) {
      ripples.value.splice(index, 1)
      emit('ripple-end', ripple.id)
    }
  }, props.duration)
}

// 提供給父組件的方法
const triggerRipple = (clientX?: number, clientY?: number) => {
  if (props.disabled) return
  
  const el = container.value
  if (!el) return
  
  const rect = el.getBoundingClientRect()
  
  // 創建模擬事件
  const mockEvent = new MouseEvent('click', {
    clientX: clientX ?? rect.left + rect.width / 2,
    clientY: clientY ?? rect.top + rect.height / 2,
    bubbles: true,
    cancelable: true
  })
  
  createRipple(mockEvent)
}

// 清除所有波紋
const clearRipples = () => {
  ripples.value = []
}

defineExpose({
  triggerRipple,
  clearRipples
})
</script>

<style scoped>
.ripple-container {
  position: relative;
  overflow: hidden;
  transform: translate3d(0, 0, 0); /* 啟用硬體加速 */
}

.ripple-container.ripple-disabled {
  overflow: visible;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: ripple-animation var(--duration, 600ms) ease-out;
  pointer-events: none;
  opacity: 0.3;
}

.ripple-centered {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
}

/* 顏色變體 */
.ripple-light {
  background: rgba(255, 255, 255, 0.4);
}

.ripple-dark {
  background: rgba(0, 0, 0, 0.2);
}

.ripple-primary {
  background: rgba(59, 130, 246, 0.3);
}

.ripple-secondary {
  background: rgba(245, 158, 11, 0.3);
}

/* 深色模式適配 */
.dark .ripple-light {
  background: rgba(255, 255, 255, 0.1);
}

.dark .ripple-dark {
  background: rgba(255, 255, 255, 0.2);
}

.dark .ripple-primary {
  background: rgba(59, 130, 246, 0.4);
}

.dark .ripple-secondary {
  background: rgba(245, 158, 11, 0.4);
}

/* 波紋動畫 */
@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* 置中波紋動畫 */
.ripple-centered {
  animation: ripple-centered-animation var(--duration, 600ms) ease-out;
}

@keyframes ripple-centered-animation {
  to {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
  }
}

/* 無邊界波紋 */
.ripple-container:not(.ripple-disabled) {
  -webkit-mask-image: radial-gradient(circle, white 100%, black 100%);
}

/* 改進的波紋效果 */
.ripple {
  will-change: transform, opacity;
  backface-visibility: hidden;
}

/* 觸控優化 */
@media (hover: none) and (pointer: coarse) {
  .ripple {
    animation-duration: 300ms;
  }
}

/* 無障礙 - 減少動畫 */
@media (prefers-reduced-motion: reduce) {
  .ripple {
    animation-duration: 1ms !important;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(1);
      opacity: 0.1;
    }
  }
  
  @keyframes ripple-centered-animation {
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.1;
    }
  }
}

/* 高對比度模式 */
@media (prefers-contrast: high) {
  .ripple-light {
    background: rgba(255, 255, 255, 0.8);
  }
  
  .ripple-dark {
    background: rgba(0, 0, 0, 0.6);
  }
}

/* 效能優化 */
.ripple-container {
  isolation: isolate;
}

.ripple {
  contain: strict;
}

/* 按鈕特定樣式 */
.ripple-container button,
.ripple-container a,
.ripple-container [role="button"] {
  position: relative;
  z-index: 1;
}

/* 卡片特定樣式 */
.ripple-container.card {
  border-radius: inherit;
}

.ripple-container.card .ripple {
  border-radius: inherit;
}

/* 圓形按鈕優化 */
.ripple-container.rounded-full .ripple {
  border-radius: 50%;
}

/* 快速點擊優化 */
.ripple-container:active .ripple {
  animation-duration: 300ms;
}
</style>