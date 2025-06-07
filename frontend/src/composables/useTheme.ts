import { ref, computed, watch, onMounted, readonly, type Ref } from 'vue'

type Theme = 'light' | 'dark' | 'auto'

interface UseThemeOptions {
  defaultTheme?: Theme
  persistTheme?: boolean
  storageKey?: string
  onThemeChange?: (theme: Theme) => void
}

interface UseThemeReturn {
  theme: Readonly<Ref<Theme>>
  isDark: Readonly<Ref<boolean>>
  isLight: Readonly<Ref<boolean>>
  systemTheme: Readonly<Ref<'light' | 'dark'>>
  resolvedTheme: Readonly<Ref<'light' | 'dark'>>
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  cycletheme: () => void
}

// 全域主題狀態
const globalTheme = ref<Theme>('auto')
const systemTheme = ref<'light' | 'dark'>('light')
const isInitialized = ref(false)

// 偵測系統主題
const detectSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 監聽系統主題變化
const setupSystemThemeListener = () => {
  if (typeof window === 'undefined') return
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const updateSystemTheme = (e: MediaQueryListEvent) => {
    systemTheme.value = e.matches ? 'dark' : 'light'
  }
  
  mediaQuery.addEventListener('change', updateSystemTheme)
  
  // 清理函數
  return () => {
    mediaQuery.removeEventListener('change', updateSystemTheme)
  }
}

// 從 localStorage 載入主題
const loadThemeFromStorage = (storageKey: string): Theme | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored && ['light', 'dark', 'auto'].includes(stored)) {
      return stored as Theme
    }
  } catch (error) {
    console.warn('Failed to load theme from localStorage:', error)
  }
  
  return null
}

// 儲存主題到 localStorage
const saveThemeToStorage = (theme: Theme, storageKey: string) => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(storageKey, theme)
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error)
  }
}

// 應用主題到 DOM
const applyThemeToDOM = (resolvedTheme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return
  
  const html = document.documentElement
  
  // 移除舊的主題類
  html.classList.remove('light', 'dark')
  
  // 添加新的主題類
  html.classList.add(resolvedTheme)
  
  // 設置 CSS 變數
  html.style.setProperty('--resolved-theme', resolvedTheme)
  html.style.setProperty('--is-dark', resolvedTheme === 'dark' ? '1' : '0')
  html.style.setProperty('--is-light', resolvedTheme === 'light' ? '1' : '0')
  
  // 更新 meta theme-color
  updateMetaThemeColor(resolvedTheme)
}

// 更新 meta theme-color
const updateMetaThemeColor = (resolvedTheme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return
  
  let metaThemeColor = document.querySelector('meta[name="theme-color"]')
  
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta')
    metaThemeColor.setAttribute('name', 'theme-color')
    document.head.appendChild(metaThemeColor)
  }
  
  // 設置顏色（可以根據實際設計調整）
  const colors = {
    light: '#ffffff',
    dark: '#1f2937'
  }
  
  metaThemeColor.setAttribute('content', colors[resolvedTheme])
}

export function useTheme(options: UseThemeOptions = {}): UseThemeReturn {
  const {
    defaultTheme = 'auto',
    persistTheme = true,
    storageKey = 'memoryark-theme',
    onThemeChange
  } = options
  
  // 初始化主題
  const initTheme = () => {
    if (isInitialized.value) return
    
    // 偵測系統主題
    systemTheme.value = detectSystemTheme()
    
    // 載入儲存的主題或使用預設主題
    if (persistTheme) {
      const storedTheme = loadThemeFromStorage(storageKey)
      globalTheme.value = storedTheme || defaultTheme
    } else {
      globalTheme.value = defaultTheme
    }
    
    // 設置系統主題監聽器
    setupSystemThemeListener()
    
    isInitialized.value = true
  }
  
  // 計算屬性
  const theme = computed(() => globalTheme.value)
  
  const resolvedTheme = computed((): 'light' | 'dark' => {
    return globalTheme.value === 'auto' ? systemTheme.value : globalTheme.value
  })
  
  const isDark = computed(() => resolvedTheme.value === 'dark')
  const isLight = computed(() => resolvedTheme.value === 'light')
  
  // 設置主題
  const setTheme = (newTheme: Theme) => {
    globalTheme.value = newTheme
    
    if (persistTheme) {
      saveThemeToStorage(newTheme, storageKey)
    }
    
    onThemeChange?.(newTheme)
  }
  
  // 切換主題（在 light 和 dark 之間切換）
  const toggleTheme = () => {
    const currentResolved = resolvedTheme.value
    const newTheme = currentResolved === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }
  
  // 循環切換主題（light -> dark -> auto -> light）
  const cycletheme = () => {
    const themeOrder: Theme[] = ['light', 'dark', 'auto']
    const currentIndex = themeOrder.indexOf(globalTheme.value)
    const nextIndex = (currentIndex + 1) % themeOrder.length
    setTheme(themeOrder[nextIndex])
  }
  
  // 監聽解析後的主題變化並應用到 DOM
  watch(
    resolvedTheme,
    (newTheme) => {
      applyThemeToDOM(newTheme)
    },
    { immediate: true }
  )
  
  // 在組件掛載時初始化
  onMounted(() => {
    initTheme()
  })
  
  // 如果不在 Vue 組件中使用，手動初始化
  if (typeof window !== 'undefined' && !isInitialized.value) {
    initTheme()
  }
  
  return {
    theme: readonly(theme),
    isDark: readonly(isDark),
    isLight: readonly(isLight),
    systemTheme: readonly(systemTheme),
    resolvedTheme: readonly(resolvedTheme),
    setTheme,
    toggleTheme,
    cycletheme
  }
}

// 提供全域主題狀態的快捷方法
export const getTheme = () => globalTheme.value
export const getIsDark = () => computedResolvedTheme.value === 'dark'
export const getIsLight = () => computedResolvedTheme.value === 'light'
export const getResolvedTheme = () => {
  return globalTheme.value === 'auto' ? systemTheme.value : globalTheme.value
}

// 計算解析後的主題（修復錯誤）
const computedResolvedTheme = computed((): 'light' | 'dark' => {
  return globalTheme.value === 'auto' ? systemTheme.value : globalTheme.value
})

// 主題相關的工具函數
export const themeUtils = {
  // 獲取主題特定的值
  getThemeValue: <T>(lightValue: T, darkValue: T, currentTheme?: 'light' | 'dark'): T => {
    const resolved = currentTheme || getResolvedTheme()
    return resolved === 'dark' ? darkValue : lightValue
  },
  
  // 生成主題特定的 CSS 類名
  getThemeClass: (baseClass: string, currentTheme?: 'light' | 'dark'): string => {
    const resolved = currentTheme || getResolvedTheme()
    return `${baseClass} ${baseClass}--${resolved}`
  },
  
  // 檢查是否為深色主題
  isDarkTheme: (currentTheme?: 'light' | 'dark'): boolean => {
    const resolved = currentTheme || getResolvedTheme()
    return resolved === 'dark'
  },
  
  // 獲取主題特定的顏色值
  getThemeColor: (colors: { light: string; dark: string }, currentTheme?: 'light' | 'dark'): string => {
    const resolved = currentTheme || getResolvedTheme()
    return colors[resolved]
  }
}

// 主題常數
export const THEME_CONSTANTS = {
  THEMES: ['light', 'dark', 'auto'] as const,
  STORAGE_KEY: 'memoryark-theme',
  SYSTEM_MEDIA_QUERY: '(prefers-color-scheme: dark)',
  TRANSITION_DURATION: 300
} as const

// 型別匯出
export type { Theme, UseThemeOptions, UseThemeReturn }