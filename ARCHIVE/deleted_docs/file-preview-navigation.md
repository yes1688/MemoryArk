# 檔案預覽導航功能設計文檔

## 📋 功能概述

在檔案預覽模式下，用戶可以通過左右切換功能瀏覽同資料夾內的其他檔案，提供類似圖片瀏覽器的流暢體驗。

## 🎯 功能需求

### 核心功能
- [x] 在檔案預覽時顯示左右導航箭頭
- [x] 按順序切換同資料夾的檔案
- [x] 顯示當前檔案位置 (例如：3/15)
- [x] 支援鍵盤快捷鍵 (← → 方向鍵)
- [x] 跳過無法預覽的檔案選項

### 進階功能
- [ ] 觸控滑動手勢支援
- [ ] 預載下一個檔案
- [ ] 全螢幕模式導航
- [ ] 自動播放模式 (圖片輪播)

## 🔧 技術實現

### 前端狀態管理

#### Files Store 擴展
```typescript
interface FileNavigationState {
  currentPreviewIndex: number       // 當前檢視的檔案索引
  previewableFiles: FileInfo[]      // 可預覽的檔案清單
  allFiles: FileInfo[]             // 同資料夾所有檔案
  showOnlyPreviewable: boolean     // 是否只在可預覽檔案間切換
  navigationEnabled: boolean       // 是否啟用導航功能
}
```

#### 檔案類型判斷
```typescript
const previewableTypes = [
  'image/*',                    // 所有圖片格式
  'application/pdf',            // PDF 文件
  'text/*',                     // 文本檔案
  'application/msword',         // Word 文檔
  'application/vnd.openxml*',   // Office 新格式
  'video/*',                    // 影片檔案
  'audio/*'                     // 音訊檔案
]

function isPreviewable(mimeType: string): boolean {
  return previewableTypes.some(type => 
    type.endsWith('*') 
      ? mimeType.startsWith(type.slice(0, -1))
      : mimeType === type
  )
}
```

### 組件結構

#### AppFilePreview 組件更新
```vue
<template>
  <div class="file-preview-container">
    <!-- 導航控制欄 -->
    <div class="preview-navigation">
      <button 
        @click="previousFile" 
        :disabled="!canGoPrevious"
        class="nav-button nav-previous"
      >
        <ChevronLeftIcon />
      </button>
      
      <div class="file-info">
        <span class="file-name">{{ currentFile?.name }}</span>
        <span class="file-position">{{ currentIndex + 1 }} / {{ totalFiles }}</span>
      </div>
      
      <button 
        @click="nextFile" 
        :disabled="!canGoNext"
        class="nav-button nav-next"
      >
        <ChevronRightIcon />
      </button>
    </div>
    
    <!-- 預覽選項 -->
    <div class="preview-options">
      <label class="option-toggle">
        <input 
          type="checkbox" 
          v-model="showOnlyPreviewable"
          @change="updateNavigationMode"
        />
        只顯示可預覽檔案
      </label>
    </div>
    
    <!-- 檔案預覽內容 -->
    <div class="preview-content">
      <!-- 現有的預覽邏輯 -->
    </div>
  </div>
</template>
```

#### 鍵盤事件處理
```typescript
// 在組件 mounted 時註冊鍵盤事件
onMounted(() => {
  document.addEventListener('keydown', handleKeyboardNavigation)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyboardNavigation)
})

function handleKeyboardNavigation(event: KeyboardEvent) {
  if (!navigationEnabled.value) return
  
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      previousFile()
      break
    case 'ArrowRight':
      event.preventDefault()
      nextFile()
      break
    case 'Escape':
      event.preventDefault()
      closePreview()
      break
  }
}
```

### 後端支援

#### 檔案清單 API 擴展
```go
// 在 GetFiles API 中添加導航相關資訊
type FileListResponse struct {
    Files      []FileInfo `json:"files"`
    Total      int        `json:"total"`
    Page       int        `json:"page"`
    TotalPages int        `json:"total_pages"`
    // 新增導航支援
    NavigationInfo *NavigationInfo `json:"navigation_info,omitempty"`
}

type NavigationInfo struct {
    PreviewableCount int    `json:"previewable_count"`
    SupportedTypes   []string `json:"supported_types"`
}
```

## 🎨 用戶介面設計

### 視覺佈局

#### 簡潔模式
```
┌─────────────────────────────────────┐
│ [<]  📷 IMG_001.jpg  (3/15)  [>]   │
│                                     │
│           [檔案預覽內容]              │
│                                     │
└─────────────────────────────────────┘
```

#### 完整模式
```
┌─ 檔案預覽 ─────────────────────────┐
│ [<] IMG_001.jpg        [3/15] [>] │
│ ┌─ 預覽選項 ─┐                    │
│ │ ☑ 只顯示可預覽檔案 │               │
│ │ ☐ 自動播放模式     │               │
│ └─────────────────┘                │
│                                   │
│        [檔案預覽內容]                │
│                                   │
│ 快捷鍵：← → 切換檔案 | ESC 關閉     │
└───────────────────────────────────┘
```

### 樣式規範

#### CSS 變數
```css
:root {
  --nav-button-size: 40px;
  --nav-button-color: #6b7280;
  --nav-button-hover: #374151;
  --nav-button-disabled: #d1d5db;
  --file-info-bg: rgba(0, 0, 0, 0.7);
  --file-info-text: #ffffff;
}
```

#### 響應式設計
```css
/* 桌面版 */
.preview-navigation {
  padding: 1rem;
  background: var(--file-info-bg);
}

.nav-button {
  width: var(--nav-button-size);
  height: var(--nav-button-size);
}

/* 行動版 */
@media (max-width: 768px) {
  .preview-navigation {
    padding: 0.5rem;
  }
  
  .nav-button {
    width: 32px;
    height: 32px;
  }
  
  .file-info {
    flex: 1;
    text-align: center;
  }
}
```

## ⚡ 性能優化

### 預載策略
```typescript
// 預載前後各一個檔案
function preloadAdjacentFiles() {
  const currentIndex = navigationState.currentPreviewIndex
  const files = navigationState.previewableFiles
  
  // 預載下一個檔案
  if (currentIndex < files.length - 1) {
    preloadFile(files[currentIndex + 1])
  }
  
  // 預載上一個檔案
  if (currentIndex > 0) {
    preloadFile(files[currentIndex - 1])
  }
}

function preloadFile(file: FileInfo) {
  if (file.mimeType.startsWith('image/')) {
    const img = new Image()
    img.src = `/api/files/${file.id}/preview`
  }
}
```

### 記憶體管理
```typescript
// 限制預載檔案數量，避免記憶體洩漏
const MAX_PRELOADED_FILES = 5
const preloadedFiles = new Map<number, HTMLImageElement>()

function cleanupPreloadedFiles() {
  if (preloadedFiles.size > MAX_PRELOADED_FILES) {
    const oldestKey = preloadedFiles.keys().next().value
    preloadedFiles.delete(oldestKey)
  }
}
```

## 🔄 狀態管理

### Pinia Store 方法

#### 導航控制方法
```typescript
// 切換到下一個檔案
function nextFile(): boolean {
  const files = showOnlyPreviewable.value ? previewableFiles.value : allFiles.value
  const currentIndex = getCurrentFileIndex()
  
  if (currentIndex < files.length - 1) {
    const nextFile = files[currentIndex + 1]
    updateCurrentPreview(nextFile, currentIndex + 1)
    return true
  }
  return false
}

// 切換到上一個檔案
function previousFile(): boolean {
  const files = showOnlyPreviewable.value ? previewableFiles.value : allFiles.value
  const currentIndex = getCurrentFileIndex()
  
  if (currentIndex > 0) {
    const prevFile = files[currentIndex - 1]
    updateCurrentPreview(prevFile, currentIndex - 1)
    return true
  }
  return false
}

// 更新當前預覽檔案
function updateCurrentPreview(file: FileInfo, index: number) {
  currentPreviewIndex.value = index
  // 觸發路由更新
  router.push(`/files/${file.id}/preview`)
  // 預載相鄰檔案
  preloadAdjacentFiles()
}
```

#### 檔案過濾方法
```typescript
// 更新可預覽檔案清單
function updatePreviewableFiles() {
  previewableFiles.value = allFiles.value.filter(file => 
    isPreviewable(file.mimeType)
  )
}

// 切換導航模式
function toggleNavigationMode() {
  showOnlyPreviewable.value = !showOnlyPreviewable.value
  // 重新計算當前索引
  recalculateCurrentIndex()
}
```

## 📱 觸控支援 (未來實現)

### 手勢識別
```typescript
// 觸控手勢處理
let touchStartX = 0
let touchStartY = 0

function handleTouchStart(event: TouchEvent) {
  touchStartX = event.touches[0].clientX
  touchStartY = event.touches[0].clientY
}

function handleTouchEnd(event: TouchEvent) {
  const touchEndX = event.changedTouches[0].clientX
  const touchEndY = event.changedTouches[0].clientY
  
  const deltaX = touchEndX - touchStartX
  const deltaY = touchEndY - touchStartY
  
  // 水平滑動且距離足夠
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    if (deltaX > 0) {
      previousFile() // 向右滑動，顯示上一個
    } else {
      nextFile()     // 向左滑動，顯示下一個
    }
  }
}
```

## 🧪 測試計畫

### 單元測試
- [ ] 檔案導航邏輯測試
- [ ] 檔案類型判斷測試
- [ ] 鍵盤事件處理測試
- [ ] 邊界條件測試 (第一個/最後一個檔案)

### 整合測試
- [ ] 與現有預覽功能整合測試
- [ ] 多種檔案類型切換測試
- [ ] 效能測試 (大量檔案資料夾)

### 用戶體驗測試
- [ ] 導航流暢度測試
- [ ] 鍵盤快捷鍵體驗測試
- [ ] 行動裝置觸控測試

## 📅 實施時程

### 第一階段 (第1-2天)
- [x] 基礎導航按鈕實現
- [x] 檔案計數顯示
- [x] 基本的前後切換邏輯

### 第二階段 (第3-4天)
- [ ] 鍵盤快捷鍵支援
- [ ] 檔案過濾選項
- [ ] 切換動畫效果

### 第三階段 (第5-7天)
- [ ] 預載優化
- [ ] 觸控手勢支援
- [ ] 全螢幕模式整合

## 🚀 未來擴展

### 高級功能
- [ ] 自動播放/幻燈片模式
- [ ] 縮圖導航欄
- [ ] 檔案比較模式
- [ ] 批量操作支援

### 協作功能
- [ ] 多人同時預覽
- [ ] 預覽註釋功能
- [ ] 分享特定檔案序列

---

## 📝 更新紀錄

| 日期 | 版本 | 更新內容 | 作者 |
|------|------|----------|------|
| 2025-06-15 | 1.0.0 | 初始設計文檔 | Claude |

---

## 📞 聯絡資訊

如有任何問題或建議，請透過以下方式聯絡：
- 專案負責人：劉程維 <94work.net@gmail.com>
- 技術文檔：本檔案會持續更新最新的實現進度