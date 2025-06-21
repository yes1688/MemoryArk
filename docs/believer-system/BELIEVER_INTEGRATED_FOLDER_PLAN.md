# 信徒專區統一檔案管理方案

## 🎯 方案概述

在現有檔案管理介面中新增一個特殊的「信徒專區」資料夾，作為所有信徒上傳內容的統一入口，實現無縫的檔案管理體驗。

---

## 🗂️ 資料夾設計

### 1. 信徒專區資料夾特性

```typescript
interface BelieverRootFolder {
  id: number
  name: '信徒專區'
  type: 'SYSTEM_BELIEVER_ROOT'  // 特殊類型
  isDeletable: false            // 永不能刪除
  isRenamable: false           // 不能重命名
  isMovable: false             // 不能移動
  icon: 'users'                // 特殊圖標
  description: '信徒上傳的照片和檔案'
  permissions: {
    admin: ['view', 'copy', 'move', 'download', 'manage'],
    staff: ['view', 'copy', 'download'],
    believer: ['view_own_only']
  }
}
```

### 2. 資料庫結構調整

```sql
-- 建立系統資料夾標識
ALTER TABLE folders ADD COLUMN folder_type ENUM(
  'normal',               -- 一般資料夾
  'system_believer_root', -- 信徒專區根目錄
  'believer_personal'     -- 信徒個人資料夾
) DEFAULT 'normal';

ALTER TABLE folders ADD COLUMN is_system_folder BOOLEAN DEFAULT FALSE;
ALTER TABLE folders ADD COLUMN delete_protection BOOLEAN DEFAULT FALSE;

-- 建立信徒專區根資料夾
INSERT INTO folders (
  name, 
  parent_id, 
  folder_type, 
  is_system_folder, 
  delete_protection,
  created_by,
  description
) VALUES (
  '信徒專區',
  NULL,
  'system_believer_root',
  TRUE,
  TRUE,
  1,
  '信徒上傳的照片和檔案'
);

-- 取得信徒專區 ID（假設為 999）
SET @believer_root_id = LAST_INSERT_ID();
```

---

## 🎨 FileCard 組件增強

### 1. 特殊資料夾顯示

```vue
<!-- components/ui/file-card/FileCard.vue 增強 -->
<template>
  <div :class="fileCardClasses">
    <!-- 檔案圖標區域 -->
    <div class="file-icon-container">
      <!-- 系統資料夾特殊圖標 -->
      <div v-if="file.folder_type === 'system_believer_root'" class="system-folder-icon">
        <AppFileIcon name="users" :size="iconSize" class="system-icon" />
        <div class="system-badge">系統</div>
      </div>
      
      <!-- 信徒個人資料夾圖標 -->
      <div v-else-if="file.folder_type === 'believer_personal'" class="believer-folder-icon">
        <AppFileIcon name="user-folder" :size="iconSize" class="believer-icon" />
        <div class="believer-badge">{{ file.uploaderName }}</div>
      </div>
      
      <!-- 一般檔案圖標 -->
      <AppFileIcon v-else :name="getFileIcon(file)" :size="iconSize" />
    </div>
    
    <!-- 檔案名稱 -->
    <div class="file-name">
      {{ file.name }}
      <!-- 系統資料夾標記 -->
      <span v-if="file.is_system_folder" class="system-marker">🔒</span>
    </div>
    
    <!-- 快速操作按鈕 -->
    <div class="quick-actions" v-if="showQuickActions">
      <!-- 系統資料夾：限制操作 -->
      <template v-if="file.folder_type === 'system_believer_root'">
        <AppButton size="sm" variant="ghost" @click.stop="openFolder" title="開啟">
          <AppFileIcon name="folder-open" size="16" />
        </AppButton>
        <!-- 不顯示刪除、重命名、移動按鈕 -->
      </template>
      
      <!-- 一般檔案：完整操作 -->
      <template v-else>
        <AppButton size="sm" variant="ghost" @click.stop="$emit('copy', file)" title="複製">
          <AppFileIcon name="copy" size="16" />
        </AppButton>
        <AppButton size="sm" variant="ghost" @click.stop="$emit('move', file)" title="移動">
          <AppFileIcon name="move" size="16" />
        </AppButton>
        <AppButton size="sm" variant="ghost" @click.stop="$emit('download', file)" title="下載">
          <AppFileIcon name="download" size="16" />
        </AppButton>
        <!-- 系統保護檔案不顯示刪除按鈕 -->
        <AppButton 
          v-if="!file.delete_protection"
          size="sm" 
          variant="ghost" 
          @click.stop="$emit('delete', file)" 
          title="刪除"
        >
          <AppFileIcon name="delete" size="16" />
        </AppButton>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const fileCardClasses = computed(() => [
  'file-card',
  {
    'system-folder': file.is_system_folder,
    'believer-folder': file.folder_type === 'believer_personal',
    'protected': file.delete_protection
  }
])
</script>

<style scoped>
.system-folder {
  @apply border-2 border-blue-200 bg-blue-50;
}

.system-folder-icon {
  @apply relative;
}

.system-icon {
  @apply text-blue-600;
}

.system-badge {
  @apply absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded;
}

.believer-folder {
  @apply border border-green-200 bg-green-50;
}

.believer-icon {
  @apply text-green-600;
}

.believer-badge {
  @apply absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1 rounded;
}

.system-marker {
  @apply ml-1 text-yellow-500;
}

.protected .quick-actions {
  /* 受保護檔案的操作按鈕樣式調整 */
}
</style>
```

---

## 🔧 FilesView 增強功能

### 1. 右鍵選單增強

```vue
<!-- views/FilesView.vue 中的右鍵選單 -->
<template>
  <div class="files-view">
    <!-- 現有內容 -->
    
    <!-- 右鍵選單 -->
    <ContextMenu 
      v-model="showContextMenu"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
    />
  </div>
</template>

<script setup lang="ts">
// 右鍵選單項目
const contextMenuItems = computed(() => {
  if (!selectedFile.value) return []
  
  const items = []
  
  // 基本操作
  items.push(
    { label: '開啟', icon: 'folder-open', action: () => openFile(selectedFile.value) },
    { label: '預覽', icon: 'eye', action: () => previewFile(selectedFile.value) },
    { type: 'divider' }
  )
  
  // 檔案操作 (非系統資料夾)
  if (!selectedFile.value.is_system_folder) {
    items.push(
      { label: '複製', icon: 'copy', action: () => copyFile(selectedFile.value) },
      { label: '移動', icon: 'move', action: () => moveFile(selectedFile.value) },
      { label: '重命名', icon: 'edit', action: () => renameFile(selectedFile.value) },
      { type: 'divider' }
    )
  }
  
  // 信徒專區特殊操作
  if (selectedFile.value.folder_type === 'system_believer_root') {
    items.push(
      { label: '管理信徒', icon: 'users', action: () => manageBelievers() },
      { label: '統計資料', icon: 'chart', action: () => viewBelieverStats() },
      { type: 'divider' }
    )
  }
  
  // 刪除操作 (受保護檔案除外)
  if (!selectedFile.value.delete_protection) {
    items.push(
      { label: '刪除', icon: 'delete', action: () => deleteFile(selectedFile.value), danger: true }
    )
  }
  
  return items
})

// 管理信徒功能
const manageBelievers = () => {
  router.push('/admin/believer-users')
}

// 檢視統計
const viewBelieverStats = () => {
  router.push('/admin/believer-stats')
}
</script>
```

### 2. 拖拽操作增強

```typescript
// 拖拽邏輯增強
const handleFileDrop = async (draggedFile: FileInfo, targetFolder: FileInfo) => {
  // 檢查目標是否為系統資料夾
  if (targetFolder.folder_type === 'system_believer_root') {
    // 只允許從信徒專區內部移動，或複製其他檔案進入
    if (draggedFile.folder_type === 'believer_personal' || 
        confirm('是否要複製此檔案到信徒專區？')) {
      await copyFileToBelieverFolder(draggedFile, targetFolder)
    }
    return
  }
  
  // 檢查來源是否為受保護檔案
  if (draggedFile.delete_protection) {
    // 只允許複製，不允許移動
    await copyFile(draggedFile, targetFolder)
    return
  }
  
  // 正常拖拽邏輯
  await moveFile(draggedFile, targetFolder)
}

// 複製檔案到信徒專區
const copyFileToBelieverFolder = async (file: FileInfo, targetFolder: FileInfo) => {
  try {
    await fileApi.copyFile(file.id, {
      targetFolderId: targetFolder.id,
      preserveOriginal: true
    })
    
    // 重新載入檔案列表
    await filesStore.fetchFiles()
    
    showNotification('檔案已複製到信徒專區', 'success')
  } catch (error) {
    showNotification('複製失敗：' + error.message, 'error')
  }
}
```

---

## 🎯 信徒個人資料夾管理

### 1. 自動建立信徒資料夾

```typescript
// services/believerFolderService.ts
export class BelieverFolderService {
  private static BELIEVER_ROOT_FOLDER_ID = 999 // 信徒專區根資料夾ID
  
  // 為新信徒建立個人資料夾
  static async createBelieverPersonalFolder(user: BelieverUser): Promise<FolderInfo> {
    const folderName = `${user.name}`
    
    try {
      const response = await folderApi.create({
        name: folderName,
        parent_id: this.BELIEVER_ROOT_FOLDER_ID,
        folder_type: 'believer_personal',
        owner_id: user.id,
        description: `${user.name} 的個人照片空間`
      })
      
      return response.data
    } catch (error) {
      console.error('建立信徒資料夾失敗:', error)
      throw error
    }
  }
  
  // 檢查信徒資料夾是否存在
  static async ensureBelieverFolderExists(user: BelieverUser): Promise<FolderInfo> {
    try {
      // 先檢查是否已存在
      const existing = await this.findBelieverFolder(user.id)
      if (existing) {
        return existing
      }
      
      // 不存在則建立
      return await this.createBelieverPersonalFolder(user)
    } catch (error) {
      console.error('確保信徒資料夾存在失敗:', error)
      throw error
    }
  }
  
  // 尋找信徒的個人資料夾
  static async findBelieverFolder(userId: number): Promise<FolderInfo | null> {
    try {
      const response = await folderApi.list({
        parent_id: this.BELIEVER_ROOT_FOLDER_ID,
        owner_id: userId
      })
      
      return response.data.folders.find(folder => 
        folder.folder_type === 'believer_personal' && 
        folder.owner_id === userId
      ) || null
    } catch (error) {
      console.error('尋找信徒資料夾失敗:', error)
      return null
    }
  }
}
```

### 2. 信徒上傳自動分類

```typescript
// 修改上傳服務，自動將信徒上傳的檔案歸類到個人資料夾
export class BelieverUploadService {
  static async uploadPhotos(files: File[], user: BelieverUser) {
    try {
      // 確保信徒個人資料夾存在
      const personalFolder = await BelieverFolderService.ensureBelieverFolderExists(user)
      
      // 上傳到個人資料夾
      const uploadPromises = files.map(file => 
        fileApi.upload(file, {
          parent_id: personalFolder.id,
          uploaded_by: user.id,
          is_believer_upload: true,
          folder_type: 'believer_personal'
        })
      )
      
      const results = await Promise.all(uploadPromises)
      return results
    } catch (error) {
      console.error('信徒上傳失敗:', error)
      throw error
    }
  }
}
```

---

## 🛡️ 安全性和權限控制

### 1. 資料夾操作限制

```typescript
// utils/folderPermissions.ts
export class FolderPermissions {
  // 檢查是否可以刪除資料夾
  static canDelete(folder: FolderInfo, user: User): boolean {
    // 系統資料夾永不能刪除
    if (folder.is_system_folder || folder.delete_protection) {
      return false
    }
    
    // 管理員可以刪除一般資料夾
    if (user.role === 'admin') {
      return true
    }
    
    // 信徒只能刪除自己的檔案（在自己的資料夾內）
    if (user.role === 'believer') {
      return folder.owner_id === user.id && folder.folder_type === 'believer_personal'
    }
    
    return false
  }
  
  // 檢查是否可以重命名
  static canRename(folder: FolderInfo, user: User): boolean {
    if (folder.is_system_folder) {
      return false
    }
    
    return user.role === 'admin' || folder.owner_id === user.id
  }
  
  // 檢查是否可以移動
  static canMove(folder: FolderInfo, user: User): boolean {
    if (folder.is_system_folder || folder.folder_type === 'system_believer_root') {
      return false
    }
    
    return user.role === 'admin'
  }
}
```

### 2. API 端點保護

```go
// 後端 API 保護
func HandleDeleteFolder(c *gin.Context) {
    folderID := c.Param("id")
    user := getCurrentUser(c)
    
    // 取得資料夾資訊
    folder, err := getFolderByID(folderID)
    if err != nil {
        c.JSON(404, gin.H{"error": "資料夾不存在"})
        return
    }
    
    // 檢查是否為系統資料夾
    if folder.IsSystemFolder || folder.DeleteProtection {
        c.JSON(403, gin.H{"error": "系統資料夾不能刪除"})
        return
    }
    
    // 檢查權限
    if !canDeleteFolder(folder, user) {
        c.JSON(403, gin.H{"error": "沒有權限刪除此資料夾"})
        return
    }
    
    // 執行刪除
    err = deleteFolder(folder)
    if err != nil {
        c.JSON(500, gin.H{"error": "刪除失敗"})
        return
    }
    
    c.JSON(200, gin.H{"message": "刪除成功"})
}
```

---

## 🎨 用戶介面增強

### 1. 系統資料夾視覺標識

```scss
// 信徒專區資料夾特殊樣式
.file-card.system-folder {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 2px solid #3b82f6;
  position: relative;
  
  &::before {
    content: '🔒';
    position: absolute;
    top: -8px;
    right: -8px;
    background: #f59e0b;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
  }
  
  .file-name {
    font-weight: 600;
    color: #1e40af;
  }
}

.file-card.believer-folder {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 1px solid #10b981;
  
  .file-name {
    color: #065f46;
  }
}
```

### 2. 操作提示和確認

```vue
<!-- 刪除確認對話框增強 -->
<template>
  <AppDialog v-model="showDeleteConfirm" title="確認刪除">
    <div class="delete-confirm-content">
      <div v-if="fileToDelete?.is_system_folder" class="system-folder-warning">
        <AppFileIcon name="warning" size="48" class="warning-icon" />
        <h3>無法刪除系統資料夾</h3>
        <p>「{{ fileToDelete.name }}」是系統特殊資料夾，為了系統穩定性，此資料夾無法刪除。</p>
      </div>
      
      <div v-else-if="fileToDelete?.folder_type === 'believer_personal'" class="believer-folder-warning">
        <AppFileIcon name="user" size="48" class="user-icon" />
        <h3>刪除信徒資料夾</h3>
        <p>確定要刪除「{{ fileToDelete.name }}」的個人資料夾嗎？</p>
        <p class="warning-text">此操作將刪除該信徒的所有上傳檔案，且無法恢復！</p>
      </div>
      
      <div v-else class="normal-delete">
        <AppFileIcon name="delete" size="48" class="delete-icon" />
        <h3>確認刪除</h3>
        <p>確定要刪除「{{ fileToDelete?.name }}」嗎？</p>
      </div>
    </div>
    
    <template #footer>
      <AppButton variant="secondary" @click="showDeleteConfirm = false">
        取消
      </AppButton>
      <AppButton 
        v-if="!fileToDelete?.is_system_folder"
        variant="danger" 
        @click="confirmDelete"
      >
        確認刪除
      </AppButton>
    </template>
  </AppDialog>
</template>
```

---

## 📊 統計和監控

### 1. 信徒專區使用統計

```vue
<!-- 信徒專區統計面板 -->
<template>
  <div class="believer-stats-widget">
    <h3 class="widget-title">信徒專區統計</h3>
    
    <div class="stats-summary">
      <div class="stat-item">
        <span class="stat-label">活躍信徒</span>
        <span class="stat-value">{{ activeBelievers }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">總檔案數</span>
        <span class="stat-value">{{ totalFiles }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">使用空間</span>
        <span class="stat-value">{{ formatFileSize(totalStorage) }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">本週上傳</span>
        <span class="stat-value">{{ weeklyUploads }}</span>
      </div>
    </div>
    
    <div class="quick-actions">
      <AppButton size="sm" @click="viewDetailedStats">
        詳細統計
      </AppButton>
      <AppButton size="sm" @click="manageBelieverUsers">
        管理用戶
      </AppButton>
    </div>
  </div>
</template>
```

---

## 🚀 實施步驟

### 階段一：基礎架構 (第1週)
1. ✅ 資料庫結構調整，新增系統資料夾支援
2. ✅ 建立「信徒專區」根資料夾
3. ✅ 修改 FileCard 組件支援系統資料夾顯示
4. ✅ 實現基礎的刪除保護機制

### 階段二：操作增強 (第2週)  
1. ✅ 增強右鍵選單和操作限制
2. ✅ 實現拖拽操作的特殊處理
3. ✅ 添加複製/移動到信徒專區的功能
4. ✅ 完善權限檢查和安全控制

### 階段三：自動化管理 (第3週)
1. ✅ 實現信徒個人資料夾自動建立
2. ✅ 整合信徒上傳自動分類功能
3. ✅ 添加統計和監控功能
4. ✅ 完善錯誤處理和用戶提示

### 階段四：UI 優化 (第4週)
1. ✅ 完善視覺設計和特殊標識
2. ✅ 添加操作提示和確認對話框
3. ✅ 實現統計面板和快速操作
4. ✅ 測試和用戶體驗優化

---

## 💡 優勢總結

1. **統一介面**：所有檔案操作都在同一個介面，操作邏輯一致
2. **靈活管理**：可以輕鬆複製、移動信徒檔案到其他資料夾
3. **安全保護**：系統資料夾有刪除保護，避免誤操作
4. **權限分明**：不同角色有不同的操作權限
5. **易於擴展**：未來可以輕鬆添加更多系統資料夾類型

這個方案完美結合了統一管理和特殊保護的需求！

---

*此方案確保信徒專區整合在現有檔案管理系統中，同時提供必要的保護和特殊功能。*