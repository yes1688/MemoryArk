import { ref, onUnmounted, readonly, type Ref } from 'vue'

type ResizeObserverCallback = (entries: ResizeObserverEntry[]) => void

interface UseResizeObserverOptions {
  // 觀察的內容類型
  box?: 'content-box' | 'border-box' | 'device-pixel-content-box'
  // 是否立即開始觀察
  immediate?: boolean
  // 防抖動延遲（毫秒）
  debounce?: number
  // 節流延遲（毫秒）
  throttle?: number
}

interface UseResizeObserverReturn {
  isSupported: boolean
  start: () => void
  stop: () => void
  pause: () => void
  resume: () => void
}

/**
 * ResizeObserver 的 Vue Composable
 * @param target 目標元素的 ref
 * @param callback 尺寸變化時的回調函數
 * @param options 選項配置
 * @returns ResizeObserver 控制方法
 */
export function useResizeObserver(
  target: Ref<HTMLElement | null | undefined>,
  callback: ResizeObserverCallback,
  options: UseResizeObserverOptions = {}
): UseResizeObserverReturn {
  const {
    box = 'content-box',
    immediate = true,
    debounce = 0,
    throttle = 0
  } = options
  
  let observer: ResizeObserver | null = null
  const isActive = ref(false)
  const isPaused = ref(false)
  
  // 檢查是否支援 ResizeObserver
  const isSupported = typeof window !== 'undefined' && 'ResizeObserver' in window
  
  // 防抖動處理
  let debounceTimer: number | null = null
  const debouncedCallback = (entries: ResizeObserverEntry[]) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    
    debounceTimer = window.setTimeout(() => {
      if (!isPaused.value) {
        callback(entries)
      }
    }, debounce)
  }
  
  // 節流處理
  let throttleTimer: number | null = null
  let lastExecution = 0
  const throttledCallback = (entries: ResizeObserverEntry[]) => {
    const now = Date.now()
    
    if (now - lastExecution >= throttle) {
      lastExecution = now
      if (!isPaused.value) {
        callback(entries)
      }
    } else if (!throttleTimer) {
      throttleTimer = window.setTimeout(() => {
        lastExecution = Date.now()
        throttleTimer = null
        if (!isPaused.value) {
          callback(entries)
        }
      }, throttle - (now - lastExecution))
    }
  }
  
  // 選擇適當的回調函數
  const finalCallback = debounce > 0 ? debouncedCallback :
                       throttle > 0 ? throttledCallback :
                       (entries: ResizeObserverEntry[]) => {
                         if (!isPaused.value) {
                           callback(entries)
                         }
                       }
  
  // 開始觀察
  const start = () => {
    if (!isSupported) {
      console.warn('ResizeObserver is not supported in this browser')
      return
    }
    
    stop() // 確保停止之前的觀察器
    
    const element = target.value
    if (!element) return
    
    try {
      observer = new ResizeObserver(finalCallback)
      observer.observe(element, { box })
      isActive.value = true
      isPaused.value = false
    } catch (error) {
      console.error('Failed to start ResizeObserver:', error)
    }
  }
  
  // 停止觀察
  const stop = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    
    // 清理定時器
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    
    isActive.value = false
    isPaused.value = false
  }
  
  // 暫停觀察（不斷開連接，只是不執行回調）
  const pause = () => {
    isPaused.value = true
  }
  
  // 恢復觀察
  const resume = () => {
    isPaused.value = false
  }
  
  // 如果需要立即開始，且在瀏覽器環境中
  if (immediate && isSupported) {
    // 在 nextTick 中啟動，確保 DOM 已經渲染
    if (typeof window !== 'undefined') {
      setTimeout(start, 0)
    }
  }
  
  // 組件體銃殫時清理
  onUnmounted(() => {
    stop()
  })
  
  return {
    isSupported,
    start,
    stop,
    pause,
    resume
  }
}

/**
 * 監聽元素尺寸變化的簡化版本
 */
export function useElementSize(
  target: Ref<HTMLElement | null | undefined>,
  options: {
    width?: Ref<number>
    height?: Ref<number>
    immediate?: boolean
    debounce?: number
  } = {}
) {
  const {
    width = ref(0),
    height = ref(0),
    immediate = true,
    debounce = 0
  } = options
  
  const { start, stop, isSupported } = useResizeObserver(
    target,
    (entries) => {
      const entry = entries[0]
      if (entry) {
        const { width: w, height: h } = entry.contentRect
        width.value = Math.round(w)
        height.value = Math.round(h)
      }
    },
    { immediate, debounce }
  )
  
  return {
    width: readonly(width),
    height: readonly(height),
    start,
    stop,
    isSupported
  }
}

/**
 * 監聽多個元素的尺寸變化
 */
export function useMultipleResizeObserver(
  targets: Ref<HTMLElement[]>,
  callback: ResizeObserverCallback,
  options: UseResizeObserverOptions = {}
): UseResizeObserverReturn {
  const { box = 'content-box', immediate = true } = options
  
  let observer: ResizeObserver | null = null
  const isActive = ref(false)
  
  const isSupported = typeof window !== 'undefined' && 'ResizeObserver' in window
  
  const start = () => {
    if (!isSupported) return
    
    stop()
    
    const elements = targets.value
    if (!elements || elements.length === 0) return
    
    try {
      observer = new ResizeObserver(callback)
      elements.forEach(element => {
        if (element) {
          observer!.observe(element, { box })
        }
      })
      isActive.value = true
    } catch (error) {
      console.error('Failed to start multiple ResizeObserver:', error)
    }
  }
  
  const stop = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    isActive.value = false
  }
  
  const pause = () => {
    // 多元素觀察器不支援暫停，只能停止
    stop()
  }
  
  const resume = () => {
    start()
  }
  
  if (immediate && isSupported) {
    setTimeout(start, 0)
  }
  
  onUnmounted(() => {
    stop()
  })
  
  return {
    isSupported,
    start,
    stop,
    pause,
    resume
  }
}

/**
 * 監聽窗口尺寸變化
 */
export function useWindowSize(options: { debounce?: number } = {}) {
  const { debounce = 100 } = options
  
  const width = ref(0)
  const height = ref(0)
  
  const updateSize = () => {
    if (typeof window !== 'undefined') {
      width.value = window.innerWidth
      height.value = window.innerHeight
    }
  }
  
  // 防抖動處理
  let debounceTimer: number | null = null
  const debouncedUpdateSize = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = window.setTimeout(updateSize, debounce)
  }
  
  // 初始化尺寸
  updateSize()
  
  // 監聽窗口尺寸變化
  const cleanup = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', debouncedUpdateSize)
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  }
  
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', debouncedUpdateSize)
  }
  
  onUnmounted(cleanup)
  
  return {
    width: readonly(width),
    height: readonly(height),
    cleanup
  }
}

// 工具函數
export const resizeObserverUtils = {
  // 檢查是否支援 ResizeObserver
  isSupported: () => typeof window !== 'undefined' && 'ResizeObserver' in window,
  
  // 獲取元素的當前尺寸
  getElementSize: (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  },
  
  // 檢查元素是否可見
  isElementVisible: (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }
}

// 型別導出
export type { ResizeObserverCallback, UseResizeObserverOptions, UseResizeObserverReturn }