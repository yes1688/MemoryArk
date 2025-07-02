# MemoryArk 玻璃動畫系統使用指南

## 概述

MemoryArk 的玻璃動畫系統提供了一套完整的 Apple Liquid Glass 風格動畫效果，包括反光、呼吸、水波紋等精緻的互動動畫。本系統專為現代網頁設計，具有高性能優化和完整的無障礙支援。

## 核心動畫效果

### 1. Shimmer 反光動畫

模擬玻璃表面的光線反射效果。

```html
<!-- 基礎反光效果 -->
<div class="glass-card glass-shimmer">
  內容
</div>

<!-- 懸停觸發反光 -->
<div class="glass-card glass-shimmer-hover">
  懸停查看反光效果
</div>

<!-- 微妙反光（適合背景元素） -->
<div class="glass-nav glass-shimmer-subtle">
  導航欄
</div>
```

**變體類別：**
- `glass-shimmer` - 持續反光動畫
- `glass-shimmer-hover` - 懸停觸發反光
- `glass-shimmer-subtle` - 微妙反光效果

### 2. Breathing 呼吸動畫

為重要元素添加輕微的呼吸效果，增加活力感。

```html
<!-- 標準呼吸效果 -->
<div class="glass-card glass-breathe">
  重要內容
</div>

<!-- 輕柔呼吸（適合背景） -->
<div class="glass-light glass-breathe-gentle">
  背景元素
</div>

<!-- 光暈呼吸（適合選中狀態） -->
<div class="glass-card glass-breathe-glow">
  選中的項目
</div>

<!-- 懸停觸發呼吸 -->
<div class="glass-card glass-breathe-hover">
  懸停查看呼吸效果
</div>
```

**變體類別：**
- `glass-breathe` - 標準呼吸動畫
- `glass-breathe-gentle` - 輕柔呼吸
- `glass-breathe-glow` - 光暈呼吸
- `glass-breathe-hover` - 懸停觸發

### 3. Ripple 水波紋效果

點擊時的漣漪擴散動畫，提供觸覺反饋。

```html
<!-- 自動水波紋容器 -->
<button class="glass-button glass-ripple" @mousedown="handleRipple">
  點擊我
</button>

<!-- 手動水波紋（需要 JavaScript） -->
<div class="glass-card glass-ripple" @click="createRipple">
  自定義水波紋
</div>
```

**JavaScript 實現：**
```javascript
const handleRipple = (event) => {
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  const ripple = document.createElement('div')
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2
  
  ripple.classList.add('glass-ripple-effect')
  ripple.style.width = ripple.style.height = size + 'px'
  ripple.style.left = x + 'px'
  ripple.style.top = y + 'px'
  
  target.appendChild(ripple)
  
  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple)
    }
  }, 600)
}
```

### 4. 頁面進入動畫

優雅的頁面載入和元素出現動畫。

```html
<!-- 基礎淡入 -->
<div class="glass-fade-in">
  頁面內容
</div>

<!-- 縮放進入 -->
<div class="glass-scale-in">
  重要內容
</div>

<!-- 彈跳進入 -->
<div class="glass-bounce-in">
  突出內容
</div>

<!-- 使用 PageTransition 組件 -->
<PageTransition 
  transition-name="glass-page"
  :enable-stagger-animation="true"
>
  <div class="glass-stagger-item">項目 1</div>
  <div class="glass-stagger-item">項目 2</div>
  <div class="glass-stagger-item">項目 3</div>
</PageTransition>
```

### 5. 懸停和互動效果

增強的懸停狀態和焦點效果。

```html
<!-- 懸停升起 -->
<div class="glass-card glass-hover-lift">
  懸停我
</div>

<!-- 懸停光暈 -->
<div class="glass-card glass-hover-glow">
  光暈效果
</div>

<!-- 懸停增強 -->
<div class="glass-card glass-hover-enhance">
  增強效果
</div>

<!-- 焦點效果 -->
<input class="glass-input glass-focus" type="text" placeholder="輸入內容">
```

### 6. 載入動畫

玻璃風格的載入狀態動畫。

```html
<!-- 脈沖載入 -->
<div class="glass-card glass-loading-pulse">
  載入中...
</div>

<!-- 旋轉載入 -->
<div class="glass-button glass-loading-spin">
  <svg class="w-4 h-4">...</svg>
</div>
```

## 性能優化

### 1. 基礎優化類別

```html
<!-- 為動畫元素添加性能優化 -->
<div class="glass-card glass-optimized">
  高性能玻璃效果
</div>
```

### 2. 動畫延遲控制

```html
<!-- 交錯動畫 -->
<div class="glass-fade-in glass-stagger-1">項目 1</div>
<div class="glass-fade-in glass-stagger-2">項目 2</div>
<div class="glass-fade-in glass-stagger-3">項目 3</div>

<!-- 自定義延遲 -->
<div class="glass-scale-in glass-delay-normal">延遲動畫</div>
```

### 3. 持續時間控制

```html
<!-- 快速動畫 -->
<div class="glass-fade-in glass-duration-fast">快速淡入</div>

<!-- 慢速動畫 -->
<div class="glass-scale-in glass-duration-slow">慢速縮放</div>
```

## 響應式和無障礙

### 1. 移動端優化

系統自動在移動設備上：
- 降低模糊效果以提升性能
- 禁用反光效果
- 減少動畫持續時間

### 2. 減少動畫偏好

支援 `prefers-reduced-motion: reduce` 設定：
- 自動禁用所有動畫
- 保持靜態玻璃效果
- 確保功能可用性

### 3. 高對比度模式

在高對比度模式下：
- 增強邊框可見性
- 調整背景透明度
- 保持設計可讀性

## Vue 組件集成

### 1. FileCard 組件示例

```vue
<template>
  <div 
    class="glass-card glass-optimized glass-hover-lift glass-shimmer-hover glass-ripple"
    :class="{ 'glass-breathe-glow': isSelected }"
    @mousedown="handleRippleEffect"
  >
    <!-- 卡片內容 -->
  </div>
</template>

<script setup>
const handleRippleEffect = (event) => {
  // 水波紋實現
}
</script>
```

### 2. Modal 組件示例

```vue
<template>
  <Transition name="glass-modal" @enter="onModalEnter">
    <div v-if="visible" class="glass-overlay glass-fade-in">
      <div class="glass-modal glass-scale-in glass-optimized">
        <!-- 模態內容 -->
      </div>
    </div>
  </Transition>
</template>
```

### 3. Button 組件示例

```vue
<template>
  <button 
    class="glass-button glass-hover-enhance glass-ripple"
    @mousedown="handleRippleEffect"
  >
    <slot />
  </button>
</template>
```

## 最佳實踐

### 1. 性能考量

- 避免同時運行過多動畫
- 使用 `will-change` 和 `contain` 屬性
- 在移動設備上限制模糊效果
- 優先使用 `transform` 和 `opacity` 屬性

### 2. 設計一致性

- 為相似元素使用相同的動畫效果
- 保持動畫時間和緩動函數一致
- 避免過度使用動畫

### 3. 無障礙考量

- 始終測試 `prefers-reduced-motion` 支援
- 確保動畫不會干擾內容可讀性
- 提供替代的視覺反饋

### 4. 瀏覽器相容性

- 系統自動處理 Firefox 和 IE 降級
- 測試不支援 backdrop-filter 的瀏覽器
- 提供合適的 fallback 樣式

## 調試和測試

### 1. 性能監控

```javascript
// 檢查 FPS
const monitorFPS = () => {
  // 實現見 PerformanceOptimizedAnimations.vue
}

// 檢查動畫數量
const countAnimations = () => {
  return document.querySelectorAll('[style*="animation"]').length
}
```

### 2. 功能測試

- 測試所有動畫在不同設備上的表現
- 驗證 `prefers-reduced-motion` 行為
- 檢查高對比度模式顯示

### 3. 性能測試

- 使用 Chrome DevTools 監控性能
- 測試大量元素的動畫表現
- 檢查 GPU 記憶體使用

## 常見問題

### Q: 動畫不流暢怎麼辦？
A: 檢查是否使用了 `glass-optimized` 類別，確保元素具有 `will-change` 屬性。

### Q: 在移動設備上性能差？
A: 系統會自動優化，也可以手動減少模糊效果或禁用某些動畫。

### Q: 如何自定義動畫時間？
A: 使用 `glass-duration-*` 類別或直接設定 CSS 變數。

### Q: 水波紋效果不顯示？
A: 確保容器具有 `position: relative` 和 `overflow: hidden` 屬性。

## 更新日誌

### v1.0.0 (2025-07-02)
- 初始發布
- 包含完整的玻璃動畫系統
- 支援 Shimmer、Breathing、Ripple 效果
- 完整的性能優化和無障礙支援