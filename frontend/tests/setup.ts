import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// 模擬 ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// 模擬 matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// 模擬 IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// 模擬 localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// 模擬 console 方法以避免測試輸出過多日誌
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
}

// 全域測試組件配置
config.global.stubs = {
  // 路由相關組件
  'router-link': true,
  'router-view': true,
  
  // 可能的第三方組件
  transition: false,
}

// 模擬 CSS 變數
Object.defineProperty(document.documentElement.style, 'setProperty', {
  value: vi.fn(),
})

// 模擬檔案 API
global.File = class File {
  constructor(bits: any[], name: string, options: any = {}) {
    this.name = name
    this.size = bits.reduce((acc, bit) => acc + bit.length, 0)
    this.type = options.type || ''
    this.lastModified = Date.now()
  }
  
  name: string
  size: number
  type: string
  lastModified: number
}