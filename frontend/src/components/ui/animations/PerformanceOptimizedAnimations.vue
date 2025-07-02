<template>
  <div class="performance-animation-container glass-optimized">
    <!-- 高性能玻璃動畫示例 -->
    <div 
      class="demo-element glass-card glass-hover-lift glass-shimmer-hover"
      :class="{
        'glass-breathe-glow': showBreathing,
        'glass-loading-pulse': isLoading
      }"
      @click="handleClick"
      @mousedown="handleRippleEffect"
    >
      <h3>性能優化的玻璃動畫</h3>
      <p>點擊測試水波紋效果</p>
      
      <!-- 性能監控顯示 -->
      <div v-if="showMetrics" class="metrics-display glass-light">
        <div>FPS: {{ currentFPS }}</div>
        <div>動畫數量: {{ activeAnimations }}</div>
        <div>GPU 記憶體: {{ gpuMemory }}MB</div>
      </div>
    </div>
    
    <!-- 控制面板 -->
    <div class="controls glass-medium">
      <button @click="toggleBreathing" class="glass-button">
        {{ showBreathing ? '停止' : '開始' }}呼吸動畫
      </button>
      <button @click="toggleLoading" class="glass-button">
        {{ isLoading ? '停止' : '開始' }}載入動畫
      </button>
      <button @click="toggleMetrics" class="glass-button">
        {{ showMetrics ? '隱藏' : '顯示' }}性能指標
      </button>
      <button @click="runPerformanceTest" class="glass-button">
        運行性能測試
      </button>
    </div>
    
    <!-- 性能建議 -->
    <div class="performance-tips glass-light">
      <h4>性能優化建議：</h4>
      <ul>
        <li>使用 <code>will-change</code> 和 <code>contain</code> 屬性</li>
        <li>避免同時運行過多動畫</li>
        <li>在移動設備上減少模糊效果</li>
        <li>支援 <code>prefers-reduced-motion</code> 設定</li>
        <li>使用 <code>transform</code> 和 <code>opacity</code> 而非 layout 屬性</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 狀態管理
const showBreathing = ref(false)
const isLoading = ref(false)
const showMetrics = ref(false)
const currentFPS = ref(60)
const activeAnimations = ref(0)
const gpuMemory = ref(0)

// 性能監控變數
let frameCount = 0
let lastTime = performance.now()
let animationFrameId: number

// FPS 計算
const calculateFPS = () => {
  frameCount++
  const currentTime = performance.now()
  
  if (currentTime >= lastTime + 1000) {
    currentFPS.value = Math.round((frameCount * 1000) / (currentTime - lastTime))
    frameCount = 0
    lastTime = currentTime
  }
  
  animationFrameId = requestAnimationFrame(calculateFPS)
}

// 檢測動畫數量
const countActiveAnimations = () => {
  const elements = document.querySelectorAll('[style*="animation"], .glass-breathe, .glass-shimmer, .glass-loading-pulse')
  activeAnimations.value = elements.length
}

// 估算 GPU 記憶體使用（簡化版）
const estimateGPUMemory = () => {
  // 這是一個簡化的估算，實際應該使用 WebGL 擴展
  const blurElements = document.querySelectorAll('[style*="backdrop-filter"], .glass-blur-md, .glass-blur-lg')
  gpuMemory.value = Math.round(blurElements.length * 2.5) // 大約每個模糊元素 2.5MB
}

// 控制函數
const toggleBreathing = () => {
  showBreathing.value = !showBreathing.value
}

const toggleLoading = () => {
  isLoading.value = !isLoading.value
}

const toggleMetrics = () => {
  showMetrics.value = !showMetrics.value
  if (showMetrics.value) {
    startMetricsTracking()
  } else {
    stopMetricsTracking()
  }
}

const startMetricsTracking = () => {
  calculateFPS()
  setInterval(() => {
    countActiveAnimations()
    estimateGPUMemory()
  }, 1000)
}

const stopMetricsTracking = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
}

// 性能測試
const runPerformanceTest = async () => {
  console.log('開始性能測試...')
  
  // 測試 1: 大量水波紋效果
  const startTime = performance.now()
  
  for (let i = 0; i < 50; i++) {
    await new Promise(resolve => setTimeout(resolve, 10))
    createTestRipple()
  }
  
  const endTime = performance.now()
  console.log(`50 個水波紋效果耗時: ${endTime - startTime}ms`)
  
  // 測試 2: GPU 資源使用
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl')
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      console.log('GPU 資訊:', {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      })
    }
  }
  
  // 測試 3: 記憶體使用
  if ('memory' in performance) {
    console.log('記憶體使用:', (performance as any).memory)
  }
}

// 測試用水波紋
const createTestRipple = () => {
  const container = document.querySelector('.demo-element') as HTMLElement
  if (!container) return
  
  const ripple = document.createElement('div')
  ripple.classList.add('glass-ripple-effect')
  ripple.style.width = ripple.style.height = '100px'
  ripple.style.left = Math.random() * 200 + 'px'
  ripple.style.top = Math.random() * 100 + 'px'
  
  container.appendChild(ripple)
  
  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple)
    }
  }, 600)
}

// 水波紋效果處理
const handleClick = (event: MouseEvent) => {
  console.log('點擊事件觸發')
}

const handleRippleEffect = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const ripple = document.createElement('div')
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2
  
  ripple.classList.add('glass-ripple-effect')
  ripple.style.width = ripple.style.height = size + 'px'
  ripple.style.left = x + 'px'
  ripple.style.top = y + 'px'
  
  // 性能優化：使用 will-change
  ripple.style.willChange = 'transform, opacity'
  
  const computedStyle = window.getComputedStyle(target)
  if (computedStyle.position === 'static') {
    target.style.position = 'relative'
  }
  target.style.overflow = 'hidden'
  
  target.appendChild(ripple)
  
  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple)
    }
  }, 600)
}

// 生命週期
onMounted(() => {
  // 檢查瀏覽器支援
  console.log('瀏覽器支援檢查:')
  console.log('backdrop-filter 支援:', CSS.supports('backdrop-filter', 'blur(1px)'))
  console.log('will-change 支援:', CSS.supports('will-change', 'transform'))
  console.log('contain 支援:', CSS.supports('contain', 'layout'))
  
  // 檢查用戶偏好
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) {
    console.log('用戶偏好減少動畫，已自動優化')
  }
})

onUnmounted(() => {
  stopMetricsTracking()
})
</script>

<style scoped>
.performance-animation-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.demo-element {
  position: relative;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  
  /* 性能優化 */
  will-change: transform, opacity, backdrop-filter;
  contain: layout style paint;
}

.metrics-display {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  font-family: monospace;
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.controls {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.controls .glass-button {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  
  /* 性能優化 */
  will-change: transform, opacity;
}

.controls .glass-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.performance-tips {
  padding: 1.5rem;
  border-radius: 0.75rem;
}

.performance-tips h4 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.performance-tips ul {
  margin: 0;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.performance-tips li {
  margin: 0.5rem 0;
  line-height: 1.5;
}

.performance-tips code {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .performance-animation-container {
    padding: 1rem;
  }
  
  .demo-element {
    min-height: 150px;
    padding: 1.5rem;
  }
  
  .controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .metrics-display {
    position: static;
    margin-top: 1rem;
  }
}

/* 高對比度模式 */
@media (prefers-contrast: high) {
  .demo-element,
  .controls,
  .performance-tips {
    border: 2px solid currentColor;
    background: var(--glass-bg-primary-strong);
  }
}

/* 減少動畫偏好 */
@media (prefers-reduced-motion: reduce) {
  .demo-element {
    will-change: auto;
  }
  
  .controls .glass-button:hover {
    transform: none;
  }
  
  /* 禁用所有玻璃動畫 */
  .demo-element.glass-breathe-glow,
  .demo-element.glass-loading-pulse {
    animation: none !important;
  }
}
</style>