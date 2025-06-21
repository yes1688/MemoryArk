# MemoryArk 信徒版 UI 設計系統

## 🎨 設計理念

### 核心設計原則
1. **簡潔友善** - 降低使用門檻，鼓勵信徒參與
2. **一致性** - 統一的視覺語言和交互模式
3. **響應式** - 跨設備無縫體驗
4. **無障礙** - 考慮各年齡層使用需求
5. **溫馨感** - 體現教會社群的溫暖氛圍

### 設計主題：「分享的喜悅」
- 以照片分享為核心的溫馨設計
- 柔和的色彩搭配營造親和力
- 直觀的圖標和操作流程
- 鼓勵性的文案和視覺反饋

---

## 🌈 色彩系統

### 主色調 (Primary Colors)
```scss
// 繼承現有 MemoryArk 品牌色
$primary-blue: #2563eb;           // 深藍色 - 信任、穩重
$primary-gold: #f59e0b;           // 金色 - 溫暖、價值

// 信徒版專用輔助色
$believer-accent: #3b82f6;       // 亮藍色 - 活潑、參與
$believer-success: #10b981;      // 綠色 - 成功、成長
$believer-warm: #f97316;         // 橙色 - 熱情、分享
```

### 中性色 (Neutral Colors)
```scss
// 背景色
$bg-primary: #ffffff;            // 主背景 - 純淨
$bg-secondary: #f8fafc;         // 次要背景 - 柔和
$bg-elevated: #ffffff;          // 卡片背景 - 突出
$bg-overlay: rgba(0,0,0,0.6);   // 遮罩背景 - 聚焦

// 文字色
$text-primary: #1e293b;         // 主要文字 - 清晰
$text-secondary: #64748b;       // 次要文字 - 輔助
$text-tertiary: #94a3b8;       // 第三文字 - 說明
$text-inverse: #ffffff;         // 反色文字 - 對比

// 邊框色
$border-light: #e2e8f0;         // 淺邊框 - 分隔
$border-medium: #cbd5e1;        // 中邊框 - 框選
$border-dark: #64748b;          // 深邊框 - 強調
```

### 語義色 (Semantic Colors)
```scss
// 狀態色
$success: #10b981;              // 成功 - 上傳完成
$warning: #f59e0b;              // 警告 - 容量不足
$error: #ef4444;                // 錯誤 - 上傳失敗
$info: #3b82f6;                 // 資訊 - 提示說明

// 互動色
$hover-overlay: rgba(59,130,246,0.1);    // 懸停效果
$active-overlay: rgba(59,130,246,0.2);   // 按下效果
$focus-ring: rgba(59,130,246,0.5);       // 焦點環
```

---

## 📝 字體系統

### 字體家族
```scss
// 主要字體 - 繁體中文優化
$font-family-primary: 
  'Noto Sans TC',           // Google 字體 - 現代感
  'PingFang TC',            // Apple 系統字體
  'Microsoft JhengHei',     // Windows 系統字體
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  Roboto,
  sans-serif;

// 數字字體 - 統計顯示
$font-family-mono: 
  'JetBrains Mono',
  'SF Mono',
  'Monaco',
  'Consolas',
  monospace;
```

### 字體大小階層
```scss
// 標題層級
$text-xs: 0.75rem;      // 12px - 標籤、備註
$text-sm: 0.875rem;     // 14px - 次要內容
$text-base: 1rem;       // 16px - 正文內容
$text-lg: 1.125rem;     // 18px - 重要內容
$text-xl: 1.25rem;      // 20px - 小標題
$text-2xl: 1.5rem;      // 24px - 中標題
$text-3xl: 1.875rem;    // 30px - 大標題
$text-4xl: 2.25rem;     // 36px - 主標題

// 字重
$font-light: 300;       // 輕盈 - 裝飾性文字
$font-regular: 400;     // 正常 - 正文內容
$font-medium: 500;      // 中等 - 強調內容
$font-semibold: 600;    // 半粗 - 小標題
$font-bold: 700;        // 粗體 - 主標題
```

---

## 📐 間距系統

### 統一間距單位
```scss
// 基礎間距 (4px 基數)
$space-0: 0;           // 0px
$space-1: 0.25rem;     // 4px
$space-2: 0.5rem;      // 8px
$space-3: 0.75rem;     // 12px
$space-4: 1rem;        // 16px
$space-5: 1.25rem;     // 20px
$space-6: 1.5rem;      // 24px
$space-8: 2rem;        // 32px
$space-10: 2.5rem;     // 40px
$space-12: 3rem;       // 48px
$space-16: 4rem;       // 64px
$space-20: 5rem;       // 80px

// 特殊間距
$space-px: 1px;        // 邊框
$space-0_5: 0.125rem;  // 2px - 微調
$space-1_5: 0.375rem;  // 6px - 微調
$space-2_5: 0.625rem;  // 10px - 微調
```

### 組件內邊距標準
```scss
// 按鈕內邊距
$btn-padding-sm: #{$space-2} #{$space-3};    // 小按鈕
$btn-padding-md: #{$space-3} #{$space-4};    // 中按鈕
$btn-padding-lg: #{$space-4} #{$space-6};    // 大按鈕

// 卡片內邊距
$card-padding-sm: $space-4;                  // 小卡片
$card-padding-md: $space-6;                  // 中卡片
$card-padding-lg: $space-8;                  // 大卡片

// 容器內邊距
$container-padding-mobile: $space-4;         // 手機版
$container-padding-tablet: $space-6;         // 平板版
$container-padding-desktop: $space-8;        // 桌面版
```

---

## 🔲 組件設計系統

### 1. 基礎組件 (Base Components)

#### BButton - 統一按鈕組件
```vue
<!-- components/base/BButton.vue -->
<template>
  <button 
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <BSpinner v-if="loading" size="sm" class="mr-2" />
    <BIcon v-if="icon && !loading" :name="icon" class="mr-2" />
    <span v-if="$slots.default">
      <slot />
    </span>
  </button>
</template>

<style scoped>
/* 按鈕樣式變體 */
.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
}

.btn-secondary {
  @apply bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500;
}

.btn-success {
  @apply bg-green-600 text-white hover:bg-green-700 focus:ring-green-500;
}

.btn-danger {
  @apply bg-red-600 text-white hover:bg-red-700 focus:ring-red-500;
}

/* 大小變體 */
.btn-sm {
  @apply px-3 py-2 text-sm rounded-md;
}

.btn-md {
  @apply px-4 py-3 text-base rounded-lg;
}

.btn-lg {
  @apply px-6 py-4 text-lg rounded-xl;
}
</style>
```

#### BCard - 統一卡片組件
```vue
<!-- components/base/BCard.vue -->
<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="card-header">
      <slot name="header" />
    </div>
    
    <div class="card-body">
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.card {
  @apply bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden;
  transition: all 0.2s ease-in-out;
}

.card-hoverable:hover {
  @apply shadow-md transform -translate-y-1;
}

.card-header {
  @apply px-6 py-4 border-b border-gray-200 bg-gray-50;
}

.card-body {
  @apply p-6;
}

.card-footer {
  @apply px-6 py-4 border-t border-gray-200 bg-gray-50;
}
</style>
```

#### BIcon - 統一圖標組件
```vue
<!-- components/base/BIcon.vue -->
<template>
  <svg 
    :class="iconClasses"
    :width="size"
    :height="size"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path :d="iconPath" />
  </svg>
</template>

<script setup lang="ts">
// 圖標路徑映射
const iconPaths = {
  camera: 'M12 9a3 3 0 100 6 3 3 0 000-6zm0 8a5 5 0 100-10 5 5 0 000 10z',
  upload: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
  download: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V9',
  delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  grid: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z',
  list: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
}
</script>
```

### 2. 業務組件 (Business Components)

#### PhotoCard - 照片卡片組件
```vue
<!-- components/believer/PhotoCard.vue -->
<template>
  <BCard 
    hoverable
    class="photo-card"
    @click="$emit('view', photo)"
  >
    <!-- 照片縮圖 -->
    <div class="photo-thumbnail">
      <img 
        :src="photo.thumbnailUrl" 
        :alt="photo.name"
        class="photo-image"
        loading="lazy"
      />
      
      <!-- 操作按鈕遮罩 -->
      <div class="photo-actions">
        <BButton
          variant="secondary"
          size="sm"
          icon="download"
          @click.stop="$emit('download', photo)"
          title="下載"
        />
        <BButton
          variant="danger"
          size="sm"
          icon="delete"
          @click.stop="$emit('delete', photo)"
          title="刪除"
        />
      </div>
    </div>
    
    <!-- 照片資訊 -->
    <div class="photo-info">
      <h4 class="photo-name">{{ photo.name }}</h4>
      <p class="photo-meta">
        {{ formatFileSize(photo.size) }} • 
        {{ formatDate(photo.uploadedAt) }}
      </p>
    </div>
  </BCard>
</template>

<style scoped>
.photo-card {
  @apply cursor-pointer transition-transform duration-200;
}

.photo-thumbnail {
  @apply relative aspect-square overflow-hidden rounded-lg bg-gray-100;
}

.photo-image {
  @apply w-full h-full object-cover transition-transform duration-300;
}

.photo-card:hover .photo-image {
  @apply scale-105;
}

.photo-actions {
  @apply absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-200;
}

.photo-card:hover .photo-actions {
  @apply opacity-100;
}

.photo-info {
  @apply p-4;
}

.photo-name {
  @apply text-sm font-medium text-gray-900 truncate;
}

.photo-meta {
  @apply text-xs text-gray-500 mt-1;
}
</style>
```

#### PhotoDropZone - 照片上傳區組件
```vue
<!-- components/believer/PhotoDropZone.vue -->
<template>
  <div 
    :class="dropZoneClasses"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
    @click="openFileDialog"
  >
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />
    
    <div class="drop-zone-content">
      <BIcon 
        name="camera" 
        :size="isDragOver ? 80 : 64"
        class="drop-zone-icon"
      />
      
      <h3 class="drop-zone-title">
        {{ isDragOver ? '放開以上傳照片' : '拖放照片到這裡' }}
      </h3>
      
      <p class="drop-zone-description">
        或點擊選擇照片 • 支援批量上傳
      </p>
      
      <small class="drop-zone-formats">
        支援 JPG, PNG, GIF, WEBP 格式，單張最大 10MB
      </small>
      
      <!-- 上傳進度 -->
      <div v-if="isUploading" class="upload-progress">
        <BProgressBar :progress="uploadProgress" />
        <span class="upload-status">正在上傳... {{ uploadProgress }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drop-zone {
  @apply border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer transition-all duration-300;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone:hover,
.drop-zone.drag-over {
  @apply border-blue-400 bg-blue-50;
}

.drop-zone-content {
  @apply flex flex-col items-center gap-4;
}

.drop-zone-icon {
  @apply text-blue-500 transition-all duration-300;
}

.drop-zone-title {
  @apply text-xl font-semibold text-gray-700;
}

.drop-zone-description {
  @apply text-gray-500;
}

.drop-zone-formats {
  @apply text-xs text-gray-400;
}

.upload-progress {
  @apply w-full max-w-xs;
}

.upload-status {
  @apply text-sm text-blue-600 mt-2;
}
</style>
```

#### PhotoGrid - 照片網格組件
```vue
<!-- components/believer/PhotoGrid.vue -->
<template>
  <div class="photo-grid-container">
    <!-- 網格檢視選項 -->
    <div class="grid-controls">
      <div class="view-options">
        <BButton
          v-for="size in gridSizes"
          :key="size.value"
          :variant="currentGridSize === size.value ? 'primary' : 'secondary'"
          size="sm"
          @click="currentGridSize = size.value"
        >
          {{ size.label }}
        </BButton>
      </div>
      
      <div class="sort-options">
        <select 
          v-model="sortBy"
          class="sort-select"
          @change="handleSort"
        >
          <option value="uploadedAt">上傳時間</option>
          <option value="name">檔案名稱</option>
          <option value="size">檔案大小</option>
        </select>
      </div>
    </div>
    
    <!-- 照片網格 -->
    <div 
      :class="gridClasses"
      class="photo-grid"
    >
      <PhotoCard
        v-for="photo in sortedPhotos"
        :key="photo.id"
        :photo="photo"
        @view="$emit('photoView', photo)"
        @download="$emit('photoDownload', photo)"
        @delete="$emit('photoDelete', photo)"
      />
    </div>
    
    <!-- 空狀態 -->
    <div v-if="photos.length === 0" class="empty-state">
      <BIcon name="camera" size="96" class="empty-icon" />
      <h3 class="empty-title">還沒有照片</h3>
      <p class="empty-description">
        開始上傳您的第一張照片吧！
      </p>
    </div>
  </div>
</template>

<style scoped>
.photo-grid {
  @apply grid gap-6;
}

.grid-sm {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.grid-md {
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

.grid-lg {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.grid-controls {
  @apply flex justify-between items-center mb-6;
}

.view-options {
  @apply flex gap-2;
}

.sort-select {
  @apply px-3 py-2 border border-gray-300 rounded-lg text-sm;
}

.empty-state {
  @apply flex flex-col items-center justify-center py-16;
}

.empty-icon {
  @apply text-gray-300 mb-4;
}

.empty-title {
  @apply text-xl font-semibold text-gray-500 mb-2;
}

.empty-description {
  @apply text-gray-400;
}
</style>
```

### 3. 佈局組件 (Layout Components)

#### BelieverLayout - 主要佈局組件
```vue
<!-- components/layout/BelieverLayout.vue -->
<template>
  <div class="believer-layout">
    <!-- 頂部導航 -->
    <header class="app-header">
      <div class="header-container">
        <div class="header-brand">
          <img src="/logo.png" alt="MemoryArk" class="brand-logo" />
          <span class="brand-name">我的照片</span>
        </div>
        
        <nav class="header-nav">
          <router-link to="/believer" class="nav-link">
            首頁
          </router-link>
          <router-link to="/believer/photos" class="nav-link">
            我的照片
          </router-link>
        </nav>
        
        <div class="header-user">
          <BelieverUserMenu />
        </div>
      </div>
    </header>
    
    <!-- 主要內容 -->
    <main class="app-main">
      <div class="main-container">
        <router-view />
      </div>
    </main>
    
    <!-- 底部資訊 -->
    <footer class="app-footer">
      <div class="footer-container">
        <p class="footer-text">
          © 2025 MemoryArk 信徒版 • 
          <a href="/privacy" class="footer-link">隱私政策</a> • 
          <a href="/terms" class="footer-link">使用條款</a>
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.believer-layout {
  @apply min-h-screen flex flex-col bg-gray-50;
}

.app-header {
  @apply bg-white shadow-sm border-b border-gray-200;
}

.header-container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16;
}

.header-brand {
  @apply flex items-center gap-3;
}

.brand-logo {
  @apply h-8 w-auto;
}

.brand-name {
  @apply text-xl font-semibold text-gray-900;
}

.header-nav {
  @apply flex items-center gap-6;
}

.nav-link {
  @apply text-gray-600 hover:text-gray-900 font-medium transition-colors;
}

.nav-link.router-link-active {
  @apply text-blue-600;
}

.app-main {
  @apply flex-1;
}

.main-container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8;
}

.app-footer {
  @apply bg-white border-t border-gray-200 mt-auto;
}

.footer-container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6;
}

.footer-text {
  @apply text-sm text-gray-500 text-center;
}

.footer-link {
  @apply text-blue-600 hover:text-blue-700;
}
</style>
```

---

## 📱 響應式設計系統

### 斷點設定
```scss
// 響應式斷點
$breakpoint-sm: 640px;      // 手機橫屏
$breakpoint-md: 768px;      // 平板直屏
$breakpoint-lg: 1024px;     // 平板橫屏
$breakpoint-xl: 1280px;     // 桌面螢幕
$breakpoint-2xl: 1536px;    // 大螢幕

// 容器最大寬度
$container-sm: 640px;
$container-md: 768px;
$container-lg: 1024px;
$container-xl: 1280px;
$container-2xl: 1536px;
```

### 響應式工具類
```scss
// 顯示/隱藏
.hidden-mobile { @media (max-width: $breakpoint-md) { display: none; } }
.hidden-tablet { @media (min-width: $breakpoint-md) and (max-width: $breakpoint-lg) { display: none; } }
.hidden-desktop { @media (min-width: $breakpoint-lg) { display: none; } }

.show-mobile { @media (min-width: $breakpoint-md) { display: none; } }
.show-tablet { @media (max-width: $breakpoint-md), (min-width: $breakpoint-lg) { display: none; } }
.show-desktop { @media (max-width: $breakpoint-lg) { display: none; } }

// 間距響應式
.p-responsive { 
  padding: $space-4;
  @media (min-width: $breakpoint-md) { padding: $space-6; }
  @media (min-width: $breakpoint-lg) { padding: $space-8; }
}

.gap-responsive {
  gap: $space-4;
  @media (min-width: $breakpoint-md) { gap: $space-6; }
  @media (min-width: $breakpoint-lg) { gap: $space-8; }
}
```

---

## 🎭 動畫系統

### 過渡動畫
```scss
// 基礎過渡
$transition-fast: 0.15s ease-in-out;
$transition-normal: 0.3s ease-in-out;
$transition-slow: 0.5s ease-in-out;

// 預設過渡類別
.transition-fast { transition: all $transition-fast; }
.transition-normal { transition: all $transition-normal; }
.transition-slow { transition: all $transition-slow; }

// 特定屬性過渡
.transition-colors { transition: color $transition-normal, background-color $transition-normal, border-color $transition-normal; }
.transition-transform { transition: transform $transition-normal; }
.transition-opacity { transition: opacity $transition-normal; }
```

### 關鍵幀動畫
```scss
// 載入動畫
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

// 動畫類別
.animate-spin { animation: spin 1s linear infinite; }
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.animate-fadeIn { animation: fadeIn 0.5s ease-out; }
.animate-slideUp { animation: slideUp 0.6s ease-out; }
```

---

## 🗂️ 組件檔案結構

```
src/
├── components/
│   ├── base/                    # 基礎組件
│   │   ├── BButton.vue         # 按鈕組件
│   │   ├── BCard.vue           # 卡片組件
│   │   ├── BIcon.vue           # 圖標組件
│   │   ├── BInput.vue          # 輸入框組件
│   │   ├── BModal.vue          # 彈窗組件
│   │   ├── BProgressBar.vue    # 進度條組件
│   │   ├── BSpinner.vue        # 載入動畫
│   │   └── index.ts            # 統一導出
│   │
│   ├── believer/               # 信徒版專用組件
│   │   ├── PhotoCard.vue       # 照片卡片
│   │   ├── PhotoDropZone.vue   # 上傳區域
│   │   ├── PhotoGrid.vue       # 照片網格
│   │   ├── PhotoList.vue       # 照片列表
│   │   ├── PhotoViewer.vue     # 照片檢視器
│   │   ├── UploadProgress.vue  # 上傳進度
│   │   ├── StorageIndicator.vue # 容量指示器
│   │   ├── BelieverUserMenu.vue # 用戶選單
│   │   └── index.ts            # 統一導出
│   │
│   └── layout/                 # 佈局組件
│       ├── BelieverLayout.vue  # 主佈局
│       ├── BelieverHeader.vue  # 頭部組件
│       ├── BelieverFooter.vue  # 底部組件
│       └── index.ts            # 統一導出
│
├── styles/                     # 樣式系統
│   ├── base/                   # 基礎樣式
│   │   ├── _reset.scss         # 重置樣式
│   │   ├── _typography.scss    # 字體樣式
│   │   └── _utilities.scss     # 工具類
│   │
│   ├── components/             # 組件樣式
│   │   ├── _buttons.scss       # 按鈕樣式
│   │   ├── _cards.scss         # 卡片樣式
│   │   ├── _forms.scss         # 表單樣式
│   │   └── _photos.scss        # 照片相關樣式
│   │
│   ├── themes/                 # 主題樣式
│   │   ├── _believer.scss      # 信徒版主題
│   │   └── _variables.scss     # CSS 變數
│   │
│   └── main.scss               # 主樣式文件
│
└── composables/               # 組合式函數
    ├── useBelieverTheme.ts    # 主題管理
    ├── useResponsive.ts       # 響應式工具
    └── useAnimation.ts        # 動畫工具
```

---

## 🎨 主題配置文件

### CSS 變數定義
```scss
// styles/themes/_variables.scss
:root {
  // 色彩變數
  --color-primary: #{$primary-blue};
  --color-primary-light: #{lighten($primary-blue, 10%)};
  --color-primary-dark: #{darken($primary-blue, 10%)};
  
  --color-accent: #{$believer-accent};
  --color-success: #{$believer-success};
  --color-warning: #{$warning};
  --color-error: #{$error};
  
  // 背景變數
  --bg-primary: #{$bg-primary};
  --bg-secondary: #{$bg-secondary};
  --bg-elevated: #{$bg-elevated};
  
  // 文字變數
  --text-primary: #{$text-primary};
  --text-secondary: #{$text-secondary};
  --text-tertiary: #{$text-tertiary};
  
  // 間距變數
  --space-xs: #{$space-2};
  --space-sm: #{$space-4};
  --space-md: #{$space-6};
  --space-lg: #{$space-8};
  --space-xl: #{$space-12};
  
  // 圓角變數
  --radius-sm: 0.375rem;    // 6px
  --radius-md: 0.5rem;      // 8px
  --radius-lg: 0.75rem;     // 12px
  --radius-xl: 1rem;        // 16px
  --radius-2xl: 1.5rem;     // 24px
  
  // 陰影變數
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  
  // 動畫變數
  --duration-fast: #{$transition-fast};
  --duration-normal: #{$transition-normal};
  --duration-slow: #{$transition-slow};
  
  --ease-linear: linear;
  --ease-in: ease-in;
  --ease-out: ease-out;
  --ease-in-out: ease-in-out;
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 暗色主題支援 (未來擴展)
```scss
// 暗色主題變數 (可選)
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --bg-elevated: #3a3a3a;
    
    --text-primary: #ffffff;
    --text-secondary: #d1d5db;
    --text-tertiary: #9ca3af;
  }
}
```

---

## 📖 使用規範

### 1. 組件命名規範
- **基礎組件**：以 `B` 前綴開頭 (如 `BButton`, `BCard`)
- **業務組件**：描述性命名 (如 `PhotoCard`, `PhotoGrid`)
- **佈局組件**：以 `Layout` 結尾 (如 `BelieverLayout`)

### 2. 樣式類命名規範
- 使用 **BEM** 方法論：`block__element--modifier`
- 組件專用類以組件名開頭：`.photo-card__image`
- 工具類使用簡短描述性名稱：`.text-center`, `.mb-4`

### 3. 色彩使用指南
- **主要操作**：使用 primary 色 (藍色)
- **成功狀態**：使用 success 色 (綠色)  
- **警告提示**：使用 warning 色 (橙色)
- **錯誤狀態**：使用 error 色 (紅色)
- **中性操作**：使用 secondary 色 (灰色)

### 4. 間距使用指南
- 組件內部間距：4px 的倍數
- 組件之間間距：8px 的倍數
- 區塊之間間距：16px 的倍數
- 版面之間間距：32px 的倍數

---

*此設計系統確保信徒版具有一致、現代、易用的視覺體驗，同時保持與 MemoryArk 品牌的一致性。*