# 任務 006：優化視覺效果

## 任務概述
為 MemoryArk 2.0 加入精緻的動畫、過渡效果和微互動，提升整體視覺體驗，並確保在各種裝置上都有良好的顯示效果。

## 依賴項目
- 任務 001-005：所有基礎功能必須先完成

## 設計原則
- **流暢自然**：動畫要順滑且有意義
- **適度克制**：避免過度動畫影響使用
- **性能優先**：確保動畫不影響效能
- **一致性**：保持整體動畫風格統一

## 子任務詳細說明

### 6.1 動畫系統設計

**建立統一的動畫變數**：
```scss
// animations.scss
:root {
  // 時間曲線
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  
  // 持續時間
  --duration-fast: 150ms;
  --duration-base: 300ms;
  --duration-slow: 500ms;
  --duration-slower: 1000ms;
  
  // 延遲
  --delay-short: 50ms;
  --delay-base: 100ms;
  --delay-long: 200ms;
}

// 可重用的動畫類
.transition-all {
  transition: all var(--duration-base) var(--ease-in-out);
}

.transition-colors {
  transition: color var(--duration-fast) var(--ease-in-out),
              background-color var(--duration-fast) var(--ease-in-out),
              border-color var(--duration-fast) var(--ease-in-out);
}

.transition-transform {
  transition: transform var(--duration-base) var(--ease-out);
}

.transition-opacity {
  transition: opacity var(--duration-base) var(--ease-in-out);
}
```

**Vue 過渡組件封裝**：
```vue
<!-- FadeTransition.vue -->
<template>
  <Transition
    name="fade"
    :duration="duration"
    @before-enter="beforeEnter"
    @enter="enter"
    @leave="leave"
  >
    <slot />
  </Transition>
</template>

<script setup>
const props = defineProps({
  duration: { type: Number, default: 300 }
})

const beforeEnter = (el) => {
  el.style.opacity = '0'
}

const enter = (el, done) => {
  el.offsetHeight // 強制重排
  el.style.transition = `opacity ${props.duration}ms ease-in-out`
  el.style.opacity = '1'
  setTimeout(done, props.duration)
}

const leave = (el, done) => {
  el.style.transition = `opacity ${props.duration}ms ease-in-out`
  el.style.opacity = '0'
  setTimeout(done, props.duration)
}
</script>
```

### 6.2 頁面切換動畫

**路由過渡效果**：
```vue
<!-- App.vue -->
<template>
  <div id="app">
    <router-view v-slot="{ Component, route }">
      <Transition
        :name="transitionName"
        mode="out-in"
        @before-leave="beforeLeave"
        @enter="onEnter"
        @after-enter="afterEnter"
      >
        <component 
          :is="Component" 
          :key="route.path"
          class="page-component"
        />
      </Transition>
    </router-view>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const transitionName = ref('slide-left')

// 根據路由方向決定動畫
watch(() => route.path, (newPath, oldPath) => {
  const newDepth = newPath.split('/').length
  const oldDepth = oldPath.split('/').length
  transitionName.value = newDepth > oldDepth ? 'slide-left' : 'slide-right'
})
</script>

<style>
/* 滑動過渡 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### 6.3 載入動畫

**骨架屏組件**：
```vue
<!-- SkeletonLoader.vue -->
<template>
  <div class="skeleton-loader" :class="type">
    <div v-if="type === 'card'" class="skeleton-card">
      <div class="skeleton-image shimmer"></div>
      <div class="skeleton-content">
        <div class="skeleton-title shimmer"></div>
        <div class="skeleton-text shimmer"></div>
        <div class="skeleton-text shimmer" style="width: 80%"></div>
      </div>
    </div>
    
    <div v-else-if="type === 'list'" class="skeleton-list">
      <div v-for="i in rows" :key="i" class="skeleton-list-item">
        <div class="skeleton-avatar shimmer"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line shimmer"></div>
          <div class="skeleton-line shimmer" style="width: 60%"></div>
        </div>
      </div>
    </div>
    
    <div v-else-if="type === 'table'" class="skeleton-table">
      <div class="skeleton-table-header">
        <div v-for="i in columns" :key="i" class="skeleton-cell shimmer"></div>
      </div>
      <div v-for="i in rows" :key="i" class="skeleton-table-row">
        <div v-for="j in columns" :key="j" class="skeleton-cell shimmer"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}

.shimmer {
  background: linear-gradient(
    to right,
    #f0f0f0 8%,
    #f8f8f8 18%,
    #f0f0f0 33%
  );
  background-size: 800px 100px;
  animation: shimmer 1.5s infinite linear;
}
</style>
```

**進度指示器**：
```vue
<!-- ProgressIndicator.vue -->
<template>
  <div class="progress-indicator">
    <!-- 頂部進度條 -->
    <div 
      v-if="type === 'bar'" 
      class="progress-bar"
      :class="{ indeterminate: !percentage }"
    >
      <div 
        class="progress-fill"
        :style="{ width: percentage ? `${percentage}%` : '100%' }"
      />
    </div>
    
    <!-- 圓形進度 -->
    <div v-else-if="type === 'circle'" class="progress-circle">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
        <circle
          class="progress-track"
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :stroke-width="strokeWidth"
        />
        <circle
          class="progress-fill"
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :stroke-width="strokeWidth"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          transform="rotate(-90 ${center} ${center})"
        />
      </svg>
      <div class="progress-text" v-if="showText">
        {{ percentage }}%
      </div>
    </div>
    
    <!-- 點狀載入 -->
    <div v-else-if="type === 'dots'" class="progress-dots">
      <span v-for="i in 3" :key="i" class="dot" :style="{ animationDelay: `${i * 0.15}s` }"></span>
    </div>
  </div>
</template>

<style scoped>
/* 進度條動畫 */
.progress-bar {
  @apply h-1 bg-gray-200 rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-blue-500 rounded-full;
  transition: width 0.3s ease;
}

.indeterminate .progress-fill {
  animation: indeterminate 1.5s infinite;
}

@keyframes indeterminate {
  0% {
    width: 0;
    margin-left: 0;
  }
  50% {
    width: 50%;
    margin-left: 25%;
  }
  100% {
    width: 0;
    margin-left: 100%;
  }
}

/* 點狀載入動畫 */
.progress-dots {
  @apply flex space-x-2;
}

.dot {
  @apply w-2 h-2 bg-blue-500 rounded-full;
  animation: bounce 1.4s infinite ease-in-out both;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>
```

### 6.4 微互動效果

**按鈕點擊波紋效果**：
```vue
<!-- RippleEffect.vue -->
<template>
  <div class="ripple-container" @click="createRipple">
    <slot />
    <span
      v-for="ripple in ripples"
      :key="ripple.id"
      class="ripple"
      :style="{
        left: ripple.x + 'px',
        top: ripple.y + 'px',
        width: ripple.size + 'px',
        height: ripple.size + 'px'
      }"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const ripples = ref([])
let nextId = 0

const createRipple = (e) => {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  
  const ripple = {
    id: nextId++,
    x: e.clientX - rect.left - size / 2,
    y: e.clientY - rect.top - size / 2,
    size
  }
  
  ripples.value.push(ripple)
  
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== ripple.id)
  }, 600)
}
</script>

<style scoped>
.ripple-container {
  position: relative;
  overflow: hidden;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: scale(0);
  animation: ripple 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple {
  to {
    transform: scale(1);
    opacity: 0;
  }
}
</style>
```

**懸停效果**：
```scss
// 卡片懸停效果
.card-hover {
  @apply transition-all duration-300 ease-out;
  
  &:hover {
    @apply transform -translate-y-1 shadow-lg;
  }
}

// 圖片懸停縮放
.image-hover {
  @apply overflow-hidden;
  
  img {
    @apply transition-transform duration-500 ease-out;
  }
  
  &:hover img {
    @apply transform scale-110;
  }
}

// 文字懸停下劃線
.link-hover {
  @apply relative;
  
  &::after {
    content: '';
    @apply absolute bottom-0 left-0 w-0 h-0.5 bg-current;
    @apply transition-all duration-300 ease-out;
  }
  
  &:hover::after {
    @apply w-full;
  }
}
```

### 6.5 拖放視覺反饋

**拖放區域組件**：
```vue
<!-- DragDropZone.vue -->
<template>
  <div
    class="drag-drop-zone"
    :class="{
      'is-dragging': isDragging,
      'is-over': isOver,
      'is-invalid': isInvalid
    }"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <transition name="scale">
      <div v-if="isOver" class="drop-indicator">
        <Icon :name="isInvalid ? 'x-circle' : 'check-circle'" />
        <p>{{ dropMessage }}</p>
      </div>
    </transition>
    
    <slot :isDragging="isDragging" :isOver="isOver" />
  </div>
</template>

<style scoped>
.drag-drop-zone {
  @apply relative transition-all duration-300;
}

.drag-drop-zone.is-dragging {
  @apply border-2 border-dashed border-gray-400;
}

.drag-drop-zone.is-over {
  @apply border-blue-500 bg-blue-50;
}

.drag-drop-zone.is-invalid {
  @apply border-red-500 bg-red-50;
}

.drop-indicator {
  @apply absolute inset-0 flex flex-col items-center justify-center;
  @apply bg-white bg-opacity-90 rounded-lg;
}

/* 縮放動畫 */
.scale-enter-active,
.scale-leave-active {
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.scale-enter-from,
.scale-leave-to {
  transform: scale(0.8);
  opacity: 0;
}
</style>
```

### 6.6 響應式設計增強

**自適應佈局系統**：
```scss
// 響應式工具類
@mixin responsive($breakpoint) {
  @if $breakpoint == 'sm' {
    @media (min-width: 640px) { @content; }
  } @else if $breakpoint == 'md' {
    @media (min-width: 768px) { @content; }
  } @else if $breakpoint == 'lg' {
    @media (min-width: 1024px) { @content; }
  } @else if $breakpoint == 'xl' {
    @media (min-width: 1280px) { @content; }
  } @else if $breakpoint == '2xl' {
    @media (min-width: 1536px) { @content; }
  }
}

// 容器組件
.container {
  @apply mx-auto px-4;
  
  @include responsive('sm') { @apply px-6; }
  @include responsive('lg') { @apply px-8; }
  @include responsive('xl') { max-width: 1280px; }
}

// 響應式網格
.responsive-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  
  @include responsive('md') {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
  
  @include responsive('lg') {
    gap: 1.5rem;
  }
}
```

**移動端手勢支援**：
```typescript
// 使用 @vueuse/core 的手勢支援
import { useSwipe } from '@vueuse/core'

export function useMobileGestures(el: Ref<HTMLElement>) {
  const { direction, lengthX, lengthY } = useSwipe(el, {
    threshold: 50,
    onSwipeEnd: (e, direction) => {
      if (direction === 'left') {
        // 左滑操作
        showNextPage()
      } else if (direction === 'right') {
        // 右滑操作
        showPrevPage()
      } else if (direction === 'down' && lengthY > 100) {
        // 下拉刷新
        refreshContent()
      }
    }
  })
  
  return { direction, lengthX, lengthY }
}
```

### 6.7 無障礙設計實作

**鍵盤導航增強**：
```vue
<!-- KeyboardNavigation.vue -->
<template>
  <div
    ref="container"
    @keydown="handleKeydown"
    tabindex="0"
    role="navigation"
    :aria-label="ariaLabel"
  >
    <slot />
  </div>
</template>

<script setup>
const props = defineProps({
  items: Array,
  ariaLabel: String
})

const currentIndex = ref(0)

const handleKeydown = (e) => {
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      navigateUp()
      break
    case 'ArrowDown':
      e.preventDefault()
      navigateDown()
      break
    case 'Enter':
      e.preventDefault()
      selectCurrent()
      break
    case 'Escape':
      e.preventDefault()
      clearSelection()
      break
  }
}

// 焦點管理
const focusItem = (index) => {
  const items = container.value.querySelectorAll('[role="menuitem"]')
  items[index]?.focus()
}
</script>
```

**ARIA 標籤和狀態**：
```vue
<!-- 無障礙檔案卡片 -->
<template>
  <article
    class="file-card"
    role="article"
    :aria-label="`檔案：${file.name}`"
    :aria-selected="isSelected"
    tabindex="0"
  >
    <div class="file-icon" role="img" :aria-label="`${file.type} 檔案`">
      <FileIcon :type="file.type" />
    </div>
    
    <h3 class="file-name">{{ file.name }}</h3>
    
    <div class="file-actions" role="toolbar" aria-label="檔案操作">
      <button
        aria-label="下載檔案"
        :aria-disabled="!canDownload"
        @click="download"
      >
        <Icon name="download" />
        <span class="sr-only">下載</span>
      </button>
      
      <button
        :aria-label="isFavorite ? '取消收藏' : '加入收藏'"
        @click="toggleFavorite"
      >
        <Icon :name="isFavorite ? 'star-filled' : 'star'" />
      </button>
    </div>
    
    <!-- 狀態公告 -->
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      {{ statusMessage }}
    </div>
  </article>
</template>
```

### 6.8 深色模式支援

**主題切換系統**：
```typescript
// composables/useTheme.ts
export function useTheme() {
  const theme = ref<'light' | 'dark' | 'auto'>('auto')
  const prefersDark = usePreferredDark()
  
  const isDark = computed(() => {
    if (theme.value === 'auto') {
      return prefersDark.value
    }
    return theme.value === 'dark'
  })
  
  // 應用主題
  watchEffect(() => {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  })
  
  return {
    theme,
    isDark,
    toggleTheme: () => {
      const themes = ['light', 'dark', 'auto']
      const currentIndex = themes.indexOf(theme.value)
      theme.value = themes[(currentIndex + 1) % themes.length]
    }
  }
}
```

**深色模式樣式**：
```scss
// 深色模式變數
.dark {
  --color-bg: #1a1a1a;
  --color-bg-secondary: #2d2d2d;
  --color-text: #e4e4e4;
  --color-text-secondary: #a0a0a0;
  --color-border: #404040;
  --color-primary: #4a9eff;
  --color-primary-dark: #3182ce;
}

// 組件深色模式適配
.card {
  @apply bg-white dark:bg-gray-800;
  @apply text-gray-900 dark:text-gray-100;
  @apply border-gray-200 dark:border-gray-700;
}
```

## 效能優化考量

1. **使用 CSS 動畫**：優先使用 CSS 而非 JavaScript 動畫
2. **GPU 加速**：使用 transform 和 opacity 觸發硬體加速
3. **防抖節流**：滾動和調整大小事件使用防抖
4. **條件載入**：根據裝置能力載入不同級別的動畫

## 實作順序

1. **第一天**：
   - 建立動畫系統和變數
   - 實作基礎過渡組件
   - 完成頁面切換動畫

2. **第二天**：
   - 實作載入動畫和骨架屏
   - 完成微互動效果
   - 加入拖放視覺反饋

3. **第三天**：
   - 優化響應式設計
   - 實作無障礙功能
   - 加入深色模式支援

## 測試要點

- [x] 動畫在不同瀏覽器流暢運行 ✅
- [x] 響應式設計在各種裝置正常 ✅
- [x] 鍵盤導航完全可用 ✅
- [x] 螢幕閱讀器相容性良好 ✅
- [x] 深色模式切換無閃爍 ✅

## 完成標準

- [x] 所有動畫流暢自然 ✅
- [x] 微互動提升使用體驗 ✅
- [x] 響應式設計完善 ✅
- [x] 符合 WCAG 2.1 AA 標準 ✅
- [x] 效能影響最小化 ✅

## 實際完成功能

### ✅ 已完成的組件和功能

1. **動畫系統** (`src/styles/animations.scss`)
   - 完整的 CSS 變數系統
   - Windows 11 風格的緩動函數
   - 可重複使用的動畫類

2. **過渡組件**
   - `FadeTransition.vue` - 淡入淡出過渡
   - `SlideTransition.vue` - 滑動過渡

3. **載入組件**
   - `SkeletonLoader.vue` - 多種佈局的骨架屏
   - `ProgressIndicator.vue` - 5種載入動畫類型

4. **互動效果**
   - `RippleEffect.vue` - Material Design 波紋效果

5. **響應式系統**
   - `ResponsiveContainer.vue` - 智能斷點檢測
   - `useMediaQuery.ts` - 媒體查詢 composable
   - `useResizeObserver.ts` - 尺寸監聽 composable

6. **無障礙功能**
   - `KeyboardNav.vue` - 完整鍵盤導航支援
   - ARIA 標籤和語意化標記
   - 焦點管理和跳過連結

7. **主題系統**
   - `ThemeProvider.vue` - 主題提供者組件
   - `useTheme.ts` - 主題管理 composable
   - 深色模式完整支援

8. **整合優化**
   - 更新 `App.vue` 整合所有新功能
   - 完善組件匯出
   - 路由過渡動畫

**狀態：🟢 已完成** (2025-01-07)