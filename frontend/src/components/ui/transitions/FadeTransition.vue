<template>
  <Transition
    name="fade"
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
import { nextTick } from 'vue'

interface Props {
  duration?: number
  delay?: number
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
  duration: 300,
  delay: 0,
  appear: false
})

const emit = defineEmits<Emits>()

const beforeEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.opacity = '0'
  element.style.transition = 'none'
  
  if (props.delay > 0) {
    element.style.animationDelay = `${props.delay}ms`
  }
  
  emit('before-enter', el)
}

const enter = async (el: Element, done: () => void) => {
  const element = el as HTMLElement
  
  // 強制重排以確保初始樣式被應用
  await nextTick()
  element.offsetHeight
  
  // 設置過渡
  element.style.transition = `opacity ${props.duration}ms var(--ease-in-out, ease-in-out)`
  element.style.opacity = '1'
  
  emit('enter', el)
  
  setTimeout(() => {
    done()
  }, props.duration + props.delay)
}

const leave = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  
  element.style.transition = `opacity ${props.duration}ms var(--ease-in-out, ease-in-out)`
  element.style.opacity = '0'
  
  emit('leave', el)
  
  setTimeout(() => {
    done()
  }, props.duration)
}

const afterEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.transition = ''
  element.style.animationDelay = ''
  emit('after-enter', el)
}

const afterLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.transition = ''
  emit('after-leave', el)
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>