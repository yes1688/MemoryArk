# MemoryArk 信徒版系統可行性分析與架構規劃

## 📋 專案概述

### 目標
建立一個信徒版的 MemoryArk 系統，**鼓勵信徒踴躍上傳照片**，使用 Google 登入，確保信徒只能管理自己上傳的內容，與現有管理介面分隔但共用同一系統。

### 核心需求
1. **Google OAuth 認證** - 信徒使用 Google 帳號一鍵登入
2. **照片上傳** - 專注於照片上傳，支援拖拽、批量上傳
3. **個人空間** - 每位信徒只能訪問自己上傳的照片
4. **基本管理** - 可檢視、下載、刪除自己的照片
5. **用戶隔離** - 嚴格的權限控制，無法訪問他人內容
6. **鼓勵機制** - 簡化操作流程，提升上傳體驗

---

## 🏗️ 現有系統架構分析

### 當前認證機制
```
Cloudflare Access → 內部審核系統 → 角色權限控制
- 雙層安全認證
- 手動用戶審核
- admin/user 角色區分
```

### 資料庫結構（10張表）
- `users` - 用戶管理（4名用戶）
- `files` - 檔案主表（127個檔案）
- `folders` - 虛擬資料夾
- `file_shares` - 分享機制
- `storage_stats` - 存儲統計
- `user_registrations` - 註冊申請
- 其他支援表

### 檔案存儲機制
```
uploads/
├── [hash前2字元]/
│   └── [hash後2字元]/
│       └── [UUID檔名]
```

### API 架構
```
/api/public/*     - 公開端點
/api/protected/*  - 認證用戶
/api/admin/*      - 管理員專用
```

---

## 🎯 信徒版系統設計

### 1. 雙重認證架構

#### 管理版（現有）
```
Cloudflare Access → 內部審核 → JWT Token → 管理功能
```

#### 信徒版（新增）
```
Google OAuth → 自動註冊 → JWT Token → 簡化功能
```

### 2. 用戶類型擴展

```sql
-- 擴展用戶表
ALTER TABLE users ADD COLUMN user_type ENUM('admin', 'staff', 'believer') DEFAULT 'staff';
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE;
```

#### 用戶類型定義
- `admin` - 系統管理員（現有）
- `staff` - 教會同工（現有）  
- `believer` - 教會信徒（新增）

### 3. 檔案隔離機制

#### 虛擬資料夾結構
```
根目錄/
├── 管理檔案/           # 管理版專用
│   ├── 教會文件/
│   └── 系統資料/
└── 信徒上傳/           # 信徒版專用
    ├── 張三/
    ├── 李四/
    └── 王五/
```

#### 權限控制矩陣
| 用戶類型 | 管理檔案 | 其他信徒檔案 | 自己檔案 |
|---------|---------|-------------|---------|
| admin   | ✅ 完全  | ✅ 完全      | ✅ 完全  |
| staff   | ✅ 讀取  | ❌ 無權限    | ✅ 完全  |
| believer| ❌ 無權限 | ❌ 無權限    | ✅ 完全  |

### 4. API 路由設計

#### 新增信徒專用端點
```go
// 信徒認證
/api/believer/auth/google/login
/api/believer/auth/google/callback
/api/believer/auth/refresh

// 照片上傳（核心功能）
/api/believer/photos/upload          // 單張/批量上傳
/api/believer/photos/upload-progress // 上傳進度查詢

// 個人照片管理
/api/believer/photos/list            // 列出自己的照片
/api/believer/photos/:id/view        // 檢視照片（縮圖/原圖）
/api/believer/photos/:id/download    // 下載照片
/api/believer/photos/:id/delete      // 刪除照片

// 個人統計
/api/believer/profile                // 個人資料
/api/believer/stats                  // 上傳統計（數量/容量）
```

#### 中間件權限檢查
```go
func BelieverAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 驗證 JWT Token
        // 檢查用戶類型為 believer
        // 設置用戶上下文
    }
}

func PhotoOwnershipMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 確保照片屬於當前用戶
        // 檢查 uploaded_by 欄位
        // 限制檔案類型為圖片格式
    }
}

func PhotoTypeMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 限制只能上傳圖片格式
        // 支援：JPG, PNG, GIF, WEBP, HEIC
        // 檢查檔案大小限制（如 10MB）
    }
}
```

---

## 🔐 Google OAuth 整合方案

### 1. Google Cloud Console 設定
```yaml
OAuth 2.0 客戶端:
  應用程式類型: Web 應用程式
  授權 JavaScript 來源: https://believer.memoryark.com
  授權重新導向 URI: https://believer.memoryark.com/auth/callback
```

### 2. Go 後端實作（使用 golang.org/x/oauth2）
```go
import (
    "golang.org/x/oauth2"
    "golang.org/x/oauth2/google"
)

var googleOauthConfig = &oauth2.Config{
    RedirectURL:  "https://believer.memoryark.com/auth/callback",
    ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
    ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
    Scopes:       []string{"openid", "profile", "email"},
    Endpoint:     google.Endpoint,
}

func handleGoogleLogin(c *gin.Context) {
    url := googleOauthConfig.AuthCodeURL("state", oauth2.AccessTypeOffline)
    c.Redirect(http.StatusTemporaryRedirect, url)
}

func handleGoogleCallback(c *gin.Context) {
    // 處理 OAuth 回調
    // 獲取用戶資訊
    // 自動註冊或登入
    // 生成 JWT Token
}
```

### 3. 前端整合（Vue 3）
```typescript
// stores/believerAuth.ts
export const useBelieverAuthStore = defineStore('believerAuth', {
  state: () => ({
    user: null as BelieverUser | null,
    token: localStorage.getItem('believer_token'),
    isAuthenticated: false
  }),
  
  actions: {
    async googleLogin() {
      window.location.href = '/api/believer/auth/google/login'
    },
    
    async handleCallback(code: string) {
      const response = await believerApi.auth.callback(code)
      this.setAuth(response.data)
    }
  }
})
```

---

## 💾 資料庫結構變更

### 1. 用戶表擴展
```sql
-- 新增欄位
ALTER TABLE users ADD COLUMN user_type ENUM('admin', 'staff', 'believer') DEFAULT 'staff';
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN google_email VARCHAR(255);
ALTER TABLE users ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN created_via ENUM('manual', 'google_oauth') DEFAULT 'manual';

-- 建立索引
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_google_id ON users(google_id);
```

### 2. 檔案表權限增強
```sql
-- 新增租戶概念（可選）
ALTER TABLE files ADD COLUMN tenant_type ENUM('admin', 'believer') DEFAULT 'admin';
ALTER TABLE files ADD COLUMN is_believer_upload BOOLEAN DEFAULT FALSE;

-- 建立索引優化查詢
CREATE INDEX idx_files_uploaded_by_type ON files(uploaded_by, tenant_type);
CREATE INDEX idx_files_believer_uploads ON files(is_believer_upload, uploaded_by);
```

### 3. 新增信徒專用表（可選）
```sql
-- 信徒上傳統計
CREATE TABLE believer_upload_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_files INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0,
    last_upload_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 信徒活動日誌
CREATE TABLE believer_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🎨 前端架構設計

### 1. 路由分離
```typescript
// router/believer.ts
const believerRoutes = [
  {
    path: '/believer',
    component: BelieverLayout,
    meta: { requiresBelieverAuth: true },
    children: [
      { path: '', name: 'BelieverHome', component: BelieverHomeView },
      { path: 'upload', name: 'BelieverUpload', component: BelieverUploadView },
      { path: 'files', name: 'BelieverFiles', component: BelieverFilesView },
      { path: 'profile', name: 'BelieverProfile', component: BelieverProfileView }
    ]
  },
  {
    path: '/believer/login',
    name: 'BelieverLogin',
    component: BelieverLoginView
  }
]
```

### 2. 獨立的 Store 管理
```typescript
// stores/believerPhotos.ts
export const useBelieverPhotosStore = defineStore('believerPhotos', {
  state: () => ({
    photos: [] as BelieverPhoto[],
    uploadProgress: {} as Record<string, number>,
    isUploading: false,
    storageUsed: 0,
    storageLimit: 1024 * 1024 * 1024, // 1GB per believer
    uploadStats: {
      totalPhotos: 0,
      thisWeekUploads: 0,
      thisMonthUploads: 0
    }
  }),
  
  actions: {
    // 獲取我的照片
    async fetchMyPhotos() {
      const response = await believerApi.photos.list()
      this.photos = response.data
      this.updateStats()
    },
    
    // 批量上傳照片
    async uploadPhotos(files: File[]) {
      this.isUploading = true
      const photoFiles = files.filter(file => this.isImageFile(file))
      
      for (const file of photoFiles) {
        await this.uploadSinglePhoto(file)
      }
      
      this.isUploading = false
      await this.fetchMyPhotos()
    },
    
    // 刪除照片
    async deletePhoto(photoId: number) {
      await believerApi.photos.delete(photoId)
      await this.fetchMyPhotos()
    },
    
    // 檢查是否為圖片格式
    isImageFile(file: File): boolean {
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
      return imageTypes.includes(file.type)
    }
  }
})
```

### 3. 簡化的 UI 設計（專注照片體驗）
```vue
<!-- BelieverHomeView.vue -->
<template>
  <div class="believer-home">
    <!-- 歡迎標題 -->
    <header class="welcome-header">
      <h1>歡迎，{{ believerAuth.user?.name }}</h1>
      <p>分享您的美好時光 📸</p>
    </header>
    
    <!-- 大型拖拽上傳區（鼓勵上傳） -->
    <div class="hero-upload-zone">
      <PhotoDropZone 
        @photos-dropped="handlePhotoUpload"
        :is-uploading="photosStore.isUploading"
        class="large-drop-zone"
      >
        <div class="upload-encouragement">
          <camera-icon class="upload-icon" />
          <h2>拖放照片到這裡</h2>
          <p>或點擊選擇照片 • 支援批量上傳</p>
          <small>支援 JPG, PNG, GIF, WEBP 格式</small>
        </div>
      </PhotoDropZone>
    </div>
    
    <!-- 上傳統計（激勵元素） -->
    <div class="upload-stats">
      <div class="stat-card">
        <span class="stat-number">{{ photosStore.uploadStats.totalPhotos }}</span>
        <span class="stat-label">總照片數</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ photosStore.uploadStats.thisWeekUploads }}</span>
        <span class="stat-label">本週上傳</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ formatStorageUsed }}</span>
        <span class="stat-label">已使用空間</span>
      </div>
    </div>
    
    <!-- 我的照片網格 -->
    <div class="my-photos-section">
      <div class="section-header">
        <h2>我的照片</h2>
        <div class="view-options">
          <button @click="viewMode = 'grid'" :class="{active: viewMode === 'grid'}">網格</button>
          <button @click="viewMode = 'list'" :class="{active: viewMode === 'list'}">列表</button>
        </div>
      </div>
      
      <PhotoGrid 
        v-if="viewMode === 'grid'"
        :photos="photosStore.photos"
        @photo-click="viewPhoto"
        @photo-delete="deletePhoto"
        @photo-download="downloadPhoto"
      />
      
      <PhotoList 
        v-else
        :photos="photosStore.photos"
        @photo-click="viewPhoto"
        @photo-delete="deletePhoto"
        @photo-download="downloadPhoto"
      />
    </div>
  </div>
</template>

<script setup>
const photosStore = useBelieverPhotosStore()

// 照片操作
const handlePhotoUpload = (files) => {
  photosStore.uploadPhotos(files)
}

const viewPhoto = (photo) => {
  // 開啟照片檢視器
}

const deletePhoto = async (photoId) => {
  if (confirm('確定要刪除這張照片嗎？')) {
    await photosStore.deletePhoto(photoId)
  }
}

const downloadPhoto = (photo) => {
  // 下載照片
  window.open(`/api/believer/photos/${photo.id}/download`)
}
</script>
```

---

## 🚀 部署架構

### 1. 容器化部署
```yaml
# docker-compose.believer.yml
version: '3.8'
services:
  memoryark-believer:
    build: .
    ports:
      - "8081:8080"  # 信徒版端口
    environment:
      - MODE=believer
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - BELIEVER_DOMAIN=believer.memoryark.com
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
```

### 2. Nginx 反向代理配置
```nginx
# 管理版
server {
    server_name admin.memoryark.com;
    location / {
        proxy_pass http://localhost:8080;
    }
}

# 信徒版
server {
    server_name believer.memoryark.com;
    location / {
        proxy_pass http://localhost:8081;
    }
    
    # 特殊處理 Google OAuth 回調
    location /auth/callback {
        proxy_pass http://localhost:8081/api/believer/auth/google/callback;
    }
}
```

### 3. 環境變數配置
```bash
# .env.believer
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
BELIEVER_STORAGE_LIMIT=1073741824  # 1GB per user
BELIEVER_AUTO_APPROVE=true
BELIEVER_ALLOWED_DOMAINS=gmail.com,your-church-domain.com
```

---

## ⚖️ 可行性評估

### ✅ 技術可行性：高
1. **OAuth 整合** - Go 有成熟的 oauth2 函式庫
2. **資料庫擴展** - SQLite 支援 ALTER TABLE
3. **權限控制** - 現有中間件可擴展
4. **前端分離** - Vue Router 支援多路由配置

### ⏰ 開發時程評估

#### 階段一：後端基礎架構（3-4週）
- [ ] Google OAuth 整合
- [ ] 資料庫結構調整
- [ ] API 端點開發
- [ ] 權限控制實作

#### 階段二：前端信徒版（2-3週）
- [ ] 信徒版 UI 設計
- [ ] 檔案上傳界面
- [ ] 認證流程整合
- [ ] 響應式設計

#### 階段三：測試與部署（1-2週）
- [ ] 整合測試
- [ ] 安全性測試
- [ ] 效能優化
- [ ] 生產環境部署

**總計：6-9週**

### 💰 資源需求

#### 開發資源
- 後端開發：40-60 小時
- 前端開發：30-40 小時
- 測試除錯：20-30 小時
- 部署配置：10-15 小時

#### 基礎設施
- Google Cloud Console 專案
- 額外子域名設定
- SSL 憑證申請
- 監控與日誌系統

### 🔒 安全性考量

#### 優勢
1. **OAuth 2.0** - 業界標準認證
2. **用戶隔離** - 嚴格的檔案權限控制
3. **JWT Token** - 無狀態認證機制
4. **HTTPS 強制** - 所有通訊加密

#### 風險與緩解
1. **資料隔離** 
   - 風險：邏輯錯誤可能導致資料洩露
   - 緩解：多層權限檢查 + 單元測試

2. **存儲限制**
   - 風險：惡意上傳大量檔案
   - 緩解：用戶配額限制 + 檔案類型檢查

3. **OAuth 攻擊**
   - 風險：CSRF 攻擊、重放攻擊
   - 緩解：State 參數驗證 + PKCE 流程

---

## 📊 成本效益分析

### 開發成本
- **人力成本**：約 120-160 開發小時（專注照片功能，範圍縮小）
- **基礎設施**：每月增加約 $10-20 USD
- **維護成本**：每月約 3-5 小時（功能簡化）

### 預期效益
1. **提升參與度** - 簡化流程鼓勵信徒踴躍上傳照片
2. **社群凝聚力** - 透過照片分享增進教會互動
3. **管理效率** - 減少手動收集照片的工作
4. **數據安全** - 個人空間保護隱私，OAuth 安全認證
5. **資源整合** - 統一的照片管理平台

### ROI 評估
- **投資回收期**：2-4個月（基於減少的照片收集人工成本）
- **長期價值**：建立教會數位社群，增進會友參與感
- **無形價值**：提升教會現代化形象，吸引年輕世代

---

## 🎯 建議實施方案

### 方案A：照片專用版（推薦）✨
**專注照片上傳體驗的簡化版本**
- ✅ Google OAuth 一鍵登入
- ✅ 大型拖拽上傳區，支援批量上傳
- ✅ 照片檢視、下載、刪除功能
- ✅ 個人空間隔離，嚴格權限控制
- ✅ 上傳統計和激勵元素
- 📅 **時程：4-6週**
- 💰 **成本：中等，功能精準**

### 方案B：最小可行產品（MVP）
**快速驗證概念的基礎版本**
- ✅ 基礎 Google 登入
- ✅ 簡單的照片上傳
- ✅ 基本列表檢視
- ❌ 無進階 UI 設計
- 📅 **時程：2-3週**
- 💰 **成本：低，功能基本**

### 方案C：分階段實施
**穩健的漸進式開發**
1. **第一階段**：OAuth + 基礎照片上傳（3週）
2. **第二階段**：美化 UI + 批量上傳（2週）
3. **第三階段**：統計功能 + 優化（1週）
- 📅 **總時程：6週**
- 💰 **成本：中高，風險分散**

---

## 🚨 風險評估與緩解策略

### 高風險項目
1. **資料安全** - 實施多層權限檢查
2. **系統整合** - 建立完整的測試套件
3. **用戶體驗** - 進行用戶測試與回饋

### 中風險項目
1. **效能影響** - 資料庫查詢優化
2. **維護複雜度** - 文檔化 + 監控系統
3. **擴展性** - 預留系統擴展接口

### 緩解策略
- **階段性部署** - 先小規模測試
- **回滾機制** - 保留系統還原能力
- **監控告警** - 即時發現問題

---

## 📋 結論與建議

### 總體評估：✅ **強烈推薦實施**

#### 理由
1. **技術成熟** - 所需技術都有成熟解決方案
2. **用戶需求** - 解決信徒上傳檔案的實際痛點
3. **安全可靠** - Google OAuth 提供企業級安全
4. **擴展價值** - 為未來系統升級奠定基礎

#### 建議實施順序
1. **立即開始**：方案C的分階段實施
2. **優先級1**：Google OAuth + 基礎上傳功能
3. **優先級2**：完善UI和用戶體驗
4. **優先級3**：監控、優化和高級功能

#### 關鍵成功因素
- 充分的安全測試
- 良好的用戶界面設計
- 完善的錯誤處理機制
- 清晰的用戶指引文檔

---

*本文檔基於 MemoryArk 2.0.11 版本分析，建議在實施前進行最新版本的技術驗證。*

**文檔版本**：v1.0  
**建立日期**：2025-06-21  
**建立者**：Claude AI Assistant  
**審核狀態**：待審核