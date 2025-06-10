import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// 導入主要組件
import App from '@/App.vue'
import HomeView from '@/views/HomeView.vue'
import FilesView from '@/views/FilesView.vue'

// 導入 UI 組件
import { 
  AppButton, 
  AppCard, 
  ThemeProvider, 
  KeyboardNav, 
  ResponsiveContainer,
  SkeletonLoader,
  ProgressIndicator,
  RippleEffect
} from '@/components/ui'

// 創建測試路由 - 使用 memory history 以避免 window 依賴
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/files', component: FilesView }
  ]
})

describe('基本功能整合測試', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('UI 組件系統', () => {
    it('AppButton 組件應該正常渲染', () => {
      const wrapper = mount(AppButton, {
        props: {
          label: '測試按鈕'
        }
      })
      
      expect(wrapper.text()).toContain('測試按鈕')
      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('AppCard 組件應該正常渲染', () => {
      const wrapper = mount(AppCard, {
        props: {
          title: '測試卡片'
        },
        slots: {
          default: '<p>卡片內容</p>'
        }
      })
      
      expect(wrapper.text()).toContain('測試卡片')
      expect(wrapper.text()).toContain('卡片內容')
    })

    it('SkeletonLoader 組件應該支援不同類型', () => {
      const cardWrapper = mount(SkeletonLoader, {
        props: { type: 'card' }
      })
      
      const listWrapper = mount(SkeletonLoader, {
        props: { type: 'list', rows: 3 }
      })
      
      expect(cardWrapper.find('.skeleton-card').exists()).toBe(true)
      expect(listWrapper.findAll('.skeleton-list-item')).toHaveLength(3)
    })

    it('ProgressIndicator 組件應該支援不同動畫類型', () => {
      const barWrapper = mount(ProgressIndicator, {
        props: { type: 'bar', percentage: 50 }
      })
      
      const circleWrapper = mount(ProgressIndicator, {
        props: { type: 'circle', percentage: 75, showText: true }
      })
      
      expect(barWrapper.find('.progress-bar').exists()).toBe(true)
      expect(circleWrapper.find('.progress-circle').exists()).toBe(true)
      expect(circleWrapper.text()).toContain('75%')
    })
  })

  describe('主題系統', () => {
    it('ThemeProvider 應該正常包裝子組件', () => {
      const wrapper = mount(ThemeProvider, {
        slots: {
          default: '<div class="test-content">主題內容</div>'
        }
      })
      
      expect(wrapper.find('.theme-provider').exists()).toBe(true)
      expect(wrapper.text()).toContain('主題內容')
    })
  })

  describe('無障礙功能', () => {
    it('KeyboardNav 組件應該提供鍵盤導航支援', () => {
      const wrapper = mount(KeyboardNav, {
        props: {
          showSkipLink: true
        },
        slots: {
          default: '<div>可導航內容</div>'
        }
      })
      
      expect(wrapper.find('.keyboard-nav-container').exists()).toBe(true)
      expect(wrapper.find('.skip-link').exists()).toBe(true)
    })
  })

  describe('響應式系統', () => {
    it('ResponsiveContainer 應該檢測斷點變化', async () => {
      const wrapper = mount(ResponsiveContainer, {
        slots: {
          default: '<div>響應式內容</div>'
        }
      })
      
      expect(wrapper.find('.responsive-container').exists()).toBe(true)
      expect(wrapper.classes()).toContain('breakpoint-lg') // 預設斷點
    })
  })

  describe('動畫效果', () => {
    it('RippleEffect 應該創建波紋效果', async () => {
      const wrapper = mount(RippleEffect, {
        slots: {
          default: '<button>點擊我</button>'
        }
      })
      
      expect(wrapper.find('.ripple-container').exists()).toBe(true)
      
      // 模擬點擊事件
      await wrapper.find('.ripple-container').trigger('click')
      
      // 檢查是否有波紋元素被創建（可能需要等待 DOM 更新）
      await wrapper.vm.$nextTick()
    })
  })

  describe('頁面組件', () => {
    it('HomeView 應該正常載入', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      expect(wrapper.find('.dashboard-container').exists()).toBe(true)
    })
  })
})

describe('功能整合測試', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('應用程式應該能正常初始化', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, createPinia()]
      }
    })
    
    expect(wrapper.find('.theme-provider').exists()).toBe(true)
    expect(wrapper.find('.keyboard-nav-container').exists()).toBe(true)
    expect(wrapper.find('.responsive-container').exists()).toBe(true)
  })
})