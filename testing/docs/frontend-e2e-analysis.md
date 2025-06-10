# MemoryArk 2.0 前端 E2E 測試分析

## 前端架構概述

### 技術堆疊
- **框架**: Vue 3 + TypeScript
- **路由**: Vue Router 4
- **狀態管理**: Pinia
- **樣式**: Tailwind CSS + SCSS
- **設計語言**: Apple HIG + Windows 11 Fluent Design 融合
- **認證**: Cloudflare Access + 內部審核雙層系統

### 專案結構
```
frontend/src/
├── views/          # 主要頁面視圖
├── components/     # 可重用元件
├── stores/         # Pinia 狀態管理
├── api/           # API 客戶端
├── router/        # 路由配置
├── types/         # TypeScript 類型定義
└── utils/         # 工具函數
```

## 用戶流程分析

### 1. 認證流程 🔐

#### 路由層級
```typescript
// 認證狀態檢查
router.beforeEach((to, from, next) => {
  // 1. 檢查 Cloudflare 認證
  // 2. 檢查用戶註冊狀態
  // 3. 重定向到適當頁面
})
```

#### 認證狀態
- **未認證**: 顯示訪問拒絕頁面
- **已認證但未註冊**: 重定向到註冊頁面
- **註冊待審核**: 顯示待審核頁面
- **完全認證**: 訪問完整功能

#### E2E 測試要點
```javascript
// 測試不同認證狀態
test('authentication flow', async ({ page }) => {
  // 測試未認證訪問
  await page.goto('/files')
  await expect(page).toHaveURL('/access-denied')
  
  // 模擬 Cloudflare 認證
  await page.addInitScript(() => {
    window.localStorage.setItem('auth_status', 'authenticated')
  })
  
  // 測試註冊流程
  await page.goto('/register')
  await page.fill('[data-testid="name-input"]', '測試用戶')
  await page.click('[data-testid="submit-button"]')
  await expect(page).toHaveURL('/pending-approval')
})
```

### 2. 主頁儀表板 🏠

#### 核心元件
- **WelcomeHeader**: 用戶歡迎訊息 + 快速統計
- **QuickActions**: 常用操作按鈕
- **RecentFilesWidget**: 最近檔案列表
- **StorageStatsWidget**: 儲存空間統計

#### 資料流
```typescript
// Pinia Store 整合
const filesStore = useFilesStore()
const authStore = useAuthStore()

// 真實資料計算
const totalFiles = computed(() => filesStore.files.length)
const recentFiles = computed(() => 
  filesStore.files
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)
)
```

#### E2E 測試場景
```javascript
test('home dashboard functionality', async ({ page }) => {
  await page.goto('/')
  
  // 檢查統計數據載入
  await expect(page.locator('[data-testid="total-files"]')).toBeVisible()
  await expect(page.locator('[data-testid="storage-used"]')).toBeVisible()
  
  // 檢查快速操作
  await page.click('[data-testid="quick-upload"]')
  await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible()
  
  // 檢查最近檔案
  const recentFiles = page.locator('[data-testid="recent-file-item"]')
  await expect(recentFiles).toHaveCount.greaterThan(0)
})
```

### 3. 檔案管理系統 📁

#### 主要功能
- **檔案上傳**: 拖放 + 檔案選擇器
- **檔案瀏覽**: 虛擬路徑導航
- **檔案操作**: 重新命名、移動、刪除
- **搜尋篩選**: 即時搜尋 + 分類篩選

#### 檔案上傳流程
```vue
<template>
  <UploadModal 
    v-if="showUploadModal"
    @upload-complete="handleUploadComplete"
    @upload-error="handleUploadError"
  />
</template>

<script setup>
// 上傳進度追蹤
const uploadProgress = ref(0)
const uploadStatus = ref('idle') // 'uploading', 'success', 'error'

const handleFileUpload = async (files) => {
  uploadStatus.value = 'uploading'
  
  for (const file of files) {
    try {
      await filesStore.uploadFile(file, {
        onProgress: (progress) => {
          uploadProgress.value = progress
        }
      })
    } catch (error) {
      uploadStatus.value = 'error'
      // 錯誤處理
    }
  }
  
  uploadStatus.value = 'success'
}
</script>
```

#### E2E 測試重點
```javascript
test('file upload and management', async ({ page }) => {
  await page.goto('/files')
  
  // 測試檔案上傳
  await page.click('[data-testid="upload-button"]')
  
  // 測試拖放上傳
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles([
    { name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('測試內容') }
  ])
  
  // 檢查上傳進度
  await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()
  
  // 檢查檔案出現在列表中
  await expect(page.locator('[data-testid="file-item"]').filter({ hasText: 'test.txt' })).toBeVisible()
})
```

### 4. 分享資源管理 🤝

#### 教會特色功能
- **按內容分類**: 影片、文件、照片、簡報、音檔
- **按年份分類**: 2023-2027年度資料
- **按部門分類**: 各部門專屬檔案
- **教會活動分類**: 聚會、慶典、節期

#### 導航結構
```vue
<template>
  <div class="shared-folder-view">
    <AppBreadcrumb :items="breadcrumbItems" />
    
    <div class="category-grid">
      <CategoryCard 
        v-for="category in categories"
        :key="category.id"
        :category="category"
        @click="navigateToCategory"
      />
    </div>
    
    <div class="files-grid">
      <FileCard 
        v-for="file in categoryFiles"
        :key="file.id"
        :file="file"
      />
    </div>
  </div>
</template>
```

#### E2E 測試案例
```javascript
test('shared resources navigation', async ({ page }) => {
  await page.goto('/shared')
  
  // 測試分類導航
  await page.click('[data-testid="category-影片"]')
  await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('影片')
  
  // 測試子分類
  await page.click('[data-testid="subcategory-講道錄影"]')
  await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('講道錄影')
  
  // 測試年份篩選
  await page.click('[data-testid="year-filter-2025"]')
  const files = page.locator('[data-testid="file-item"]')
  await expect(files.first()).toBeVisible()
})
```

### 5. 安息日數據管理 ⛪

#### 專門功能
- **聚會記錄**: 安息日聚會資料管理
- **時間篩選**: 按日期、月份篩選
- **資料展示**: 專用的安息日檔案卡片

#### E2E 測試
```javascript
test('sabbath data management', async ({ page }) => {
  await page.goto('/sabbath')
  
  // 檢查安息日專用界面
  await expect(page.locator('[data-testid="sabbath-header"]')).toBeVisible()
  
  // 測試日期篩選
  await page.selectOption('[data-testid="month-filter"]', '2025-01')
  await expect(page.locator('[data-testid="sabbath-file-card"]')).toBeVisible()
  
  // 測試安息日檔案卡片功能
  await page.click('[data-testid="sabbath-file-card"]').first()
  await expect(page.locator('[data-testid="file-preview"]')).toBeVisible()
})
```

### 6. 管理員功能 👨‍💼

#### 管理面板
- **用戶管理**: 查看、審核、管理用戶
- **註冊審核**: 批准/拒絕新用戶註冊
- **系統統計**: 查看系統使用情況
- **檔案管理**: 管理員級檔案操作

#### 權限控制
```typescript
// 路由守衛
const requireAdmin = (to: RouteLocationNormalized) => {
  const authStore = useAuthStore()
  return authStore.user?.role === 'admin'
}

// 元件內權限檢查
const canAccessAdminFeatures = computed(() => 
  authStore.user?.role === 'admin'
)
```

#### E2E 測試
```javascript
test('admin functionality', async ({ page, context }) => {
  // 模擬管理員登入
  await context.addInitScript(() => {
    window.localStorage.setItem('user_role', 'admin')
  })
  
  await page.goto('/admin')
  
  // 測試用戶管理
  await page.click('[data-testid="users-tab"]')
  await expect(page.locator('[data-testid="user-list"]')).toBeVisible()
  
  // 測試註冊審核
  await page.click('[data-testid="registrations-tab"]')
  await page.click('[data-testid="approve-button"]').first()
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  
  // 測試系統統計
  await page.click('[data-testid="stats-tab"]')
  await expect(page.locator('[data-testid="system-stats"]')).toBeVisible()
})
```

## UI 元件測試重點

### 1. 模態窗口 (Modals)
- **焦點管理**: 開啟時焦點移到模態，關閉時返回觸發元素
- **鍵盤導航**: ESC 關閉、Tab 循環
- **背景互動**: 點擊背景關閉

### 2. 表單驗證
- **即時驗證**: 輸入時即時回饋
- **錯誤顯示**: 清晰的錯誤訊息
- **提交狀態**: 載入狀態、成功/失敗反饋

### 3. 檔案拖放
- **視覺回饋**: 拖放區域高亮
- **檔案類型驗證**: 支援的檔案格式檢查
- **進度顯示**: 上傳進度條

## 響應式設計測試

### 斷點測試
```javascript
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
]

for (const viewport of viewports) {
  test(`responsive design - ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    
    // 檢查導航在不同裝置上的行為
    if (viewport.width < 768) {
      // 手機版：漢堡選單
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
    } else {
      // 桌面版：完整導航
      await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible()
    }
  })
}
```

## 無障礙測試

### 鍵盤導航
```javascript
test('keyboard navigation', async ({ page }) => {
  await page.goto('/')
  
  // Tab 鍵導航
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'first-focusable')
  
  // 確保所有互動元素都可以用鍵盤訪問
  const interactiveElements = page.locator('button, a, input, select, textarea')
  for (let i = 0; i < await interactiveElements.count(); i++) {
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
  }
})
```

### 螢幕閱讀器支援
```javascript
test('screen reader accessibility', async ({ page }) => {
  await page.goto('/')
  
  // 檢查重要元素的 ARIA 標籤
  await expect(page.locator('[role="main"]')).toBeVisible()
  await expect(page.locator('[aria-label="主要導航"]')).toBeVisible()
  
  // 檢查表單標籤
  const formInputs = page.locator('input')
  for (let i = 0; i < await formInputs.count(); i++) {
    const input = formInputs.nth(i)
    await expect(input).toHaveAttribute('aria-label')
  }
})
```

## 效能測試

### 載入時間
```javascript
test('page load performance', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/')
  
  // 等待重要元素載入
  await page.waitForSelector('[data-testid="main-content"]')
  
  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(3000) // 3秒內載入
})
```

### 大量資料處理
```javascript
test('large dataset handling', async ({ page }) => {
  // 模擬大量檔案
  await page.route('/api/files', (route) => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `file-${i}.txt`,
      size: Math.random() * 1000000
    }))
    
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { items: largeDataset } })
    })
  })
  
  await page.goto('/files')
  
  // 檢查虛擬滾動或分頁是否正常運作
  const visibleFiles = page.locator('[data-testid="file-item"]:visible')
  await expect(visibleFiles.count()).toBeLessThan(100) // 應該只顯示部分檔案
})
```

## 錯誤處理測試

### 網路錯誤
```javascript
test('network error handling', async ({ page }) => {
  // 模擬網路錯誤
  await page.route('/api/**', (route) => {
    route.abort('failed')
  })
  
  await page.goto('/files')
  
  // 檢查錯誤提示
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
})
```

### API 錯誤回應
```javascript
test('API error response handling', async ({ page }) => {
  await page.route('/api/files/upload', (route) => {
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: '檔案太大' }
      })
    })
  })
  
  // 測試上傳錯誤處理
  await page.goto('/files')
  await page.click('[data-testid="upload-button"]')
  // ... 上傳檔案 ...
  
  await expect(page.locator('[data-testid="error-toast"]')).toContainText('檔案太大')
})
```

## 測試資料準備

### 測試夾具
```javascript
// fixtures/test-data.js
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    name: '測試管理員',
    role: 'admin',
    status: 'active'
  },
  user: {
    email: 'user@test.com',
    name: '測試用戶',
    role: 'user',
    status: 'active'
  },
  pending: {
    email: 'pending@test.com',
    name: '待審核用戶',
    role: 'user',
    status: 'pending'
  }
}

export const testFiles = [
  {
    id: 1,
    name: '測試文件.pdf',
    size: 1024 * 1024,
    virtualPath: '/documents/測試文件.pdf',
    categoryId: 1,
    createdAt: '2025-01-01T00:00:00Z'
  },
  // ... 更多測試檔案
]
```

## CI/CD 整合

### GitHub Actions 設定
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          npx playwright install
          
      - name: Start backend
        run: |
          docker-compose up -d
          # 等待服務就緒
          
      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e
          
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/test-results/
```

## 總結

MemoryArk 2.0 的前端需要全面的 E2E 測試覆蓋，重點包括：

### 優先級高
1. **認證流程** - 業務關鍵
2. **檔案上傳管理** - 核心功能
3. **管理員審核** - 營運必需

### 優先級中
1. **搜尋篩選** - 用戶體驗
2. **響應式設計** - 裝置兼容
3. **錯誤處理** - 系統穩定

### 優先級低
1. **進階檔案操作** - 進階功能
2. **效能優化** - 效能優化
3. **無障礙邊緣案例** - 特殊需求

這個分析提供了完整的 E2E 測試基礎，可以確保 MemoryArk 2.0 在真實使用環境中的穩定性和用戶體驗。