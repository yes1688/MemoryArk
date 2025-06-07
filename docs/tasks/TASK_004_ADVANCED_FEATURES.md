# 任務 004：實作進階功能

## 任務概述
為 MemoryArk 2.0 加入進階功能，提升檔案管理的便利性和效率，包括標籤系統、收藏功能、最近訪問記錄和分享連結。

## 依賴項目
- 任務 001：設計系統基礎（必須先完成）
- 任務 002：檔案管理界面（建議先完成）

## 子任務詳細說明

### 4.1 標籤系統實作

**目標**：建立完整的檔案標籤管理系統

**資料庫設計**：
```sql
-- 標籤表
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  icon VARCHAR(50),
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 檔案標籤關聯表
CREATE TABLE file_tags (
  file_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  tagged_by INTEGER NOT NULL,
  tagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (file_id, tag_id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  FOREIGN KEY (tagged_by) REFERENCES users(id)
);

-- 預設標籤
INSERT INTO tags (name, color, icon, created_by) VALUES
  ('重要', '#EF4444', 'star', 1),
  ('工作', '#3B82F6', 'briefcase', 1),
  ('個人', '#10B981', 'user', 1),
  ('待處理', '#F59E0B', 'clock', 1),
  ('已完成', '#6B7280', 'check', 1);
```

**前端組件**：
```vue
<!-- TagManager.vue -->
<template>
  <div class="tag-manager">
    <!-- 標籤輸入 -->
    <div class="tag-input-wrapper">
      <input 
        v-model="newTag"
        @keydown.enter="addTag"
        placeholder="輸入標籤..."
        class="tag-input"
      />
      <button @click="showTagPicker = true">
        <Icon name="tag" />
      </button>
    </div>
    
    <!-- 已選標籤 -->
    <div class="selected-tags">
      <span 
        v-for="tag in selectedTags" 
        :key="tag.id"
        :style="{ backgroundColor: tag.color }"
        class="tag-chip"
      >
        {{ tag.name }}
        <button @click="removeTag(tag)">×</button>
      </span>
    </div>
    
    <!-- 標籤選擇器 -->
    <TagPicker 
      v-if="showTagPicker"
      :popular-tags="popularTags"
      @select="selectTag"
      @create="createTag"
    />
  </div>
</template>
```

**API 端點**：
```typescript
// 標籤相關 API
GET    /api/tags                 // 獲取所有標籤
POST   /api/tags                 // 創建新標籤
PUT    /api/tags/:id            // 更新標籤
DELETE /api/tags/:id            // 刪除標籤
GET    /api/tags/popular        // 獲取熱門標籤
POST   /api/files/:id/tags      // 為檔案添加標籤
DELETE /api/files/:id/tags/:tagId // 移除檔案標籤
```

### 4.2 收藏功能實作

**目標**：讓用戶可以收藏常用檔案，快速訪問

**資料庫設計**：
```sql
-- 收藏表
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  folder_id INTEGER,  -- 收藏資料夾
  note TEXT,         -- 收藏備註
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, file_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 收藏資料夾
CREATE TABLE favorite_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**UI 整合**：
1. **檔案卡片加入收藏按鈕**
   ```vue
   <button 
     @click="toggleFavorite"
     :class="{ 'is-favorite': isFavorite }"
     class="favorite-btn"
   >
     <Icon :name="isFavorite ? 'star-filled' : 'star'" />
   </button>
   ```

2. **側邊欄收藏區域**
   ```vue
   <div class="favorites-section">
     <h3>我的收藏</h3>
     <div class="favorite-folders">
       <FavoriteFolder 
         v-for="folder in favoriteFolders" 
         :key="folder.id"
         :folder="folder"
       />
     </div>
     <div class="recent-favorites">
       <FileItem 
         v-for="file in recentFavorites" 
         :key="file.id"
         :file="file"
         compact
       />
     </div>
   </div>
   ```

### 4.3 最近訪問記錄

**目標**：追蹤用戶的檔案訪問歷史，方便快速找到最近使用的檔案

**資料庫設計**：
```sql
-- 訪問歷史表
CREATE TABLE access_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL, -- view, download, edit
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 建立索引提升查詢效能
CREATE INDEX idx_access_history_user_time 
ON access_history(user_id, accessed_at DESC);
```

**功能實作**：
```typescript
// 記錄訪問歷史
async function recordAccess(fileId: number, action: string) {
  await api.post('/api/access-history', {
    fileId,
    action,
    timestamp: new Date().toISOString()
  })
}

// 獲取最近訪問
async function getRecentFiles(limit = 10) {
  const response = await api.get('/api/access-history/recent', {
    params: { limit }
  })
  return response.data
}

// 清除歷史記錄
async function clearHistory(options?: {
  before?: Date,
  fileIds?: number[]
}) {
  await api.delete('/api/access-history', { data: options })
}
```

**首頁整合**：
```vue
<!-- RecentFiles.vue -->
<template>
  <div class="recent-files">
    <div class="section-header">
      <h2>最近訪問</h2>
      <button @click="showAll" class="view-all">
        查看全部
      </button>
    </div>
    
    <div class="time-groups">
      <div v-for="group in timeGroups" :key="group.label" class="time-group">
        <h3>{{ group.label }}</h3>
        <div class="file-grid">
          <FileCard 
            v-for="file in group.files" 
            :key="file.id"
            :file="file"
            :show-access-time="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 按時間分組
const timeGroups = computed(() => {
  return [
    { label: '今天', files: filterByDate(files, 'today') },
    { label: '昨天', files: filterByDate(files, 'yesterday') },
    { label: '本週', files: filterByDate(files, 'this-week') },
    { label: '更早', files: filterByDate(files, 'older') }
  ].filter(group => group.files.length > 0)
})
</script>
```

### 4.4 分享連結功能

**目標**：生成有時效性和下載限制的檔案分享連結

**資料庫設計**：
```sql
-- 分享連結表（已在規格書中定義）
CREATE TABLE file_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  shared_by INTEGER NOT NULL,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),           -- 可選的密碼保護
  expires_at DATETIME,             -- 過期時間
  download_count INTEGER DEFAULT 0, -- 已下載次數
  max_downloads INTEGER,           -- 最大下載次數
  allowed_emails TEXT,             -- JSON 陣列，限定可訪問的郵箱
  message TEXT,                    -- 分享訊息
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME,
  FOREIGN KEY (file_id) REFERENCES files(id),
  FOREIGN KEY (shared_by) REFERENCES users(id)
);

-- 分享訪問記錄
CREATE TABLE share_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_id INTEGER NOT NULL,
  accessed_by_email VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (share_id) REFERENCES file_shares(id)
);
```

**分享連結生成器組件**：
```vue
<!-- ShareLinkGenerator.vue -->
<template>
  <AppDialog 
    :visible="visible" 
    @close="$emit('close')"
    title="生成分享連結"
  >
    <div class="share-settings">
      <!-- 基本設定 -->
      <div class="setting-group">
        <label>有效期限</label>
        <select v-model="settings.expiresIn">
          <option value="1h">1 小時</option>
          <option value="1d">1 天</option>
          <option value="7d">7 天</option>
          <option value="30d">30 天</option>
          <option value="custom">自訂</option>
        </select>
        <DateTimePicker 
          v-if="settings.expiresIn === 'custom'"
          v-model="settings.customExpiry"
        />
      </div>
      
      <!-- 下載限制 -->
      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="settings.hasDownloadLimit"
          />
          限制下載次數
        </label>
        <input 
          v-if="settings.hasDownloadLimit"
          type="number"
          v-model="settings.maxDownloads"
          min="1"
          placeholder="最大下載次數"
        />
      </div>
      
      <!-- 密碼保護 -->
      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="settings.hasPassword"
          />
          密碼保護
        </label>
        <input 
          v-if="settings.hasPassword"
          type="password"
          v-model="settings.password"
          placeholder="設定密碼"
        />
      </div>
      
      <!-- 訪問限制 -->
      <div class="setting-group">
        <label>限定訪問者（Email）</label>
        <TagInput 
          v-model="settings.allowedEmails"
          placeholder="輸入允許訪問的 Email..."
        />
      </div>
      
      <!-- 分享訊息 -->
      <div class="setting-group">
        <label>分享訊息（選填）</label>
        <textarea 
          v-model="settings.message"
          rows="3"
          placeholder="給接收者的訊息..."
        />
      </div>
    </div>
    
    <!-- 生成的連結 -->
    <div v-if="generatedLink" class="generated-link">
      <div class="link-display">
        <input 
          :value="generatedLink" 
          readonly
          ref="linkInput"
        />
        <button @click="copyLink" class="copy-btn">
          {{ copied ? '已複製' : '複製' }}
        </button>
      </div>
      
      <!-- QR Code -->
      <div class="qr-code">
        <QRCode :value="generatedLink" :size="200" />
      </div>
      
      <!-- 分享選項 -->
      <div class="share-options">
        <button @click="shareViaEmail">
          <Icon name="email" /> Email
        </button>
        <button @click="shareViaLine">
          <Icon name="line" /> LINE
        </button>
      </div>
    </div>
    
    <template #footer>
      <button @click="generateLink" :disabled="loading">
        {{ generatedLink ? '重新生成' : '生成連結' }}
      </button>
    </template>
  </AppDialog>
</template>
```

**分享頁面**：
```vue
<!-- PublicShareView.vue - 公開分享頁面 -->
<template>
  <div class="share-page">
    <div class="share-container">
      <!-- 檔案資訊 -->
      <div class="file-info">
        <AppFileIcon 
          :file-type="file.mimeType" 
          size="xl" 
        />
        <h1>{{ file.name }}</h1>
        <p>{{ formatFileSize(file.size) }}</p>
        <p v-if="share.message" class="share-message">
          {{ share.message }}
        </p>
      </div>
      
      <!-- 密碼輸入 -->
      <div v-if="needsPassword" class="password-form">
        <input 
          type="password" 
          v-model="password"
          @keydown.enter="verifyPassword"
          placeholder="請輸入密碼"
        />
        <button @click="verifyPassword">確認</button>
      </div>
      
      <!-- 下載按鈕 -->
      <div v-else class="download-section">
        <button 
          @click="downloadFile" 
          :disabled="!canDownload"
          class="download-btn"
        >
          <Icon name="download" />
          下載檔案
        </button>
        
        <div v-if="share.maxDownloads" class="download-limit">
          剩餘下載次數：{{ remainingDownloads }}
        </div>
        
        <div v-if="share.expiresAt" class="expiry-info">
          有效期至：{{ formatDate(share.expiresAt) }}
        </div>
      </div>
      
      <!-- 預覽區域 -->
      <div v-if="canPreview" class="preview-section">
        <FilePreview :file="file" />
      </div>
    </div>
  </div>
</template>
```

### 4.5 整合與優化

**統一的檔案操作選單**：
```vue
<!-- FileActionsMenu.vue -->
<template>
  <div class="file-actions">
    <button @click="toggleFavorite">
      <Icon :name="isFavorite ? 'star-filled' : 'star'" />
      {{ isFavorite ? '取消收藏' : '收藏' }}
    </button>
    
    <button @click="openTagManager">
      <Icon name="tag" />
      標籤 ({{ file.tags?.length || 0 }})
    </button>
    
    <button @click="generateShareLink">
      <Icon name="share" />
      分享
    </button>
    
    <button @click="showHistory">
      <Icon name="history" />
      歷史記錄
    </button>
  </div>
</template>
```

## 實作順序

1. **第一天**：
   - 建立標籤系統資料庫結構
   - 實作標籤管理 API
   - 建立 TagManager 組件

2. **第二天**：
   - 實作收藏功能
   - 整合到檔案卡片和側邊欄
   - 建立收藏管理頁面

3. **第三天**：
   - 實作訪問歷史記錄
   - 建立最近訪問組件
   - 整合到首頁

4. **第四天**：
   - 實作分享連結生成
   - 建立公開分享頁面
   - 測試各種分享場景

5. **第五天**：
   - 整合所有功能
   - 效能優化
   - 完整測試

## 測試要點

### 標籤系統
- [ ] 標籤的增刪改查功能正常
- [ ] 批量標籤操作效能良好
- [ ] 標籤搜尋和篩選準確
- [ ] 標籤顏色和圖標顯示正確

### 收藏功能
- [ ] 收藏和取消收藏即時反應
- [ ] 收藏夾分類管理正常
- [ ] 收藏同步到各個界面
- [ ] 大量收藏時效能穩定

### 最近訪問
- [ ] 訪問記錄準確記錄
- [ ] 時間分組顯示正確
- [ ] 清除歷史功能正常
- [ ] 隱私模式不記錄歷史

### 分享連結
- [ ] 連結生成和訪問正常
- [ ] 過期時間控制準確
- [ ] 下載次數限制有效
- [ ] 密碼保護功能正常
- [ ] 分享頁面響應式設計

## 效能考量

1. **標籤快取**：熱門標籤快取在前端
2. **批量操作**：使用批量 API 減少請求
3. **懶加載**：歷史記錄分頁加載
4. **索引優化**：為常用查詢建立資料庫索引

## 安全考量

1. **分享連結**：使用加密 token，避免猜測
2. **訪問控制**：驗證用戶權限
3. **日誌記錄**：記錄所有分享訪問
4. **密碼加密**：分享密碼加密存儲

## 完成標準

- [ ] 所有功能模組正常運作
- [ ] API 端點安全且高效
- [ ] UI 組件符合設計規範
- [ ] 通過所有測試案例
- [ ] 文檔和註釋完整