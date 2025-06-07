import { ref, onMounted, onUnmounted, readonly, type Ref } from 'vue'

/**
 * 使用媒體查詢的 Vue Composable
 * @param query 媒體查詢字串
 * @param options 選項配置
 * @returns 媒體查詢匹配狀態的響應式引用
 */
export function useMediaQuery(
  query: string, 
  options: {
    defaultValue?: boolean
    immediate?: boolean
  } = {}
): Readonly<Ref<boolean>> {
  const { defaultValue = false, immediate = true } = options
  
  const matches = ref(defaultValue)
  let mediaQuery: MediaQueryList | null = null
  let cleanup: (() => void) | null = null
  
  const updateMatches = (event: MediaQueryListEvent) => {
    matches.value = event.matches
  }
  
  const setupMediaQuery = () => {
    if (typeof window === 'undefined') return
    
    try {
      mediaQuery = window.matchMedia(query)
      
      // 立即更新初始值
      if (immediate) {
        matches.value = mediaQuery.matches
      }
      
      // 監聽變化
      mediaQuery.addEventListener('change', updateMatches)
      
      cleanup = () => {
        if (mediaQuery) {
          mediaQuery.removeEventListener('change', updateMatches)
        }
      }
    } catch (error) {
      console.warn('Failed to create media query:', query, error)
      matches.value = defaultValue
    }
  }
  
  onMounted(() => {
    setupMediaQuery()
  })
  
  onUnmounted(() => {
    cleanup?.()
  })
  
  // 如果不在 Vue 組件中使用，手動初始化
  if (typeof window !== 'undefined' && immediate) {
    setupMediaQuery()
  }
  
  return readonly(matches)
}

/**
 * 預定義的常用媒體查詢
 */
export const mediaQueries = {
  // 螢幕尺寸
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  
  // 裝置類型
  touch: '(hover: none) and (pointer: coarse)',
  mouse: '(hover: hover) and (pointer: fine)',
  
  // 螢幕方向
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  
  // 解析度
  retina: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
  highDpi: '(min-resolution: 2dppx)',
  
  // 色彩主題
  darkTheme: '(prefers-color-scheme: dark)',
  lightTheme: '(prefers-color-scheme: light)',
  
  // 用戶偏好
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedData: '(prefers-reduced-data: reduce)',
  highContrast: '(prefers-contrast: high)',
  
  // 顯示模式
  standalone: '(display-mode: standalone)',
  fullscreen: '(display-mode: fullscreen)',
  
  // 螢幕特性
  wideScreen: '(min-aspect-ratio: 16/9)',
  narrowScreen: '(max-aspect-ratio: 4/3)'
} as const

/**
 * 預定義的媒體查詢組合
 */
export const useCommonMediaQueries = () => {
  return {
    isMobile: useMediaQuery(mediaQueries.mobile),
    isTablet: useMediaQuery(mediaQueries.tablet),
    isDesktop: useMediaQuery(mediaQueries.desktop),
    
    isTouch: useMediaQuery(mediaQueries.touch),
    isMouse: useMediaQuery(mediaQueries.mouse),
    
    isPortrait: useMediaQuery(mediaQueries.portrait),
    isLandscape: useMediaQuery(mediaQueries.landscape),
    
    isRetina: useMediaQuery(mediaQueries.retina),
    isDarkTheme: useMediaQuery(mediaQueries.darkTheme),
    prefersReducedMotion: useMediaQuery(mediaQueries.reducedMotion),
    prefersHighContrast: useMediaQuery(mediaQueries.highContrast),
    
    isStandalone: useMediaQuery(mediaQueries.standalone),
    isWideScreen: useMediaQuery(mediaQueries.wideScreen)
  }
}

/**
 * 創建自定義斷點查詢
 */
export const useBreakpoints = (breakpoints: Record<string, number>) => {
  const queries: Record<string, Readonly<Ref<boolean>>> = {}
  
  for (const [name, width] of Object.entries(breakpoints)) {
    queries[name] = useMediaQuery(`(min-width: ${width}px)`)
  }
  
  return queries
}

/**
 * 範圍媒體查詢（在兩個斷點之間）
 */
export const useRangeQuery = (minWidth: number, maxWidth: number) => {
  return useMediaQuery(`(min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`)
}

/**
 * 組合多個媒體查詢（AND 邏輯）
 */
export const useCombinedQuery = (queries: string[]) => {
  const combinedQuery = queries.join(' and ')
  return useMediaQuery(combinedQuery)
}

/**
 * 監聽多個媒體查詢變化
 */
export const useMultipleMediaQueries = (queryMap: Record<string, string>) => {
  const results: Record<string, Readonly<Ref<boolean>>> = {}
  
  for (const [key, query] of Object.entries(queryMap)) {
    results[key] = useMediaQuery(query)
  }
  
  return results
}

/**
 * 檢查是否支援媒體查詢
 */
export const supportsMediaQuery = (query: string): boolean => {
  if (typeof window === 'undefined') return false
  
  try {
    return window.matchMedia(query).media === query
  } catch {
    return false
  }
}

/**
 * 獲取媒體查詢的當前匹配狀態（同步）
 */
export const getMediaQueryMatch = (query: string): boolean => {
  if (typeof window === 'undefined') return false
  
  try {
    return window.matchMedia(query).matches
  } catch {
    return false
  }
}

// 型別導出
export type MediaQueryKey = keyof typeof mediaQueries