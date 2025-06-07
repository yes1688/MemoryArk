<template>
  <Transition
    :name="transitionName"
    :duration="duration"
    @before-enter="beforeEnter"
    @enter="enter"
    @leave="leave"
    @after-enter="afterEnter"
    @after-leave="afterLeave"
  >
    <slot />
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue'

interface Props {
  direction?: 'left' | 'right' | 'up' | 'down'
  duration?: number
  distance?: number
  appear?: boolean
}

interface Emits {
  (e: 'before-enter', el: Element): void
  (e: 'enter', el: Element): void
  (e: 'after-enter', el: Element): void
  (e: 'before-leave', el: Element): void
  (e: 'leave', el: Element): void
  (e: 'after-leave', el: Element): void
}

const props = withDefaults(defineProps<Props>(), {
  direction: 'left',
  duration: 300,
  distance: 30,
  appear: false
})

const emit = defineEmits<Emits>()

const transitionName = computed(() => `slide-${props.direction}`)

const getTranslateValue = () => {
  const { direction, distance } = props
  switch (direction) {
    case 'left':
      return `translateX(${distance}px)`
    case 'right':
      return `translateX(-${distance}px)`
    case 'up':
      return `translateY(${distance}px)`
    case 'down':
      return `translateY(-${distance}px)`
    default:
      return `translateX(${distance}px)`
  }
}

const beforeEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.opacity = '0'
  element.style.transform = getTranslateValue()
  element.style.transition = 'none'
  
  emit('before-enter', el)
}

const enter = async (el: Element, done: () => void) => {
  const element = el as HTMLElement
  
  // 強制重排
  await nextTick()
  element.offsetHeight
  
  // 設置過渡
  element.style.transition = `all ${props.duration}ms var(--ease-win11, cubic-bezier(0.25, 0.46, 0.45, 0.94))`
  element.style.opacity = '1'
  element.style.transform = 'translate(0, 0)'
  
  emit('enter', el)
  
  setTimeout(() => {
    done()
  }, props.duration)
}

const leave = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  
  const leaveTransform = (() => {
    const { direction, distance } = props
    switch (direction) {
      case 'left':
        return `translateX(-${distance}px)`
      case 'right':
        return `translateX(${distance}px)`
      case 'up':
        return `translateY(-${distance}px)`
      case 'down':
        return `translateY(${distance}px)`
      default:
        return `translateX(-${distance}px)`
    }
  })()
  
  element.style.transition = `all ${props.duration}ms var(--ease-win11, cubic-bezier(0.25, 0.46, 0.45, 0.94))`
  element.style.opacity = '0'
  element.style.transform = leaveTransform
  
  emit('leave', el)
  
  setTimeout(() => {
    done()
  }, props.duration)
}

const afterEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.transition = ''
  emit('after-enter', el)
}

const afterLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.transition = ''
  element.style.transform = ''
  emit('after-leave', el)
}
</script>

<style scoped>
/* 滑動動畫樣式 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active,
.slide-up-enter-active,
.slide-up-leave-active,
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-30px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>