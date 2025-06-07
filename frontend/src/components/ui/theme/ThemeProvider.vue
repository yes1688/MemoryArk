<template>
  <div 
    :class="[
      'theme-provider',
      `theme-${currentTheme}`,
      {
        'theme-transitioning': isTransitioning,
        'reduce-motion': prefersReducedMotion,
        'high-contrast': prefersHighContrast
      }
    ]"
    :data-theme="currentTheme"
  >
    <slot />
    
    <!-- 主題切換按鈕 -->
    <button
      v-if="showThemeToggle"
      @click="toggleTheme"
      class="theme-toggle"
      :class="`toggle-${currentTheme}`"
      :aria-label="`切換到${currentTheme === 'light' ? '深色' : '淺色'}模式`"
      :title="`目前：${themeLabels[currentTheme]}，點擊切換`"
    >
      <Transition name="theme-icon" mode="out-in">
        <svg 
          v-if="currentTheme === 'light'"
          key="moon"
          class="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <svg 
          v-else
          key="sun"
          class="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </Transition>
    </button>
    
    <!-- 主題選擇器 -->
    <div 
      v-if="showThemeSelector"
      class="theme-selector"
      :class="{ 'selector-open': selectorOpen }"
    >
      <button
        @click="toggleSelector"
        class="selector-trigger"
        :aria-expanded="selectorOpen"
        aria-haspopup="true"
      >
        <span class="current-theme-icon">
          <component :is="themeIcons[currentTheme]" class="w-4 h-4" />
        </span>
        <span>{{ themeLabels[currentTheme] }}</span>
        <svg 
          class="w-4 h-4 transition-transform" 
          :class="{ 'rotate-180': selectorOpen }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <Transition name="selector-dropdown">
        <div v-if="selectorOpen" class="selector-dropdown">
          <button
            v-for="theme in availableThemes"
            :key="theme"
            @click="setTheme(theme)"
            class="theme-option"
            :class="{ 'option-active': theme === currentTheme }"
            :aria-pressed="theme === currentTheme"
          >
            <component :is="themeIcons[theme]" class="w-4 h-4" />
            <span>{{ themeLabels[theme] }}</span>
            <svg 
              v-if="theme === currentTheme"
              class="w-4 h-4 text-church-primary"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTheme } from '@/composables/useTheme'

type Theme = 'light' | 'dark' | 'auto'

interface Props {
  defaultTheme?: Theme
  showThemeToggle?: boolean
  showThemeSelector?: boolean
  persistTheme?: boolean
  detectSystemTheme?: boolean
  storageKey?: string
}

interface Emits {
  (e: 'theme-change', theme: Theme): void
  (e: 'system-theme-change', isDark: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  defaultTheme: 'auto',
  showThemeToggle: true,
  showThemeSelector: false,
  persistTheme: true,
  detectSystemTheme: true,
  storageKey: 'memoryark-theme'
})

const emit = defineEmits<Emits>()

const { 
  theme: currentTheme, 
  isDark, 
  setTheme, 
  toggleTheme: baseToggleTheme 
} = useTheme({
  defaultTheme: props.defaultTheme,
  persistTheme: props.persistTheme,
  storageKey: props.storageKey
})

const isTransitioning = ref(false)
const selectorOpen = ref(false)
const prefersReducedMotion = ref(false)
const prefersHighContrast = ref(false)

// 主題相關資料
const availableThemes: Theme[] = ['light', 'dark', 'auto']

const themeLabels: Record<Theme, string> = {
  light: '淺色模式',
  dark: '深色模式',
  auto: '跟隨系統'
}

// 主題圖標組件
const LightIcon = {
  template: `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  `
}

const DarkIcon = {
  template: `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  `
}

const AutoIcon = {
  template: `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  `
}

const themeIcons: Record<Theme, any> = {
  light: LightIcon,
  dark: DarkIcon,
  auto: AutoIcon
}

// 媒體查詢檢測
const mediaQueries = {
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: high)',
  darkTheme: '(prefers-color-scheme: dark)'
}

let mediaQueryListeners: MediaQueryList[] = []

// 切換主題動畫
const toggleTheme = async () => {
  if (prefersReducedMotion.value) {
    baseToggleTheme()
    return
  }
  
  isTransitioning.value = true
  
  // 延遲以便動畫效果
  await new Promise(resolve => setTimeout(resolve, 50))
  
  baseToggleTheme()
  
  // 等待過渡完成
  setTimeout(() => {
    isTransitioning.value = false
  }, 300)
}

// 開關選擇器
const toggleSelector = () => {
  selectorOpen.value = !selectorOpen.value
}

// 設置主題並關閉選擇器
const selectTheme = (theme: Theme) => {
  setTheme(theme)
  selectorOpen.value = false
}

// 處理點擊外部關閉選擇器
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.theme-selector')) {
    selectorOpen.value = false
  }
}

// 檢測用戶偏好設置
const detectUserPreferences = () => {
  // 檢測動畫偏好
  const motionQuery = window.matchMedia(mediaQueries.reducedMotion)
  prefersReducedMotion.value = motionQuery.matches
  
  const motionListener = (e: MediaQueryListEvent) => {
    prefersReducedMotion.value = e.matches
  }
  motionQuery.addEventListener('change', motionListener)
  mediaQueryListeners.push(motionQuery)
  
  // 檢測對比度偏好
  const contrastQuery = window.matchMedia(mediaQueries.highContrast)
  prefersHighContrast.value = contrastQuery.matches
  
  const contrastListener = (e: MediaQueryListEvent) => {
    prefersHighContrast.value = e.matches
  }
  contrastQuery.addEventListener('change', contrastListener)
  mediaQueryListeners.push(contrastQuery)
  
  // 檢測系統主題偏好
  if (props.detectSystemTheme) {
    const themeQuery = window.matchMedia(mediaQueries.darkTheme)
    
    const themeListener = (e: MediaQueryListEvent) => {
      emit('system-theme-change', e.matches)
    }
    themeQuery.addEventListener('change', themeListener)
    mediaQueryListeners.push(themeQuery)
  }
}

// 應用主題到文檔
const applyThemeToDocument = () => {
  const html = document.documentElement
  
  // 移除舊的主題類
  html.classList.remove('light', 'dark')
  
  // 添加新的主題類
  if (currentTheme.value === 'auto') {
    html.classList.add(isDark.value ? 'dark' : 'light')
  } else {
    html.classList.add(currentTheme.value)
  }
  
  // 設置 CSS 變數
  html.style.setProperty('--theme', currentTheme.value)
  html.style.setProperty('--is-dark', isDark.value ? '1' : '0')
  
  // 設置 meta theme-color
  updateMetaThemeColor()
}

// 更新 meta theme-color
const updateMetaThemeColor = () => {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]')
  
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta')
    metaThemeColor.setAttribute('name', 'theme-color')
    document.head.appendChild(metaThemeColor)
  }
  
  const color = isDark.value ? '#1f2937' : '#ffffff'
  metaThemeColor.setAttribute('content', color)
}

// 監聽鍵盤快捷鍵
const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  // Ctrl/Cmd + Shift + T: 切換主題
  if (event.ctrlKey && event.shiftKey && event.key === 'T') {
    event.preventDefault()
    toggleTheme()
  }
  
  // Escape: 關閉選擇器
  if (event.key === 'Escape' && selectorOpen.value) {
    selectorOpen.value = false
  }
}

// 生命週期
onMounted(() => {
  detectUserPreferences()
  applyThemeToDocument()
  
  // 監聽點擊外部
  document.addEventListener('click', handleClickOutside)
  
  // 監聽鍵盤快捷鍵
  document.addEventListener('keydown', handleKeyboardShortcuts)
})

onUnmounted(() => {
  // 清理媒體查詢監聽器
  mediaQueryListeners.forEach(query => {
    query.removeEventListener('change', () => {})
  })
  
  // 清理事件監聽器
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyboardShortcuts)
})

// 監聽主題變化
watch(currentTheme, (newTheme) => {
  applyThemeToDocument()
  emit('theme-change', newTheme)
}, { immediate: true })

watch(isDark, () => {
  applyThemeToDocument()
})

// 暴露給父組件的方法
defineExpose({
  currentTheme,
  isDark,
  setTheme,
  toggleTheme,
  isTransitioning
})
</script>

<style scoped>
/* 基礎主題樣式 */
.theme-provider {
  transition: background-color 0.3s ease, color 0.3s ease;
}

.theme-provider.reduce-motion {
  transition: none !important;
}

.theme-provider.reduce-motion * {
  transition: none !important;
  animation: none !important;
}

/* 主題切換按鈕 */
.theme-toggle {
  @apply fixed bottom-6 right-6 z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700;
  @apply text-gray-700 dark:text-gray-300 hover:text-church-primary dark:hover:text-church-primary;
  @apply transition-all duration-200 ease-in-out;
  @apply hover:scale-110 hover:shadow-xl;
  @apply focus:outline-none focus:ring-2 focus:ring-church-primary focus:ring-offset-2;
}

.theme-toggle:active {
  @apply scale-95;
}

/* 主題切換圖標過渡 */
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: all 0.2s ease;
}

.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.8);
}

.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.8);
}

/* 主題選擇器 */
.theme-selector {
  @apply relative inline-block;
}

.selector-trigger {
  @apply flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300;
  @apply bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg;
  @apply hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-church-primary focus:ring-offset-2;
}

.current-theme-icon {
  @apply flex items-center justify-center;
}

.selector-dropdown {
  @apply absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700;
  @apply rounded-lg shadow-lg min-w-full z-50;
}

.theme-option {
  @apply flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150;
  @apply focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700;
}

.theme-option.option-active {
  @apply bg-church-primary/10 text-church-primary;
}

/* 選擇器下拉動畫 */
.selector-dropdown-enter-active,
.selector-dropdown-leave-active {
  transition: all 0.2s ease;
  transform-origin: top;
}

.selector-dropdown-enter-from,
.selector-dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.8) translateY(-8px);
}

/* 主題過渡效果 */
.theme-transitioning {
  position: relative;
}

.theme-transitioning::before {
  content: '';
  @apply absolute inset-0 bg-gradient-to-br from-church-primary/20 to-church-secondary/20 pointer-events-none;
  animation: themeTransition 0.3s ease-out;
}

@keyframes themeTransition {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
  }
  100% {
    opacity: 0;
    transform: scale(1);
  }
}

/* 高對比度模式 */
.theme-provider.high-contrast {
  @apply contrast-125 saturate-150;
}

.high-contrast .theme-toggle {
  @apply border-2 border-black dark:border-white;
}

.high-contrast .selector-trigger {
  @apply border-2 border-black dark:border-white;
}

/* 響應式設計 */
@media (max-width: 640px) {
  .theme-toggle {
    @apply bottom-4 right-4 p-2;
  }
  
  .selector-dropdown {
    @apply right-0 left-auto;
  }
}

/* 打印樣式 */
@media print {
  .theme-toggle,
  .theme-selector {
    @apply hidden;
  }
}

/* 深色模式特定樣式 */
.theme-dark {
  color-scheme: dark;
}

.theme-light {
  color-scheme: light;
}

/* 過渡動畫優化 */
.theme-provider * {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

.reduce-motion .theme-provider * {
  transition: none !important;
}

/* 焦點樣式增強 */
.theme-toggle:focus-visible,
.selector-trigger:focus-visible,
.theme-option:focus-visible {
  @apply outline-none ring-2 ring-church-primary ring-offset-2 ring-offset-white dark:ring-offset-gray-800;
}

/* 主題變數定義 */
:root {
  --theme-transition: 0.3s ease;
}

.reduce-motion {
  --theme-transition: 0s;
}
</style>