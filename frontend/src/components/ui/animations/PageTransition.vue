<template>
  <transition
    :name="transitionName"
    @enter="onEnter"
    @leave="onLeave"
    @before-enter="onBeforeEnter"
    @after-enter="onAfterEnter"
  >
    <div
      v-if="show"
      :class="[
        'page-transition-container',
        containerClass,
        {
          'glass-optimized': enableGlassOptimization
        }
      ]"
    >
      <slot />
    </div>
  </transition>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'

interface Props {
  show?: boolean
  transitionName?: string
  containerClass?: string
  enableGlassOptimization?: boolean
  enableStaggerAnimation?: boolean
  staggerDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  transitionName: 'glass-page',
  containerClass: '',
  enableGlassOptimization: true,
  enableStaggerAnimation: false,
  staggerDelay: 50
})

interface Emits {
  enterStart: []
  enterEnd: []
  leaveStart: []
  leaveEnd: []
}

const emit = defineEmits<Emits>()

// 動畫事件處理
const onBeforeEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.opacity = '0'
  element.style.transform = 'translateY(20px) scale(0.98)'
  element.style.backdropFilter = 'blur(0px)'
  ;(element.style as any).webkitBackdropFilter = 'blur(0px)'
}

const onEnter = async (el: Element, done: () => void) => {
  emit('enterStart')
  const element = el as HTMLElement
  
  // 為了確保動畫順利執行，等待下一個 tick
  await nextTick()
  
  // 如果啟用交錯動畫，處理子元素
  if (props.enableStaggerAnimation) {
    const children = element.querySelectorAll('.glass-stagger-item')
    children.forEach((child, index) => {
      const childElement = child as HTMLElement
      childElement.style.animationDelay = `${index * props.staggerDelay}ms`
      childElement.classList.add('glass-fade-in')
    })
  }
  
  // 主要動畫
  element.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  element.style.opacity = '1'
  element.style.transform = 'translateY(0) scale(1)'
  element.style.backdropFilter = 'blur(8px)'
  ;(element.style as any).webkitBackdropFilter = 'blur(8px)'
  
  // 監聽動畫結束
  element.addEventListener('transitionend', () => {
    done()
  }, { once: true })
}

const onAfterEnter = () => {
  emit('enterEnd')
}

const onLeave = (el: Element, done: () => void) => {
  emit('leaveStart')
  const element = el as HTMLElement
  
  element.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  element.style.opacity = '0'
  element.style.transform = 'translateY(-10px) scale(1.02)'
  element.style.backdropFilter = 'blur(0px)'
  ;(element.style as any).webkitBackdropFilter = 'blur(0px)'
  
  element.addEventListener('transitionend', () => {
    emit('leaveEnd')
    done()
  }, { once: true })
}
</script>

<style scoped>
.page-transition-container {
  width: 100%;
  height: 100%;
}

/* 玻璃頁面進入動畫 */
.glass-page-enter-active,
.glass-page-leave-active {
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.glass-page-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.glass-page-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(1.02);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

/* 快速動畫變體 */
.glass-page-fast-enter-active,
.glass-page-fast-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.glass-page-fast-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.99);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.glass-page-fast-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(1.01);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

/* 彈跳動畫變體 */
.glass-page-bounce-enter-active {
  transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.glass-page-bounce-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.glass-page-bounce-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.8);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.glass-page-bounce-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(1.05);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

/* 滑動動畫變體 */
.glass-page-slide-enter-active,
.glass-page-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.glass-page-slide-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.glass-page-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(1.05);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

/* 減少動畫偏好設定 */
@media (prefers-reduced-motion: reduce) {
  .glass-page-enter-active,
  .glass-page-leave-active,
  .glass-page-fast-enter-active,
  .glass-page-fast-leave-active,
  .glass-page-bounce-enter-active,
  .glass-page-bounce-leave-active,
  .glass-page-slide-enter-active,
  .glass-page-slide-leave-active {
    transition: none !important;
  }
  
  .glass-page-enter-from,
  .glass-page-fast-enter-from,
  .glass-page-bounce-enter-from,
  .glass-page-slide-enter-from,
  .glass-page-leave-to,
  .glass-page-fast-leave-to,
  .glass-page-bounce-leave-to,
  .glass-page-slide-leave-to {
    opacity: 1 !important;
    transform: none !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
  }
  
  .page-transition-container {
    transition: none !important;
  }
}

/* 移動端優化 */
@media (max-width: 768px) {
  .glass-page-enter-active,
  .glass-page-leave-active {
    transition-duration: 0.3s;
  }
  
  .glass-page-bounce-enter-active {
    transition-duration: 0.4s;
    transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  .glass-page-enter-from,
  .glass-page-fast-enter-from,
  .glass-page-bounce-enter-from,
  .glass-page-slide-enter-from {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
}
</style>