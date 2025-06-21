# 信徒版組件復用改造計劃

## 🎯 復用策略概述

基於現有 MemoryArk 檔案管理系統，通過**最小化改動**的方式實現信徒版，確保：
- ✅ 最大化復用現有穩定組件
- ✅ 保持 UI 風格一致性
- ✅ 快速開發部署
- ✅ 便於維護和升級

---

## 📋 組件復用分析表

| 組件名稱 | 復用程度 | 修改類型 | 信徒版用途 |
|---------|---------|---------|----------|
| `FilesView.vue` | ⭐⭐⭐⭐ | 功能精簡 | 主檔案瀏覽頁面 |
| `FileCard.vue` | ⭐⭐⭐⭐⭐ | 按鈕調整 | 檔案/照片卡片 |
| `AppFileIcon.vue` | ⭐⭐⭐⭐⭐ | 零修改 | 檔案類型圖示 |
| `AppFilePreview.vue` | ⭐⭐⭐⭐ | 移除編輯 | 照片預覽器 |
| `UploadModal.vue` | ⭐⭐⭐ | 權限簡化 | 照片上傳 |
| `AppButton.vue` | ⭐⭐⭐⭐⭐ | 零修改 | 統一按鈕 |
| `AppCard.vue` | ⭐⭐⭐⭐⭐ | 零修改 | 卡片容器 |
| `ResponsiveContainer.vue` | ⭐⭐⭐⭐⭐ | 零修改 | 響應式佈局 |

---

## 🏗️ 信徒版目錄結構

```
src/
├── views/
│   └── believer/                    # 信徒版專用視圖
│       ├── BelieverHomeView.vue     # 信徒首頁
│       ├── BelieverPhotosView.vue   # 照片瀏覽 (基於 FilesView)
│       └── BelieverLoginView.vue    # Google 登入
│
├── components/
│   ├── ui/                          # 基礎 UI 組件 (完全復用)
│   │   ├── AppButton.vue           
│   │   ├── AppCard.vue             
│   │   ├── AppFileIcon.vue         
│   │   ├── AppFilePreview.vue      
│   │   └── ...                     
│   │
│   └── believer/                    # 信徒版專用組件
│       ├── BelieverFileCard.vue     # 包裝 FileCard
│       ├── BelieverPhotoUpload.vue  # 包裝 UploadModal
│       ├── BelieverLayout.vue       # 信徒版佈局
│       └── BelieverStats.vue        # 個人統計
│
├── stores/
│   └── believerPhotos.ts            # 信徒照片狀態管理
│
└── router/
    └── believer.ts                  # 信徒版路由
```

---

## 🔧 組件改造詳細方案

### 1. BelieverPhotosView.vue (主頁面)

**基於**: `FilesView.vue`  
**改造策略**: 功能精簡 + UI 微調

```vue
<template>
  <ResponsiveContainer>
    <!-- 復用 FilesView 的頂部導航結構 -->
    <header class="files-header">
      <div class="header-content">
        <!-- 保留: 麵包屑導航 -->
        <nav class="breadcrumb">
          <span class="breadcrumb-item">我的照片</span>
          <span v-if="currentFolder" class="breadcrumb-item">{{ currentFolder.name }}</span>
        </nav>
        
        <!-- 保留: 搜尋功能 -->
        <div class="search-section">
          <AppInput
            v-model="searchQuery"
            placeholder="搜尋照片..."
            icon="search"
            class="search-input"
          />
        </div>
        
        <!-- 修改: 移除上傳和新增按鈕，只保留檢視切換 -->
        <div class="view-controls">
          <div class="view-toggle">
            <AppButton
              variant="ghost"
              size="sm"
              :active="viewMode === 'grid'"
              @click="viewMode = 'grid'"
            >
              <AppFileIcon name="grid" />
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              :active="viewMode === 'list'"
              @click="viewMode = 'list'"
            >
              <AppFileIcon name="list" />
            </AppButton>
          </div>
        </div>
      </div>
    </header>

    <!-- 復用 FilesView 的內容區域結構 -->
    <main class="files-content">
      <!-- 保留: 空狀態 -->
      <div v-if="filteredPhotos.length === 0" class="empty-state">
        <div class="empty-illustration">
          <AppFileIcon name="photo" size="96" />
        </div>
        <h3 class="empty-title">還沒有照片</h3>
        <p class="empty-description">
          開始上傳您的第一張照片吧！
        </p>
      </div>

      <!-- 復用: 網格檢視 -->
      <div v-else-if="viewMode === 'grid'" class="files-grid">
        <BelieverFileCard
          v-for="photo in filteredPhotos"
          :key="photo.id"
          :file="photo"
          @click="openPhoto"
          @download="downloadPhoto"
          <!-- 移除 @delete, @rename, @move 等管理操作 -->
        />
      </div>

      <!-- 復用: 列表檢視 -->
      <div v-else class="files-list">
        <!-- 列表結構保持一致 -->
      </div>
    </main>
  </ResponsiveContainer>
</template>

<script setup lang="ts">
// 復用 FilesView 的核心邏輯
import { ref, computed, onMounted } from 'vue'
import { useBelieverPhotosStore } from '@/stores/believerPhotos'
import { ResponsiveContainer, AppButton, AppInput, AppFileIcon } from '@/components/ui'
import BelieverFileCard from '@/components/believer/BelieverFileCard.vue'

const photosStore = useBelieverPhotosStore()

// 復用 FilesView 的響應式邏輯
const viewMode = ref<'grid' | 'list'>('grid')
const searchQuery = ref('')

// 復用 FilesView 的搜尋過濾邏輯
const filteredPhotos = computed(() => {
  let photos = photosStore.photos
  
  if (searchQuery.value) {
    photos = photos.filter(photo => 
      photo.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  
  return photos
})

// 簡化的操作方法 (移除管理功能)
const openPhoto = (photo) => {
  // 使用現有的 AppFilePreview 組件
}

const downloadPhoto = (photo) => {
  // 復用現有的下載邏輯
}

onMounted(() => {
  photosStore.fetchMyPhotos()
})
</script>

<style scoped>
/* 復用 FilesView.vue 的樣式 */
/* 只需微調顏色和間距 */
</style>
```

### 2. BelieverFileCard.vue (包裝組件)

**基於**: `FileCard.vue`  
**改造策略**: Props 控制 + 事件過濾

```vue
<template>
  <FileCard
    :file="file"
    :view-mode="viewMode"
    :is-selected="false"
    :show-checkbox="false"
    :show-quick-actions="true"
    @click="$emit('click', file)"
    @download="$emit('download', file)"
    @preview="$emit('preview', file)"
    <!-- 不綁定管理操作事件 -->
  >
    <!-- 自定義快速操作按鈕 -->
    <template #quick-actions>
      <AppButton
        variant="ghost"
        size="sm"
        @click.stop="$emit('preview', file)"
        title="預覽"
      >
        <AppFileIcon name="eye" size="16" />
      </AppButton>
      
      <AppButton
        variant="ghost"
        size="sm"
        @click.stop="$emit('download', file)"
        title="下載"
      >
        <AppFileIcon name="download" size="16" />
      </AppButton>
    </template>
  </FileCard>
</template>

<script setup lang="ts">
interface Props {
  file: FileInfo
  viewMode?: 'grid' | 'list'
}

defineProps<Props>()
defineEmits<{
  click: [file: FileInfo]
  preview: [file: FileInfo]
  download: [file: FileInfo]
}>()
</script>
```

### 3. BelieverPhotoUpload.vue (上傳組件)

**基於**: `UploadModal.vue`  
**改造策略**: 權限簡化 + 照片特化

```vue
<template>
  <UploadModal
    v-model="isOpen"
    :accepted-types="['image/*']"
    :max-file-size="10 * 1024 * 1024"
    :multiple="true"
    :auto-start="true"
    :target-folder="believerFolder"
    @upload-complete="handleUploadComplete"
    @upload-error="handleUploadError"
  >
    <!-- 自定義拖拽區域內容 -->
    <template #drop-zone-content>
      <div class="believer-upload-zone">
        <AppFileIcon name="camera" size="64" class="upload-icon" />
        <h3 class="upload-title">上傳您的照片</h3>
        <p class="upload-description">
          拖放照片到這裡，或點擊選擇照片
        </p>
        <small class="upload-hint">
          支援 JPG, PNG, GIF, WEBP 格式，單張最大 10MB
        </small>
      </div>
    </template>
  </UploadModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBelieverPhotosStore } from '@/stores/believerPhotos'
import { UploadModal, AppFileIcon } from '@/components/ui'

const photosStore = useBelieverPhotosStore()
const isOpen = defineModel<boolean>()

// 自動設定信徒專用資料夾
const believerFolder = computed(() => ({
  id: null, // 根目錄下的信徒資料夾
  name: '我的照片'
}))

const handleUploadComplete = () => {
  // 重新載入照片列表
  photosStore.fetchMyPhotos()
  isOpen.value = false
}

const handleUploadError = (error) => {
  console.error('Upload failed:', error)
  // 顯示錯誤提示
}
</script>

<style scoped>
.believer-upload-zone {
  @apply flex flex-col items-center gap-4 p-8;
}

.upload-icon {
  @apply text-blue-500;
}

.upload-title {
  @apply text-xl font-semibold text-gray-700;
}

.upload-description {
  @apply text-gray-500;
}

.upload-hint {
  @apply text-xs text-gray-400;
}
</style>
```

### 4. BelieverLayout.vue (佈局組件)

**基於**: 現有佈局模式  
**改造策略**: 簡化導航 + 專用主題

```vue
<template>
  <div class="believer-layout">
    <!-- 復用現有的頭部結構 -->
    <header class="app-header">
      <ResponsiveContainer>
        <div class="header-content">
          <!-- 品牌 Logo -->
          <div class="brand">
            <img src="/logo.png" alt="MemoryArk" class="brand-logo" />
            <span class="brand-name">我的照片</span>
          </div>

          <!-- 簡化的導航 -->
          <nav class="main-nav">
            <router-link to="/believer" class="nav-link">
              首頁
            </router-link>
            <router-link to="/believer/photos" class="nav-link">
              我的照片
            </router-link>
          </nav>

          <!-- 用戶選單 -->
          <div class="user-menu">
            <BelieverUserMenu />
          </div>
        </div>
      </ResponsiveContainer>
    </header>

    <!-- 主要內容 -->
    <main class="app-main">
      <router-view />
    </main>

    <!-- 簡化的底部 -->
    <footer class="app-footer">
      <ResponsiveContainer>
        <div class="footer-content">
          <p class="footer-text">
            © 2025 MemoryArk 信徒版
          </p>
        </div>
      </ResponsiveContainer>
    </footer>
  </div>
</template>

<style scoped>
/* 復用現有的佈局樣式 */
/* 添加信徒版專用的主題色彩 */
.believer-layout {
  /* 使用現有的 CSS 變數系統 */
  --primary-color: #3b82f6;
  --accent-color: #10b981;
}
</style>
```

---

## 🎨 樣式系統復用

### 1. CSS 變數擴展
```scss
// 在現有 CSS 變數基礎上添加信徒版專用變數
:root {
  // 信徒版主題色 (在現有色彩系統基礎上)
  --believer-primary: #3b82f6;
  --believer-accent: #10b981;
  --believer-warm: #f97316;
  
  // 復用現有的所有其他變數
  // --color-primary, --bg-elevated, --text-primary 等
}

// 信徒版專用的組件樣式覆蓋
.believer-theme {
  .file-card:hover {
    border-color: var(--believer-primary);
  }
  
  .btn-primary {
    background-color: var(--believer-primary);
  }
}
```

### 2. 組件樣式繼承
```vue
<!-- 信徒版組件繼承現有組件樣式 -->
<style scoped>
/* 導入現有組件樣式 */
@import '@/components/ui/FileCard.vue';

/* 添加信徒版特定調整 */
.believer-file-card {
  /* 只調整需要的部分 */
  .quick-actions {
    /* 調整按鈕顏色 */
  }
}
</style>
```

---

## 🛣️ 路由系統擴展

### 1. 信徒版路由配置
```typescript
// router/believer.ts
import type { RouteRecordRaw } from 'vue-router'

export const believerRoutes: RouteRecordRaw[] = [
  {
    path: '/believer',
    component: () => import('@/components/believer/BelieverLayout.vue'),
    meta: { requiresBelieverAuth: true },
    children: [
      {
        path: '',
        name: 'BelieverHome',
        component: () => import('@/views/believer/BelieverHomeView.vue')
      },
      {
        path: 'photos',
        name: 'BelieverPhotos', 
        component: () => import('@/views/believer/BelieverPhotosView.vue')
      }
    ]
  },
  {
    path: '/believer/login',
    name: 'BelieverLogin',
    component: () => import('@/views/believer/BelieverLoginView.vue')
  }
]
```

### 2. 路由守衛復用
```typescript
// 復用現有的認證守衛邏輯，添加信徒版檢查
const router = createRouter({
  routes: [
    ...adminRoutes,    // 現有管理版路由
    ...believerRoutes  // 新增信徒版路由
  ]
})

router.beforeEach((to, from, next) => {
  // 復用現有的認證邏輯
  // 添加信徒版專用檢查
})
```

---

## 📦 狀態管理復用

### 1. Store 結構設計
```typescript
// stores/believerPhotos.ts
import { defineStore } from 'pinia'
import { useFilesStore } from './files' // 復用現有檔案 store

export const useBelieverPhotosStore = defineStore('believerPhotos', {
  state: () => ({
    photos: [] as FileInfo[],
    currentFolder: null as FolderInfo | null,
    searchQuery: '',
    viewMode: 'grid' as 'grid' | 'list',
    isLoading: false
  }),

  getters: {
    // 復用現有的 getters 邏輯
    filteredPhotos: (state) => {
      // 基於現有的檔案過濾邏輯
    }
  },

  actions: {
    // 復用現有的 API 調用邏輯
    async fetchMyPhotos() {
      const filesStore = useFilesStore()
      // 調用現有的 API，只過濾信徒的檔案
    }
  }
})
```

---

## ⚡ 開發效率優化

### 1. 組件別名系統
```typescript
// 為信徒版建立組件別名，簡化導入
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, 'src/components/ui'),
      '@believer': path.resolve(__dirname, 'src/components/believer'),
      '@views-believer': path.resolve(__dirname, 'src/views/believer')
    }
  }
})
```

### 2. 批量組件導出
```typescript
// components/believer/index.ts
export { default as BelieverFileCard } from './BelieverFileCard.vue'
export { default as BelieverPhotoUpload } from './BelieverPhotoUpload.vue'
export { default as BelieverLayout } from './BelieverLayout.vue'
export { default as BelieverStats } from './BelieverStats.vue'

// 統一導入方式
import { BelieverFileCard, BelieverPhotoUpload } from '@believer'
```

---

## 🎯 實施階段規劃

### 階段一：基礎框架 (1週)
1. ✅ 創建信徒版目錄結構
2. ✅ 配置路由和認證系統  
3. ✅ 建立 BelieverLayout 基礎佈局
4. ✅ 實現 Google OAuth 登入

### 階段二：核心功能 (2週)
1. ✅ 改造 BelieverPhotosView (基於 FilesView)
2. ✅ 創建 BelieverFileCard (包裝 FileCard)
3. ✅ 實現照片瀏覽和預覽功能
4. ✅ 添加下載功能

### 階段三：上傳功能 (1週)
1. ✅ 改造 BelieverPhotoUpload (基於 UploadModal)
2. ✅ 實現拖拽上傳和批量上傳
3. ✅ 添加上傳進度和錯誤處理
4. ✅ 整合個人空間限制

### 階段四：優化完善 (1週)
1. ✅ 響應式設計測試和調整
2. ✅ 性能優化和載入速度
3. ✅ 用戶體驗測試和改進
4. ✅ 文檔和部署準備

---

## 📊 復用效益分析

### 代碼復用率
- **UI 組件**: 90% 復用 (AppButton, AppCard, AppFileIcon 等)
- **佈局系統**: 85% 復用 (ResponsiveContainer, 網格系統等)
- **業務邏輯**: 70% 復用 (檔案處理, API 調用等)
- **樣式系統**: 95% 復用 (CSS 變數, 主題系統等)

### 開發時程節省
- **預估節省**: 60-70% 開發時間
- **原始估算**: 8-10週 → **實際需求**: 3-4週
- **風險降低**: 復用穩定組件減少 bug 風險
- **維護成本**: 共用代碼降低長期維護成本

---

*通過最大化復用現有組件，信徒版可以快速實現高質量的用戶體驗，同時保持與管理版的視覺一致性。*