# 信徒上傳檔案的管理介面可見性規劃

## 🎯 問題分析

信徒上傳的照片需要在管理介面中有合適的組織方式，讓管理員能夠：
1. **統一檢視**所有信徒上傳的內容
2. **按用戶分類**管理不同信徒的檔案
3. **權限控制**決定哪些內容可見/不可見
4. **資料統計**了解使用情況和趨勢

---

## 🗂️ 建議方案：專用「信徒上傳」資料夾

### 方案A：獨立頂層資料夾（推薦）✨

```
檔案系統根目錄/
├── 📁 教會文件/                    # 現有管理內容
│   ├── 📁 2024年活動/
│   ├── 📁 安息日資料/
│   └── 📁 青年團契/
│
├── 📁 共享資源/                    # 現有共享內容
│   ├── 📁 聖經資源/
│   └── 📁 詩歌資源/
│
└── 📁 信徒上傳/                    # 新增：信徒專區 🆕
    ├── 📁 張三 (user_123)/
    │   ├── 📸 教會聚會照片_001.jpg
    │   ├── 📸 受洗見證照片.jpg
    │   └── 📸 小組聚會_2024.jpg
    │
    ├── 📁 李四 (user_456)/
    │   ├── 📸 復活節活動.jpg
    │   └── 📸 家庭照.jpg
    │
    └── 📁 王五 (user_789)/
        ├── 📸 母親節活動.jpg
        └── 📸 團契生活.jpg
```

#### 📋 實現細節

**1. 資料夾命名規則**
```typescript
// 自動建立信徒專用資料夾
const createBelieverFolder = (user: BelieverUser) => {
  const folderName = `${user.name} (${user.id})`
  // 確保在「信徒上傳」父資料夾下建立
  const parentFolderId = BELIEVER_UPLOADS_FOLDER_ID
  
  return {
    name: folderName,
    parentId: parentFolderId,
    ownerId: user.id,
    type: 'believer_personal'
  }
}
```

**2. 資料庫結構調整**
```sql
-- 檔案表增加信徒標識
ALTER TABLE files ADD COLUMN is_believer_upload BOOLEAN DEFAULT FALSE;
ALTER TABLE files ADD COLUMN believer_user_id INTEGER REFERENCES users(id);

-- 資料夾表增加類型標識
ALTER TABLE folders ADD COLUMN folder_type ENUM('admin', 'shared', 'believer_root', 'believer_personal') DEFAULT 'admin';

-- 建立信徒上傳根資料夾
INSERT INTO folders (name, parent_id, folder_type, created_by) 
VALUES ('信徒上傳', NULL, 'believer_root', 1);
```

**3. 管理介面顯示邏輯**
```vue
<!-- FilesView.vue 中的特殊處理 -->
<template>
  <div class="files-view">
    <!-- 一般檔案區域 -->
    <div class="regular-files">
      <FileCard 
        v-for="file in regularFiles"
        :key="file.id"
        :file="file"
      />
    </div>
    
    <!-- 信徒上傳區域 - 特殊樣式 -->
    <div v-if="believerFiles.length > 0" class="believer-files-section">
      <div class="section-header">
        <h3 class="section-title">
          <AppFileIcon name="users" class="section-icon" />
          信徒上傳內容
        </h3>
        <span class="file-count">{{ believerFiles.length }} 個檔案</span>
      </div>
      
      <div class="believer-files-grid">
        <BelieverFileCardAdmin
          v-for="file in believerFiles"
          :key="file.id"
          :file="file"
          @view="viewFile"
          @download="downloadFile"
          @manage="manageBelieverFile"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 分離一般檔案和信徒檔案
const regularFiles = computed(() => 
  files.value.filter(file => !file.is_believer_upload)
)

const believerFiles = computed(() => 
  files.value.filter(file => file.is_believer_upload)
)
</script>
```

---

## 🎨 信徒檔案的特殊顯示設計

### 1. BelieverFileCardAdmin 組件

```vue
<!-- components/admin/BelieverFileCardAdmin.vue -->
<template>
  <div class="believer-file-card">
    <!-- 基礎檔案卡片 -->
    <FileCard 
      :file="file"
      :show-believer-badge="true"
      class="base-card"
    />
    
    <!-- 信徒資訊覆蓋層 -->
    <div class="believer-overlay">
      <div class="believer-info">
        <AppFileIcon name="user" size="16" class="user-icon" />
        <span class="user-name">{{ file.uploaderName }}</span>
        <span class="upload-date">{{ formatDate(file.createdAt) }}</span>
      </div>
      
      <!-- 管理員專用操作 -->
      <div class="admin-actions">
        <AppButton
          variant="ghost"
          size="sm"
          @click="$emit('view', file)"
          title="檢視"
        >
          <AppFileIcon name="eye" size="14" />
        </AppButton>
        
        <AppButton
          variant="ghost"
          size="sm"
          @click="$emit('download', file)"
          title="下載"
        >
          <AppFileIcon name="download" size="14" />
        </AppButton>
        
        <AppButton
          variant="ghost"
          size="sm"
          @click="$emit('manage', file)"
          title="管理"
        >
          <AppFileIcon name="settings" size="14" />
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.believer-file-card {
  @apply relative;
}

.believer-overlay {
  @apply absolute inset-0 bg-gradient-to-t from-black/60 to-transparent 
         opacity-0 hover:opacity-100 transition-opacity duration-200
         flex flex-col justify-between p-3;
}

.believer-info {
  @apply flex items-center gap-2 text-white text-sm;
}

.user-icon {
  @apply text-blue-300;
}

.admin-actions {
  @apply flex justify-end gap-1;
}
</style>
```

### 2. 信徒檔案統計面板

```vue
<!-- components/admin/BelieverStatsPanel.vue -->
<template>
  <div class="believer-stats-panel">
    <h3 class="panel-title">信徒上傳統計</h3>
    
    <div class="stats-grid">
      <!-- 總體統計 -->
      <div class="stat-card">
        <div class="stat-number">{{ totalBelieverFiles }}</div>
        <div class="stat-label">總檔案數</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">{{ activeBelieverCount }}</div>
        <div class="stat-label">活躍用戶</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">{{ formatStorageSize(totalBelieverStorage) }}</div>
        <div class="stat-label">使用空間</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-number">{{ thisWeekUploads }}</div>
        <div class="stat-label">本週上傳</div>
      </div>
    </div>
    
    <!-- 用戶排行 -->
    <div class="user-ranking">
      <h4 class="ranking-title">上傳排行</h4>
      <div class="ranking-list">
        <div 
          v-for="(user, index) in topUploaders"
          :key="user.id"
          class="ranking-item"
        >
          <span class="rank-number">{{ index + 1 }}</span>
          <span class="user-name">{{ user.name }}</span>
          <span class="file-count">{{ user.uploadCount }} 個檔案</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

---

## 🔍 信徒檔案的進階管理功能

### 1. 專用管理選單

在管理介面主選單中新增：

```vue
<!-- MainNavigation.vue -->
<template>
  <nav class="main-navigation">
    <!-- 現有選單項目 -->
    <router-link to="/files" class="nav-item">
      📁 檔案管理
    </router-link>
    
    <router-link to="/shared" class="nav-item">
      🔗 共享資源
    </router-link>
    
    <!-- 新增信徒管理區 -->
    <div class="nav-section">
      <div class="section-title">信徒專區</div>
      
      <router-link to="/admin/believer-uploads" class="nav-item sub-item">
        📸 信徒上傳
      </router-link>
      
      <router-link to="/admin/believer-users" class="nav-item sub-item">
        👥 用戶管理
      </router-link>
      
      <router-link to="/admin/believer-stats" class="nav-item sub-item">
        📊 使用統計
      </router-link>
    </div>
  </nav>
</template>
```

### 2. 信徒檔案專用檢視頁面

```vue
<!-- views/admin/BelieverUploadsView.vue -->
<template>
  <div class="believer-uploads-view">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="page-title">信徒上傳管理</h1>
      <p class="page-subtitle">管理所有信徒上傳的照片和檔案</p>
    </div>
    
    <!-- 統計面板 -->
    <BelieverStatsPanel class="mb-6" />
    
    <!-- 篩選和搜尋 -->
    <div class="filters-section">
      <div class="filter-group">
        <label>按用戶篩選：</label>
        <select v-model="selectedUser" class="user-filter">
          <option value="">所有用戶</option>
          <option 
            v-for="user in believerUsers"
            :key="user.id"
            :value="user.id"
          >
            {{ user.name }}
          </option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>檔案類型：</label>
        <select v-model="selectedFileType">
          <option value="">所有類型</option>
          <option value="image">圖片</option>
          <option value="video">影片</option>
          <option value="document">文件</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>上傳時間：</label>
        <select v-model="timeRange">
          <option value="all">所有時間</option>
          <option value="today">今天</option>
          <option value="week">本週</option>
          <option value="month">本月</option>
        </select>
      </div>
    </div>
    
    <!-- 檔案網格 -->
    <div class="files-grid">
      <BelieverFileCardAdmin
        v-for="file in filteredBelieverFiles"
        :key="file.id"
        :file="file"
        @view="viewFile"
        @download="downloadFile"
        @manage="openManageDialog"
      />
    </div>
    
    <!-- 管理對話框 -->
    <BelieverFileManageDialog
      v-model="showManageDialog"
      :file="selectedFile"
      @update="handleFileUpdate"
      @delete="handleFileDelete"
    />
  </div>
</template>
```

### 3. 檔案管理對話框

```vue
<!-- components/admin/BelieverFileManageDialog.vue -->
<template>
  <AppDialog v-model="isOpen" title="信徒檔案管理">
    <div class="file-manage-content">
      <!-- 檔案資訊 -->
      <div class="file-info-section">
        <h3>檔案資訊</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>檔案名稱：</label>
            <span>{{ file?.name }}</span>
          </div>
          <div class="info-item">
            <label>上傳者：</label>
            <span>{{ file?.uploaderName }}</span>
          </div>
          <div class="info-item">
            <label>檔案大小：</label>
            <span>{{ formatFileSize(file?.size) }}</span>
          </div>
          <div class="info-item">
            <label>上傳時間：</label>
            <span>{{ formatDate(file?.createdAt) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 管理操作 -->
      <div class="manage-actions-section">
        <h3>管理操作</h3>
        
        <div class="action-group">
          <h4>可見性控制</h4>
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="fileSettings.isPublicVisible"
            />
            在公共區域顯示此檔案
          </label>
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="fileSettings.allowDownload"
            />
            允許其他用戶下載
          </label>
        </div>
        
        <div class="action-group">
          <h4>內容管理</h4>
          <AppButton
            variant="secondary"
            @click="moveToPublicFolder"
          >
            移至公共資料夾
          </AppButton>
          
          <AppButton
            variant="warning"
            @click="reportInappropriate"
          >
            標記為不當內容
          </AppButton>
          
          <AppButton
            variant="danger"
            @click="confirmDelete"
          >
            刪除檔案
          </AppButton>
        </div>
      </div>
    </div>
    
    <template #footer>
      <AppButton variant="secondary" @click="isOpen = false">
        取消
      </AppButton>
      <AppButton variant="primary" @click="saveSettings">
        儲存設定
      </AppButton>
    </template>
  </AppDialog>
</template>
```

---

## 📊 信徒上傳內容的分析功能

### 1. 統計報表頁面

```vue
<!-- views/admin/BelieverStatsView.vue -->
<template>
  <div class="believer-stats-view">
    <div class="page-header">
      <h1>信徒使用統計</h1>
    </div>
    
    <!-- 時間範圍選擇 -->
    <div class="time-range-selector">
      <AppButton
        v-for="range in timeRanges"
        :key="range.value"
        :variant="selectedRange === range.value ? 'primary' : 'secondary'"
        @click="selectedRange = range.value"
      >
        {{ range.label }}
      </AppButton>
    </div>
    
    <!-- 統計卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <h3>總上傳量</h3>
        <div class="stat-value">{{ totalUploads }}</div>
        <div class="stat-trend">
          ↑ {{ uploadGrowth }}% 比上期
        </div>
      </div>
      
      <div class="stat-card">
        <h3>活躍用戶</h3>
        <div class="stat-value">{{ activeUsers }}</div>
        <div class="stat-trend">
          ↑ {{ userGrowth }}% 比上期
        </div>
      </div>
      
      <div class="stat-card">
        <h3>存儲使用量</h3>
        <div class="stat-value">{{ storageUsage }}</div>
        <div class="stat-trend">
          {{ storageGrowth > 0 ? '↑' : '↓' }} {{ Math.abs(storageGrowth) }}% 比上期
        </div>
      </div>
    </div>
    
    <!-- 圖表區域 -->
    <div class="charts-section">
      <div class="chart-container">
        <h3>上傳趨勢</h3>
        <UploadTrendChart :data="uploadTrendData" />
      </div>
      
      <div class="chart-container">
        <h3>用戶活躍度</h3>
        <UserActivityChart :data="userActivityData" />
      </div>
    </div>
    
    <!-- 詳細數據表 -->
    <div class="data-table-section">
      <h3>用戶詳細數據</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>用戶名稱</th>
            <th>上傳檔案數</th>
            <th>使用存儲空間</th>
            <th>最後活動時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in userStats" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.fileCount }}</td>
            <td>{{ formatFileSize(user.storageUsed) }}</td>
            <td>{{ formatDate(user.lastActivity) }}</td>
            <td>
              <AppButton 
                size="sm" 
                variant="ghost"
                @click="viewUserFiles(user)"
              >
                檢視檔案
              </AppButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
```

---

## 🔐 權限控制設計

### 1. 管理員權限等級

```typescript
// 信徒檔案的權限控制
enum BelieverFilePermission {
  VIEW_ALL = 'view_all',           // 檢視所有信徒檔案
  DOWNLOAD_ALL = 'download_all',   // 下載所有信徒檔案  
  MANAGE_FILES = 'manage_files',   // 管理檔案（移動、刪除）
  VIEW_STATS = 'view_stats',       // 檢視統計數據
  MODERATE_CONTENT = 'moderate_content' // 內容審核
}

// 角色權限映射
const rolePermissions = {
  'admin': [
    BelieverFilePermission.VIEW_ALL,
    BelieverFilePermission.DOWNLOAD_ALL, 
    BelieverFilePermission.MANAGE_FILES,
    BelieverFilePermission.VIEW_STATS,
    BelieverFilePermission.MODERATE_CONTENT
  ],
  'staff': [
    BelieverFilePermission.VIEW_ALL,
    BelieverFilePermission.DOWNLOAD_ALL,
    BelieverFilePermission.VIEW_STATS
  ]
}
```

### 2. API 端點權限檢查

```go
// 後端 API 權限中間件
func BelieverFilePermissionMiddleware(permission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        user := getCurrentUser(c)
        
        // 檢查用戶是否有相應權限
        if !hasBelieverFilePermission(user, permission) {
            c.JSON(403, gin.H{"error": "沒有權限訪問信徒檔案"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}

// 路由定義
router.GET("/api/admin/believer-files", 
    BelieverFilePermissionMiddleware("view_all"),
    handleGetBelieverFiles)
    
router.DELETE("/api/admin/believer-files/:id", 
    BelieverFilePermissionMiddleware("manage_files"),
    handleDeleteBelieverFile)
```

---

## 🎯 實施建議

### 階段一：基礎架構（第1週）
1. ✅ 建立「信徒上傳」根資料夾
2. ✅ 調整資料庫結構，增加信徒標識欄位
3. ✅ 修改 FilesView 支援信徒檔案區分顯示
4. ✅ 實現基礎的檔案可見性控制

### 階段二：管理功能（第2週）
1. ✅ 創建 BelieverFileCardAdmin 組件
2. ✅ 實現信徒檔案專用管理頁面
3. ✅ 添加檔案篩選和搜尋功能
4. ✅ 建立檔案管理對話框

### 階段三：統計分析（第3週）
1. ✅ 實現統計面板和數據收集
2. ✅ 創建統計報表頁面
3. ✅ 添加圖表和趨勢分析
4. ✅ 完善用戶活動追蹤

### 階段四：權限和安全（第4週）
1. ✅ 實施細粒度權限控制
2. ✅ 添加內容審核功能
3. ✅ 完善操作日誌記錄
4. ✅ 測試和安全驗證

---

## 📋 總結

**建議採用方案A：獨立頂層資料夾**，原因：

1. **清晰分離**：信徒內容與管理內容明確區分
2. **易於管理**：管理員可統一檢視和管理信徒檔案
3. **權限控制**：可以設定不同的訪問權限
4. **統計分析**：便於收集和分析使用數據
5. **用戶體驗**：信徒在自己的空間內操作，管理員在專用區域管理

這樣的設計既保證了信徒的隱私和獨立性，又給管理員提供了必要的管理工具和統計資訊。

---

*這個方案確保管理員能夠有效監督和管理信徒上傳的內容，同時維護清晰的檔案組織結構。*