<template>
  <div 
    ref="container"
    class="keyboard-nav-container"
    :class="{ 'nav-active': isNavigating }"
    @keydown="handleKeydown"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
    tabindex="-1"
  >
    <slot />
    
    <!-- 鍵盤導航提示 -->
    <div 
      v-if="showHints && isNavigating"
      class="nav-hints"
      :class="{ 'hints-visible': hintsVisible }"
    >
      <div class="hint-item">
        <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> 切換焦點
      </div>
      <div class="hint-item">
        <kbd>Enter</kbd> / <kbd>Space</kbd> 啟動
      </div>
      <div class="hint-item">
        <kbd>Esc</kbd> 關閉對話框
      </div>
      <div class="hint-item">
        <kbd>Arrow Keys</kbd> 方向導航
      </div>
    </div>
    
    <!-- 跳過連結 -->
    <a 
      v-if="showSkipLink"
      href="#main-content"
      class="skip-link"
      @click="skipToMain"
    >
      跳至主要內容
    </a>
    
    <!-- 焦點指示器 -->
    <div 
      v-if="focusIndicator && currentFocusElement"
      class="focus-indicator"
      :style="focusIndicatorStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  enabled?: boolean
  showHints?: boolean
  showSkipLink?: boolean
  focusIndicator?: boolean
  trapFocus?: boolean
  restoreFocus?: boolean
  autoFocus?: boolean
}

interface Emits {
  (e: 'navigation-start'): void
  (e: 'navigation-end'): void
  (e: 'focus-change', element: HTMLElement | null): void
  (e: 'escape-pressed'): void
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true,
  showHints: false,
  showSkipLink: true,
  focusIndicator: true,
  trapFocus: false,
  restoreFocus: true,
  autoFocus: false
})

const emit = defineEmits<Emits>()

const container = ref<HTMLElement>()
const isNavigating = ref(false)
const hintsVisible = ref(false)
const currentFocusElement = ref<HTMLElement | null>(null)
const previousFocusElement = ref<HTMLElement | null>(null)
const focusableElements = ref<HTMLElement[]>([])
const currentFocusIndex = ref(-1)

// 可聚焦元素選擇器
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'summary',
  'iframe',
  'object',
  'embed',
  'area[href]',
  'audio[controls]',
  'video[controls]'
].join(', ')

// 焦點指示器樣式
const focusIndicatorStyle = computed(() => {
  if (!currentFocusElement.value) return {}
  
  const rect = currentFocusElement.value.getBoundingClientRect()
  const containerRect = container.value?.getBoundingClientRect()
  
  if (!containerRect) return {}
  
  return {
    left: `${rect.left - containerRect.left - 2}px`,
    top: `${rect.top - containerRect.top - 2}px`,
    width: `${rect.width + 4}px`,
    height: `${rect.height + 4}px`
  }
})

// 更新可聚焦元素列表
const updateFocusableElements = () => {
  if (!container.value) return
  
  const elements = Array.from(
    container.value.querySelectorAll(FOCUSABLE_SELECTORS)
  ) as HTMLElement[]
  
  // 過濾掉不可見或被禁用的元素
  focusableElements.value = elements.filter(el => {
    const style = window.getComputedStyle(el)
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      !el.hasAttribute('disabled') &&
      el.tabIndex !== -1
    )
  })
}

// 處理鍵盤事件
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.enabled) return
  
  const { key, code, shiftKey, ctrlKey, altKey, metaKey } = event
  
  // 檢查是否為修飾鍵組合
  const hasModifier = ctrlKey || altKey || metaKey
  
  switch (key) {
    case 'Tab':
      if (props.trapFocus) {
        handleTabNavigation(event)
      }
      startNavigation()
      break
      
    case 'Escape':
      emit('escape-pressed')
      endNavigation()
      break
      
    case 'F6':
      if (!hasModifier) {
        event.preventDefault()
        cycleLandmarks(shiftKey)
      }
      break
      
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      if (!hasModifier) {
        handleArrowNavigation(event)
      }
      break
      
    case 'Home':
      if (!hasModifier) {
        event.preventDefault()
        focusFirst()
      }
      break
      
    case 'End':
      if (!hasModifier) {
        event.preventDefault()
        focusLast()
      }
      break
      
    case 'Enter':
    case ' ':
      if (event.target && isActivatable(event.target as HTMLElement)) {
        // 讓瀏覽器處理原生行為
        return
      }
      break
  }
}

// 處理 Tab 導航
const handleTabNavigation = (event: KeyboardEvent) => {
  if (!props.trapFocus || focusableElements.value.length === 0) return
  
  event.preventDefault()
  
  if (event.shiftKey) {
    // Shift+Tab - 上一個元素
    currentFocusIndex.value = currentFocusIndex.value <= 0
      ? focusableElements.value.length - 1
      : currentFocusIndex.value - 1
  } else {
    // Tab - 下一個元素
    currentFocusIndex.value = currentFocusIndex.value >= focusableElements.value.length - 1
      ? 0
      : currentFocusIndex.value + 1
  }
  
  const targetElement = focusableElements.value[currentFocusIndex.value]
  if (targetElement) {
    targetElement.focus()
  }
}

// 處理箭頭鍵導航
const handleArrowNavigation = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  
  // 檢查是否在特定容器中（如網格、列表）
  const gridContainer = target.closest('[role="grid"], [role="listbox"], .grid-nav')
  if (gridContainer) {
    event.preventDefault()
    navigateGrid(event, gridContainer as HTMLElement)
  }
}

// 網格導航
const navigateGrid = (event: KeyboardEvent, container: HTMLElement) => {
  const items = Array.from(
    container.querySelectorAll('[role="gridcell"], [role="option"], .grid-item')
  ) as HTMLElement[]
  
  const currentIndex = items.indexOf(event.target as HTMLElement)
  if (currentIndex === -1) return
  
  const columns = parseInt(container.getAttribute('data-columns') || '1')
  let targetIndex = currentIndex
  
  switch (event.key) {
    case 'ArrowRight':
      targetIndex = Math.min(items.length - 1, currentIndex + 1)
      break
    case 'ArrowLeft':
      targetIndex = Math.max(0, currentIndex - 1)
      break
    case 'ArrowDown':
      targetIndex = Math.min(items.length - 1, currentIndex + columns)
      break
    case 'ArrowUp':
      targetIndex = Math.max(0, currentIndex - columns)
      break
  }
  
  if (targetIndex !== currentIndex && items[targetIndex]) {
    items[targetIndex].focus()
  }
}

// 循環地標導航
const cycleLandmarks = (reverse = false) => {
  const landmarks = Array.from(
    document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="search"]')
  ) as HTMLElement[]
  
  if (landmarks.length === 0) return
  
  const currentLandmark = landmarks.find(landmark => 
    landmark.contains(document.activeElement as Node)
  )
  
  let targetIndex = 0
  
  if (currentLandmark) {
    const currentIndex = landmarks.indexOf(currentLandmark)
    targetIndex = reverse
      ? (currentIndex - 1 + landmarks.length) % landmarks.length
      : (currentIndex + 1) % landmarks.length
  }
  
  const targetLandmark = landmarks[targetIndex]
  if (targetLandmark) {
    // 尋找地標內的第一個可聚焦元素
    const firstFocusable = targetLandmark.querySelector(FOCUSABLE_SELECTORS) as HTMLElement
    if (firstFocusable) {
      firstFocusable.focus()
    } else {
      targetLandmark.focus()
    }
  }
}

// 檢查元素是否可啟動
const isActivatable = (element: HTMLElement): boolean => {
  return [
    'button',
    'a',
    'input',
    'select',
    'textarea'
  ].includes(element.tagName.toLowerCase()) ||
  element.hasAttribute('onclick') ||
  element.hasAttribute('role') && [
    'button',
    'link',
    'menuitem',
    'option',
    'tab'
  ].includes(element.getAttribute('role') || '')
}

// 聚焦第一個元素
const focusFirst = () => {
  updateFocusableElements()
  if (focusableElements.value.length > 0) {
    focusableElements.value[0].focus()
    currentFocusIndex.value = 0
  }
}

// 聚焦最後一個元素
const focusLast = () => {
  updateFocusableElements()
  if (focusableElements.value.length > 0) {
    const lastIndex = focusableElements.value.length - 1
    focusableElements.value[lastIndex].focus()
    currentFocusIndex.value = lastIndex
  }
}

// 開始導航
const startNavigation = () => {
  if (!isNavigating.value) {
    isNavigating.value = true
    previousFocusElement.value = document.activeElement as HTMLElement
    emit('navigation-start')
    
    if (props.showHints) {
      setTimeout(() => {
        hintsVisible.value = true
      }, 500)
    }
  }
}

// 結束導航
const endNavigation = () => {
  if (isNavigating.value) {
    isNavigating.value = false
    hintsVisible.value = false
    emit('navigation-end')
    
    // 恢復焦點
    if (props.restoreFocus && previousFocusElement.value) {
      previousFocusElement.value.focus()
      previousFocusElement.value = null
    }
  }
}

// 處理焦點進入
const handleFocusIn = (event: FocusEvent) => {
  if (!props.enabled) return
  
  currentFocusElement.value = event.target as HTMLElement
  emit('focus-change', currentFocusElement.value)
  
  updateFocusableElements()
  currentFocusIndex.value = focusableElements.value.indexOf(currentFocusElement.value)
}

// 處理焦點離開
const handleFocusOut = (event: FocusEvent) => {
  if (!props.enabled) return
  
  // 延遲檢查，確保新焦點已設置
  setTimeout(() => {
    if (!container.value?.contains(document.activeElement as Node)) {
      currentFocusElement.value = null
      emit('focus-change', null)
      endNavigation()
    }
  }, 0)
}

// 跳至主要內容
const skipToMain = (event: Event) => {
  event.preventDefault()
  const mainContent = document.getElementById('main-content') ||
                     document.querySelector('[role="main"]') as HTMLElement
  
  if (mainContent) {
    mainContent.focus()
    mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 公開方法
const focus = (selector?: string) => {
  if (!container.value) return
  
  if (selector) {
    const element = container.value.querySelector(selector) as HTMLElement
    if (element) {
      element.focus()
      return
    }
  }
  
  focusFirst()
}

const blur = () => {
  if (currentFocusElement.value) {
    currentFocusElement.value.blur()
  }
}

const refreshFocusableElements = () => {
  updateFocusableElements()
}

// 生命週期
onMounted(() => {
  updateFocusableElements()
  
  if (props.autoFocus) {
    nextTick(() => {
      focusFirst()
    })
  }
  
  // 監聽全域 Escape 鍵
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isNavigating.value) {
      endNavigation()
    }
  })
})

onUnmounted(() => {
  endNavigation()
})

defineExpose({
  focus,
  blur,
  focusFirst,
  focusLast,
  refreshFocusableElements,
  startNavigation,
  endNavigation
})
</script>

<style scoped>
.keyboard-nav-container {
  @apply relative;
  outline: none;
}

.keyboard-nav-container.nav-active {
  /* 導航模式下的視覺提示 */
}

/* 跳過連結 */
.skip-link {
  @apply absolute top-0 left-0 z-50 px-4 py-2 bg-church-primary text-white font-medium rounded-br-lg;
  transform: translateY(-100%);
  transition: transform 0.2s ease;
}

.skip-link:focus {
  transform: translateY(0);
}

/* 導航提示 */
.nav-hints {
  @apply fixed top-4 right-4 z-50 bg-gray-900 text-white p-4 rounded-lg shadow-lg;
  opacity: 0;
  transform: translateX(100%);
  transition: all 0.3s ease;
  min-width: 200px;
}

.nav-hints.hints-visible {
  opacity: 0.9;
  transform: translateX(0);
}

.hint-item {
  @apply flex items-center justify-between text-sm mb-2 last:mb-0;
}

kbd {
  @apply inline-block px-2 py-1 text-xs font-mono bg-gray-700 rounded border border-gray-600;
}

/* 焦點指示器 */
.focus-indicator {
  @apply absolute pointer-events-none border-2 border-church-primary rounded;
  z-index: 1000;
  transition: all 0.15s ease;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* 深色模式 */
.dark .nav-hints {
  @apply bg-gray-800 border border-gray-700;
}

.dark kbd {
  @apply bg-gray-600 border-gray-500;
}

.dark .skip-link {
  @apply bg-church-primary;
}

/* 高對比度模式 */
@media (prefers-contrast: high) {
  .focus-indicator {
    @apply border-4 border-black;
    box-shadow: 0 0 0 4px white;
  }
  
  .nav-hints {
    @apply bg-black border-2 border-white;
  }
  
  kbd {
    @apply bg-white text-black border-2 border-black;
  }
}

/* 減少動畫 */
@media (prefers-reduced-motion: reduce) {
  .skip-link,
  .nav-hints,
  .focus-indicator {
    transition: none !important;
  }
}

/* 響應式設計 */
@media (max-width: 640px) {
  .nav-hints {
    @apply top-auto bottom-4 right-2 left-2 text-xs;
    min-width: auto;
  }
  
  .hint-item {
    @apply flex-col items-start gap-1;
  }
  
  kbd {
    @apply text-xs px-1;
  }
}

/* 打印樣式 */
@media print {
  .skip-link,
  .nav-hints,
  .focus-indicator {
    @apply hidden;
  }
}
</style>