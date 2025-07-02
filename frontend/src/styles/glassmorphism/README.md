# MemoryArk Liquid Glass Design System

蘋果風格的 glassmorphism 設計系統，為 MemoryArk 提供現代、優雅的玻璃態視覺效果。

## 🎨 設計理念

基於蘋果 Liquid Glass 設計語言，提供：
- **半透明背景**：營造深度感和層次感
- **背景模糊**：使用 `backdrop-filter` 實現真實玻璃效果
- **柔和邊框**：半透明邊框增強玻璃質感
- **內陰影**：模擬玻璃的光線反射
- **適應性**：自動適應淺色和深色主題

## 🚀 快速開始

### 基本使用

```vue
<template>
  <!-- 使用預設玻璃卡片 -->
  <div class="glass-card">
    <h2>玻璃卡片標題</h2>
    <p>這是一個美麗的玻璃效果卡片</p>
  </div>
  
  <!-- 使用 Tailwind 工具類 -->
  <div class="backdrop-blur-glass-md bg-glass-auto border border-glass-auto rounded-xl p-6 shadow-glass-md">
    <p>自定義玻璃效果</p>
  </div>
</template>
```

### 導入樣式

在你的 CSS 檔案中導入：

```css
@import '../styles/glassmorphism/liquid-glass.scss';
@import '../styles/glassmorphism/tailwind-glass.scss';
```

## 📦 組件類別

### 1. 基礎玻璃效果

| 類別 | 描述 | 使用場景 |
|------|------|----------|
| `.glass-light` | 輕度玻璃效果 | 次要內容、背景元素 |
| `.glass-medium` | 中度玻璃效果 | 主要內容卡片 |
| `.glass-heavy` | 重度玻璃效果 | 重要內容、側邊欄 |
| `.glass-extra-heavy` | 超重度玻璃效果 | 模態框、彈出層 |

### 2. 預製組件

#### 玻璃卡片
```html
<div class="glass-card">
  <!-- 內容 -->
</div>
```

#### 玻璃按鈕
```html
<button class="glass-button">
  點擊我
</button>
```

#### 玻璃輸入框
```html
<input type="text" class="glass-input" placeholder="輸入內容">
```

#### 玻璃導航欄
```html
<nav class="glass-nav">
  <!-- 導航內容 -->
</nav>
```

#### 玻璃模態框
```html
<div class="glass-modal-backdrop">
  <div class="glass-modal">
    <!-- 模態框內容 -->
  </div>
</div>
```

### 3. 互動狀態

```html
<!-- 懸停效果 -->
<div class="glass-hover-light">懸停變亮</div>
<div class="glass-hover-medium">懸停變中</div>
<div class="glass-hover-heavy">懸停變重</div>

<!-- 活動狀態 -->
<div class="glass-active">激活狀態</div>
```

## 🛠 Tailwind 工具類

### 背景模糊

| 類別 | 模糊程度 | 用途 |
|------|----------|------|
| `.backdrop-blur-glass-none` | 0px | 無模糊 |
| `.backdrop-blur-glass-sm` | 4px | 輕微模糊 |
| `.backdrop-blur-glass-md` | 8px | 中等模糊 |
| `.backdrop-blur-glass-lg` | 12px | 強模糊 |
| `.backdrop-blur-glass-xl` | 16px | 超強模糊 |
| `.backdrop-blur-glass-2xl` | 24px | 極強模糊 |
| `.backdrop-blur-glass-3xl` | 32px | 最強模糊 |

### 玻璃背景

#### 白色玻璃背景
```html
<div class="bg-glass-white-light">  <!-- 10% 透明度 -->
<div class="bg-glass-white">        <!-- 20% 透明度 -->
<div class="bg-glass-white-strong"> <!-- 30% 透明度 -->
<div class="bg-glass-white-heavy">  <!-- 40% 透明度 -->
```

#### 黑色玻璃背景
```html
<div class="bg-glass-black-light">  <!-- 10% 透明度 -->
<div class="bg-glass-black">        <!-- 20% 透明度 -->
<div class="bg-glass-black-strong"> <!-- 30% 透明度 -->
<div class="bg-glass-black-heavy">  <!-- 40% 透明度 -->
```

#### 自適應玻璃背景（推薦）
```html
<div class="bg-glass-auto-light">   <!-- 自動適應主題，輕度 -->
<div class="bg-glass-auto">         <!-- 自動適應主題，中度 -->
<div class="bg-glass-auto-strong">  <!-- 自動適應主題，重度 -->
```

### 玻璃邊框

```html
<div class="border-glass-auto">         <!-- 自適應主題邊框 -->
<div class="border-glass-white">        <!-- 白色邊框 -->
<div class="border-glass-black">        <!-- 黑色邊框 -->
```

### 玻璃陰影

```html
<div class="shadow-glass-sm">   <!-- 小陰影 -->
<div class="shadow-glass-md">   <!-- 中陰影 -->
<div class="shadow-glass-lg">   <!-- 大陰影 -->
<div class="shadow-glass-xl">   <!-- 超大陰影 -->
<div class="shadow-glass-2xl">  <!-- 極大陰影 -->
```

## 🎭 動畫效果

### CSS 動畫類別

```html
<!-- 淡入動畫 -->
<div class="glass-fade-in glass-medium">
  淡入效果
</div>

<!-- 縮放進入動畫 -->
<div class="glass-scale-in glass-medium">
  縮放進入效果
</div>

<!-- 閃爍效果 -->
<div class="glass-shimmer glass-medium">
  閃爍效果
</div>
```

### Tailwind 動畫

```html
<div class="animate-glass-fade-in">淡入動畫</div>
<div class="animate-glass-scale-in">縮放動畫</div>
<div class="animate-glass-shimmer">閃爍動畫</div>
```

## 🌓 主題支援

系統自動適應深色和淺色主題：

```html
<!-- 自動適應主題的玻璃效果 -->
<div class="glass-card">
  在淺色主題下使用白色玻璃效果
  在深色主題下使用黑色玻璃效果
</div>

<!-- 手動指定主題 -->
<div class="glass-light bg-glass-white">強制白色玻璃</div>
<div class="glass-light bg-glass-black">強制黑色玻璃</div>
```

## 📱 響應式設計

### 移動端優化

在移動設備上，系統會自動：
- 減少模糊效果以提升性能
- 禁用反光效果節省資源
- 簡化動畫效果

```css
/* 移動端會自動應用這些優化 */
@media (max-width: 768px) {
  .glass-card {
    backdrop-filter: blur(4px); /* 減少模糊 */
  }
}
```

### 高性能模式

尊重使用者的減少動畫偏好：

```css
@media (prefers-reduced-motion: reduce) {
  .glass-card {
    backdrop-filter: none; /* 移除模糊效果 */
    background: rgba(255, 255, 255, 0.3); /* 使用純色背景 */
  }
}
```

## 🌐 瀏覽器支援

### 現代瀏覽器
- ✅ Chrome 76+
- ✅ Safari 14+
- ✅ Edge 79+
- ⚠️ Firefox（有限支援，會降級到純色背景）

### 降級方案

```css
/* 自動降級 */
@supports not (backdrop-filter: blur(1px)) {
  .glass-card {
    background: rgba(255, 255, 255, 0.3); /* 純色降級 */
  }
}
```

## 💡 最佳實踐

### ✅ 推薦做法

1. **層次分明**：使用不同強度的玻璃效果建立視覺層次
   ```html
   <div class="glass-light">    <!-- 背景層 -->
   <div class="glass-medium">   <!-- 內容層 -->
   <div class="glass-heavy">    <!-- 強調層 -->
   ```

2. **適當背景**：在有紋理或漸變的背景上使用玻璃效果
   ```css
   .background {
     background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
   }
   ```

3. **組合使用**：結合 Tailwind 工具類自定義效果
   ```html
   <div class="backdrop-blur-glass-md bg-glass-auto border border-glass-auto rounded-xl p-6 shadow-glass-md hover:backdrop-blur-glass-lg transition-all duration-300">
   ```

### ❌ 避免做法

1. **純色背景**：不要在純白或純黑背景上使用玻璃效果
2. **過度使用**：避免整個頁面都是玻璃效果
3. **低性能設備**：在老舊設備上謹慎使用重度玻璃效果

## 🎯 使用案例

### 1. 檔案管理卡片

```vue
<template>
  <div class="glass-card hover:glass-hover-medium transition-all duration-300 cursor-pointer">
    <div class="flex items-center space-x-4">
      <div class="glass-light p-3 rounded-lg">
        <FileIcon />
      </div>
      <div>
        <h3 class="font-semibold">document.pdf</h3>
        <p class="text-secondary text-sm">2.4 MB • 昨天</p>
      </div>
    </div>
  </div>
</template>
```

### 2. 導航欄

```vue
<template>
  <nav class="glass-nav fixed top-0 left-0 right-0 z-50">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-6">
        <img src="/logo.svg" alt="MemoryArk" class="h-8">
        <div class="hidden md:flex space-x-4">
          <a href="/" class="glass-button">首頁</a>
          <a href="/files" class="glass-button">檔案</a>
          <a href="/settings" class="glass-button">設定</a>
        </div>
      </div>
      <button class="glass-button">
        登入
      </button>
    </div>
  </nav>
</template>
```

### 3. 模態框

```vue
<template>
  <div class="glass-modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
    <div class="glass-modal max-w-md w-full mx-4">
      <h2 class="text-xl font-semibold mb-4">確認刪除</h2>
      <p class="text-secondary mb-6">確定要刪除這個檔案嗎？此操作無法復原。</p>
      <div class="flex space-x-4">
        <button class="glass-button flex-1">取消</button>
        <button class="glass-button bg-red-500 text-white flex-1">刪除</button>
      </div>
    </div>
  </div>
</template>
```

## 🔧 自定義玻璃效果

### 創建自定義玻璃組件

```css
.my-custom-glass {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 
    0 6px 20px rgba(0, 0, 0, 0.1),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  
  /* 反光效果 */
  position: relative;
  overflow: hidden;
}

.my-custom-glass::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.1) 20%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 1;
}

.my-custom-glass > * {
  position: relative;
  z-index: 2;
}
```

### 使用 CSS 變數

```css
.my-glass-component {
  backdrop-filter: blur(var(--glass-blur-md));
  background: var(--glass-bg-primary);
  border: 1px solid var(--glass-border-primary);
  box-shadow: var(--glass-shadow-md), var(--glass-inner-shadow-primary);
}
```

## 📊 性能考量

### 最佳化建議

1. **限制同時使用的玻璃元素數量**
2. **在移動設備上使用較輕的玻璃效果**
3. **避免在滾動容器中使用過多玻璃效果**
4. **使用 `will-change: backdrop-filter` 優化動畫性能**

```css
.optimized-glass {
  will-change: backdrop-filter;
  transition: backdrop-filter 0.3s ease;
}

.optimized-glass:hover {
  backdrop-filter: blur(12px);
}
```

## 🎨 設計代幣

所有玻璃效果都基於統一的設計代幣：

```css
:root {
  /* 模糊等級 */
  --glass-blur-sm: 4px;
  --glass-blur-md: 8px;
  --glass-blur-lg: 12px;
  --glass-blur-xl: 16px;
  
  /* 透明度等級 */
  --glass-opacity-light: 0.1;
  --glass-opacity-medium: 0.2;
  --glass-opacity-strong: 0.3;
  --glass-opacity-heavy: 0.4;
  
  /* 陰影 */
  --glass-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --glass-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
  --glass-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);
}
```

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request 來改善這個設計系統！

---

**Created with ❤️ for MemoryArk**  
*"簡潔是終極的復雜" - Leonardo da Vinci*