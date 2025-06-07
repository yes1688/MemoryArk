<template>
  <div 
    ref="container"
    class="responsive-container"
    :class="[
      `breakpoint-${currentBreakpoint}`,
      `orientation-${orientation}`,
      {
        'touch-device': isTouchDevice,
        'mobile-device': isMobile,
        'tablet-device': isTablet,
        'desktop-device': isDesktop,
        'retina-display': isRetina,
        'reduced-motion': prefersReducedMotion
      }
    ]"
    :data-breakpoint="currentBreakpoint"
    :data-width="containerWidth"
    :data-height="containerHeight"
  >
    <slot 
      :breakpoint="currentBreakpoint"
      :width="containerWidth"
      :height="containerHeight"
      :is-mobile="isMobile"
      :is-tablet="isTablet"
      :is-desktop="isDesktop"
      :is-touch="isTouchDevice"
      :orientation="orientation"
      :device-pixel-ratio="devicePixelRatio"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useResizeObserver } from '@/composables/useResizeObserver'
import { useMediaQuery } from '@/composables/useMediaQuery'

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
type Orientation = 'portrait' | 'landscape'

interface Props {
  // 是否啟用響應式偵測
  enabled?: boolean
  // 自定義斷點
  customBreakpoints?: Record<string, number>
  // 是否偵測觸控裝置
  detectTouch?: boolean
  // 是否偵測裝置類型
  detectDevice?: boolean
  // 是否偵測螢幕方向
  detectOrientation?: boolean
  // 是否偵測像素密度
  detectPixelRatio?: boolean
  // 是否偵測使用者偏好
  detectPreferences?: boolean
}

interface Emits {
  (e: 'breakpoint-change', breakpoint: Breakpoint): void
  (e: 'orientation-change', orientation: Orientation): void
  (e: 'device-change', deviceInfo: DeviceInfo): void
  (e: 'resize', dimensions: { width: number; height: number }): void
}

interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  devicePixelRatio: number
  userAgent: string
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true,
  customBreakpoints: () => ({}),
  detectTouch: true,
  detectDevice: true,
  detectOrientation: true,
  detectPixelRatio: true,
  detectPreferences: true
})

const emit = defineEmits<Emits>()

const container = ref<HTMLElement>()
const containerWidth = ref(0)
const containerHeight = ref(0)
const devicePixelRatio = ref(1)
const prefersReducedMotion = ref(false)

// 預設斷點配置
const defaultBreakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

// 合併自定義斷點
const breakpoints = computed(() => ({
  ...defaultBreakpoints,
  ...props.customBreakpoints
}))

// 計算當前斷點
const currentBreakpoint = computed((): Breakpoint => {
  const width = containerWidth.value
  const points = Object.entries(breakpoints.value)
    .sort(([, a], [, b]) => b - a) // 從大到小排序
  
  for (const [name, minWidth] of points) {
    if (width >= minWidth) {
      return name as Breakpoint
    }
  }
  
  return 'xs'
})

// 媒體查詢檢測
const isMobile = useMediaQuery('(max-width: 767px)')
const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
const isDesktop = useMediaQuery('(min-width: 1024px)')
const isTouchDevice = useMediaQuery('(hover: none) and (pointer: coarse)')
const isRetina = useMediaQuery('(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)')

// 螢幕方向檢測
const orientation = computed((): Orientation => {
  if (!props.detectOrientation) return 'landscape'
  return containerWidth.value > containerHeight.value ? 'landscape' : 'portrait'
})

// 使用者偏好檢測
const detectUserPreferences = () => {
  if (!props.detectPreferences) return
  
  // 檢測動畫偏好
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  prefersReducedMotion.value = motionQuery.matches
  
  const handleMotionChange = (e: MediaQueryListEvent) => {
    prefersReducedMotion.value = e.matches
  }
  
  motionQuery.addEventListener('change', handleMotionChange)
  
  return () => {
    motionQuery.removeEventListener('change', handleMotionChange)
  }
}

// 像素密度檢測
const detectPixelRatio = () => {
  if (!props.detectPixelRatio) return
  
  devicePixelRatio.value = window.devicePixelRatio || 1
  
  // 監聽像素密度變化（如縮放）
  const handlePixelRatioChange = () => {
    devicePixelRatio.value = window.devicePixelRatio || 1
  }
  
  // 創建媒體查詢來監聽縮放變化
  const mediaQuery = window.matchMedia(`(resolution: ${devicePixelRatio.value}dppx)`)
  mediaQuery.addEventListener('change', handlePixelRatioChange)
  
  return () => {
    mediaQuery.removeEventListener('change', handlePixelRatioChange)
  }
}

// 裝置資訊
const deviceInfo = computed((): DeviceInfo => ({
  isMobile: isMobile.value,
  isTablet: isTablet.value,
  isDesktop: isDesktop.value,
  isTouchDevice: isTouchDevice.value,
  devicePixelRatio: devicePixelRatio.value,
  userAgent: navigator.userAgent
}))

// 尺寸變化處理
const handleResize = (entries: ResizeObserverEntry[]) => {
  if (!props.enabled) return
  
  const entry = entries[0]
  if (entry) {
    const { width, height } = entry.contentRect
    containerWidth.value = Math.round(width)
    containerHeight.value = Math.round(height)
    
    emit('resize', { width: containerWidth.value, height: containerHeight.value })
  }
}

// 使用 ResizeObserver
const { start: startResize, stop: stopResize } = useResizeObserver(container, handleResize)

// 監聽斷點變化
watch(currentBreakpoint, (newBreakpoint, oldBreakpoint) => {
  if (newBreakpoint !== oldBreakpoint) {
    emit('breakpoint-change', newBreakpoint)
  }
})

// 監聽方向變化
watch(orientation, (newOrientation, oldOrientation) => {
  if (newOrientation !== oldOrientation) {
    emit('orientation-change', newOrientation)
  }
})

// 監聽裝置資訊變化
watch(deviceInfo, (newDeviceInfo) => {
  emit('device-change', newDeviceInfo)
}, { deep: true })

// 公開方法
const getBreakpoint = () => currentBreakpoint.value
const getDimensions = () => ({ width: containerWidth.value, height: containerHeight.value })
const getDeviceInfo = () => deviceInfo.value
const getOrientation = () => orientation.value

// 斷點檢查輔助函數
const isBreakpoint = (bp: Breakpoint | Breakpoint[]) => {
  const current = currentBreakpoint.value
  return Array.isArray(bp) ? bp.includes(current) : current === bp
}

const isBreakpointOrAbove = (bp: Breakpoint) => {
  const current = currentBreakpoint.value
  const currentValue = breakpoints.value[current]
  const targetValue = breakpoints.value[bp]
  return currentValue >= targetValue
}

const isBreakpointOrBelow = (bp: Breakpoint) => {
  const current = currentBreakpoint.value
  const currentValue = breakpoints.value[current]
  const targetValue = breakpoints.value[bp]
  return currentValue <= targetValue
}

// 尺寸檢查輔助函數
const isWiderThan = (width: number) => containerWidth.value > width
const isNarrowerThan = (width: number) => containerWidth.value < width
const isTallerThan = (height: number) => containerHeight.value > height
const isShorterThan = (height: number) => containerHeight.value < height

// 裝置檢查輔助函數
const isTouch = () => isTouchDevice.value
const isPhone = () => isMobile.value && orientation.value === 'portrait'
const isPhoneLandscape = () => isMobile.value && orientation.value === 'landscape'
const isTabletPortrait = () => isTablet.value && orientation.value === 'portrait'
const isTabletLandscape = () => isTablet.value && orientation.value === 'landscape'

// 生命週期
let cleanupFunctions: (() => void)[] = []

onMounted(() => {
  if (!props.enabled) return
  
  // 初始化尺寸
  if (container.value) {
    const rect = container.value.getBoundingClientRect()
    containerWidth.value = Math.round(rect.width)
    containerHeight.value = Math.round(rect.height)
  }
  
  // 啟動尺寸監聽
  startResize()
  
  // 檢測用戶偏好
  const cleanupPreferences = detectUserPreferences()
  if (cleanupPreferences) cleanupFunctions.push(cleanupPreferences)
  
  // 檢測像素密度
  const cleanupPixelRatio = detectPixelRatio()
  if (cleanupPixelRatio) cleanupFunctions.push(cleanupPixelRatio)
})

onUnmounted(() => {
  stopResize()
  cleanupFunctions.forEach(cleanup => cleanup())
  cleanupFunctions = []
})

// 暴露給模板的方法
defineExpose({
  // 獲取資訊
  getBreakpoint,
  getDimensions,
  getDeviceInfo,
  getOrientation,
  
  // 斷點檢查
  isBreakpoint,
  isBreakpointOrAbove,
  isBreakpointOrBelow,
  
  // 尺寸檢查
  isWiderThan,
  isNarrowerThan,
  isTallerThan,
  isShorterThan,
  
  // 裝置檢查
  isTouch,
  isPhone,
  isPhoneLandscape,
  isTabletPortrait,
  isTabletLandscape,
  
  // 響應式狀態
  currentBreakpoint,
  containerWidth,
  containerHeight,
  isMobile,
  isTablet,
  isDesktop,
  isTouchDevice,
  orientation,
  devicePixelRatio
})
</script>

<style scoped>
.responsive-container {
  width: 100%;
  height: 100%;
}

/* 斷點特定樣式 */
.breakpoint-xs {
  /* 極小螢幕樣式 */
}

.breakpoint-sm {
  /* 小螢幕樣式 */
}

.breakpoint-md {
  /* 中等螢幕樣式 */
}

.breakpoint-lg {
  /* 大螢幕樣式 */
}

.breakpoint-xl {
  /* 超大螢幕樣式 */
}

.breakpoint-2xl {
  /* 超超大螢幕樣式 */
}

/* 方向特定樣式 */
.orientation-portrait {
  /* 縱向樣式 */
}

.orientation-landscape {
  /* 橫向樣式 */
}

/* 裝置類型樣式 */
.mobile-device {
  /* 手機樣式 */
}

.tablet-device {
  /* 平板樣式 */
}

.desktop-device {
  /* 桌面樣式 */
}

.touch-device {
  /* 觸控裝置樣式 */
}

/* 高解析度螢幕樣式 */
.retina-display {
  /* Retina 螢幕樣式 */
}

/* 減少動畫樣式 */
.reduced-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* 輔助類 */
.show-on-mobile {
  @apply block;
}

.hide-on-mobile {
  @apply hidden;
}

.show-on-tablet {
  @apply hidden;
}

.hide-on-tablet {
  @apply block;
}

.show-on-desktop {
  @apply hidden;
}

.hide-on-desktop {
  @apply block;
}

/* 斷點響應式輔助類 */
.breakpoint-sm .show-on-mobile,
.breakpoint-md .show-on-mobile,
.breakpoint-lg .show-on-mobile,
.breakpoint-xl .show-on-mobile,
.breakpoint-2xl .show-on-mobile {
  @apply hidden;
}

.breakpoint-sm .hide-on-mobile,
.breakpoint-md .hide-on-mobile,
.breakpoint-lg .hide-on-mobile,
.breakpoint-xl .hide-on-mobile,
.breakpoint-2xl .hide-on-mobile {
  @apply block;
}

.breakpoint-md .show-on-tablet,
.breakpoint-lg .show-on-tablet {
  @apply block;
}

.breakpoint-md .hide-on-tablet,
.breakpoint-lg .hide-on-tablet {
  @apply hidden;
}

.breakpoint-lg .show-on-desktop,
.breakpoint-xl .show-on-desktop,
.breakpoint-2xl .show-on-desktop {
  @apply block;
}

.breakpoint-lg .hide-on-desktop,
.breakpoint-xl .hide-on-desktop,
.breakpoint-2xl .hide-on-desktop {
  @apply hidden;
}

/* 觸控裝置特定樣式 */
.touch-device .hover\:scale-105:hover {
  transform: none;
}

.touch-device .hover\:shadow-lg:hover {
  box-shadow: none;
}

/* 高對比度模式 */
@media (prefers-contrast: high) {
  .responsive-container {
    border: 1px solid;
  }
}

/* 打印樣式 */
@media print {
  .responsive-container {
    overflow: visible !important;
    height: auto !important;
  }
  
  .hide-on-print {
    display: none !important;
  }
}
</style>