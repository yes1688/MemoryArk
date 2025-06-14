# 檔案管理系統架構設計指南

## 目錄

1. [檔案管理系統概述](#檔案管理系統概述)
2. [常見架構模式比較](#常見架構模式比較)
3. [MemoryArk 2.0 現況分析](#memoryark-20-現況分析)
4. [最佳實踐建議](#最佳實踐建議)
5. [重複檔案處理策略](#重複檔案處理策略)
6. [實作建議](#實作建議)
7. [未來擴展考量](#未來擴展考量)

## 檔案管理系統概述

現代檔案管理系統通常需要解決以下核心問題：
- **唯一識別**：如何確保每個檔案有唯一且安全的識別碼
- **儲存策略**：檔案實體存放位置與方式
- **虛擬結構**：如何呈現使用者友善的資料夾結構
- **元資料管理**：如何儲存和查詢檔案相關資訊
- **安全性**：如何防止未授權存取和檔案洩露
- **擴展性**：如何支援大量檔案和未來成長

## 常見架構模式比較

### 1. UUID 為基礎的系統

**優點：**
- 全域唯一性保證
- 防止檔案名稱衝突
- 增強安全性（難以猜測）
- 支援分散式系統

**缺點：**
- 人類不可讀
- 備份還原較複雜
- 需要資料庫對應原始檔名

**實作方式：**

```text
/storage/
  ├── a7b9c2d4-e5f6-7890-abcd-ef1234567890.jpg
  ├── b8c0d3e5-f6g7-8901-bcde-fg2345678901.pdf
  └── c9d1e4f6-g7h8-9012-cdef-gh3456789012.docx
```

### 2. 階層式目錄結構

**優點：**
- 直觀易懂
- 符合使用者習慣
- 易於手動管理

**缺點：**
- 可能有路徑長度限制
- 移動檔案需更新路徑
- 並發寫入可能衝突

**實作方式：**
```
/storage/
  ├── 2024/
  │   ├── 01-January/
  │   │   ├── meeting-notes.docx
  │   │   └── photos/
  │   └── 02-February/
  └── 2025/
```

### 3. 混合式架構（推薦）

結合 UUID 安全性與虛擬資料夾的使用便利性：

**資料庫結構：**
```sql
Files Table:
- id (自增主鍵)
- uuid (檔案實體名稱)
- original_name (原始檔名)
- virtual_path (虛擬路徑)
- parent_id (資料夾層級)
- file_size
- mime_type
- created_at
- updated_at
```

**實體儲存：**
```
/storage/
  ├── files/
  │   ├── a7b9c2d4-e5f6-7890-abcd-ef1234567890.jpg
  │   └── b8c0d3e5-f6g7-8901-bcde-fg2345678901.pdf
  └── temp/
```

## MemoryArk 2.0 現況分析

### 優勢
1. **安全性高**：使用 UUID 命名防止檔案列舉攻擊
2. **靈活性佳**：虛擬資料夾支援任意重組
3. **完整性好**：保留原始檔名和元資料
4. **可擴展**：易於遷移至雲端儲存

### 潛在改進空間
1. **檔案去重**：可加入 hash 檢查避免重複儲存
2. **版本控制**：可加入檔案版本管理
3. **縮圖生成**：可預先生成圖片縮圖
4. **分散儲存**：可依日期或類型分散到不同目錄

## 最佳實踐建議

### 1. 檔案識別策略

**建議採用三層識別：**
```go
type File struct {
    ID         uint   // 資料庫主鍵（API 使用）
    UUID       string // 實體檔案名稱（儲存使用）
    Hash       string // 檔案內容 hash（去重使用）
}
```

### 2. 儲存結構優化

**建議的目錄結構：**
```
/uploads/
  ├── files/           # 主要儲存區
  │   ├── 2025/       # 按年份分類（可選）
  │   │   ├── 01/     # 按月份分類（可選）
  │   │   └── 02/
  ├── thumbnails/      # 縮圖快取
  ├── temp/           # 暫存區
  └── archive/        # 歸檔區
```

### 3. 虛擬資料夾實作

**資料庫設計：**
```sql
-- 檔案表
CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE,
    original_name VARCHAR(255),
    file_hash VARCHAR(64),
    file_size BIGINT,
    mime_type VARCHAR(100),
    parent_id INTEGER REFERENCES files(id),
    is_directory BOOLEAN DEFAULT FALSE,
    virtual_path TEXT, -- 完整虛擬路徑快取
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 路徑索引優化查詢
CREATE INDEX idx_virtual_path ON files(virtual_path);
CREATE INDEX idx_parent_id ON files(parent_id);
```

### 4. 檔案操作最佳化

**上傳流程：**

```go
func UploadFile(file multipart.File) error {
    // 1. 計算檔案 hash
    hash := calculateHash(file)
    
    // 2. 檢查是否已存在（去重）
    if existing := findByHash(hash); existing != nil {
        return createVirtualCopy(existing)
    }
    
    // 3. 生成 UUID
    uuid := generateUUID()
    
    // 4. 儲存實體檔案
    savePath := filepath.Join(getYearMonth(), uuid+ext)
    
    // 5. 建立資料庫記錄
    createFileRecord(uuid, hash, metadata)
    
    // 6. 非同步處理（縮圖、掃毒等）
    go processFileAsync(uuid)
}
```

## 重複檔案處理策略

### 問題場景：重複照片在不同資料夾

當使用者上傳照片時，可能出現同一張照片被放在不同資料夾的情況：

- 同一活動的照片被不同人上傳
- 整理照片時複製到多個分類資料夾
- 從不同來源收集的相同照片

### 真實路徑 vs 虛擬路徑的選擇

#### 方案一：純虛擬路徑（資料庫管理）

**架構：**
```
實體儲存：/uploads/files/{uuid}.jpg
虛擬路徑：透過資料庫 parent_id 關係建立
```

**優點：**
- 檔案移動快速（只需更新資料庫）
- 支援同一檔案在多處顯示
- 易於實現權限控制

**缺點：**
- 依賴資料庫完整性
- 手動管理檔案困難
- 災難恢復較複雜

#### 方案二：真實路徑（檔案系統）

**架構：**
```
實體儲存與顯示路徑相同：
/uploads/files/2025/安息日聚會/01月/照片001.jpg
/uploads/files/2025/青年團契/01月/照片001.jpg (實體複製)
```

**優點：**
- 直觀的檔案組織
- 可直接存取檔案系統
- 備份還原簡單

**缺點：**
- 重複檔案佔用空間
- 移動檔案需要實體操作
- 大量檔案時效能問題

#### 方案三：混合方案 - 符號連結（Symbolic Links）

**架構：**
```bash
# 實體檔案
/uploads/storage/a7b9c2d4-e5f6-7890.jpg

# 符號連結
/uploads/files/2025/安息日聚會/01月/照片001.jpg -> ../../../storage/a7b9c2d4-e5f6-7890.jpg
/uploads/files/2025/青年團契/01月/照片001.jpg -> ../../../storage/a7b9c2d4-e5f6-7890.jpg
```

**實作範例：**
```go
func CreateFileWithSymlink(file multipart.File, targetPath string) error {
    // 1. 計算檔案 hash
    hash := calculateHash(file)
    
    // 2. 檢查儲存區是否已存在
    storagePath := filepath.Join("/uploads/storage", hash[:2], hash+ext)
    
    if !fileExists(storagePath) {
        // 3. 儲存實體檔案
        saveFile(file, storagePath)
    }
    
    // 4. 建立目標目錄
    targetDir := filepath.Dir(targetPath)
    os.MkdirAll(targetDir, 0755)
    
    // 5. 建立符號連結
    relativePath := calculateRelativePath(targetPath, storagePath)
    err := os.Symlink(relativePath, targetPath)
    
    // 6. 更新資料庫記錄
    db.Create(&FileRecord{
        Hash:         hash,
        StoragePath:  storagePath,
        DisplayPath:  targetPath,
        IsSymlink:    true,
    })
    
    return err
}
```

**優點：**
- 結合兩種方案優點
- 節省空間同時保持真實路徑
- 支援檔案系統直接瀏覽

**缺點：**
- Windows 支援有限（需要特殊權限）
- 備份需要特殊處理
- 符號連結可能斷開

#### 方案四：硬連結（Hard Links）- 限同一檔案系統

```go
func CreateHardLink(sourcePath, targetPath string) error {
    // 硬連結 - 多個目錄項目指向同一個 inode
    return os.Link(sourcePath, targetPath)
}
```

**特點：**
- 所有連結地位相等（沒有主從關係）
- 刪除一個不影響其他
- 必須在同一檔案系統
- 不支援目錄

### 建議方案：智能混合模式

根據 MemoryArk 2.0 的需求，建議採用以下智能策略：

```go
type StorageStrategy struct {
    UseVirtualPaths   bool // 主要使用虛擬路徑
    UseSymlinks       bool // 選擇性使用符號連結
    UseRealCopies     bool // 重要檔案的實體備份
}

// 根據檔案類型和重要性決定儲存策略
func DetermineStorageStrategy(file *File) StorageStrategy {
    strategy := StorageStrategy{
        UseVirtualPaths: true, // 預設使用虛擬路徑
    }
    
    // 重要檔案建立實體備份
    if file.IsImportant || file.CategoryID == PERMANENT_ARCHIVE {
        strategy.UseRealCopies = true
    }
    
    // 需要檔案系統直接存取的情況
    if file.RequiresDirectAccess {
        strategy.UseSymlinks = runtime.GOOS != "windows"
        if runtime.GOOS == "windows" {
            strategy.UseRealCopies = true // Windows 改用實體複製
        }
    }
    
    return strategy
}
```

#### 實作建議：

1. **主系統使用虛擬路徑**
   - 透過 Web 介面存取的檔案使用虛擬路徑
   - 資料庫管理所有檔案關係
   - 支援快速移動和重組

2. **選擇性真實路徑**
   ```go
   // 為特定需求建立真實路徑結構
   func CreateRealPathStructure(virtualPath string) error {
       // 僅為需要的檔案建立
       if needsRealPath(virtualPath) {
           // 建立符號連結或複製
           if canUseSymlink() {
               createSymlink(storagePath, realPath)
           } else {
               copyFile(storagePath, realPath) // Windows 或其他限制
           }
       }
   }
   ```

3. **混合式存取 API**
   ```go
   // 統一的檔案存取介面
   type FileAccessor interface {
       GetByVirtualPath(path string) (*File, error)
       GetByRealPath(path string) (*File, error)
       GetByID(id uint) (*File, error)
       GetByHash(hash string) (*File, error)
   }
   ```

4. **智能去重與空間優化**
   ```go
   type DuplicateHandler struct {
       // 檢測重複
       func (d *DuplicateHandler) HandleUpload(file *UploadedFile) {
           hash := calculateHash(file)
           
           if existing := findByHash(hash); existing != nil {
               // 建立虛擬連結
               createVirtualLink(existing, targetFolder)
               
               // 必要時建立實體連結
               if requiresPhysicalPresence(targetFolder) {
                   createPhysicalLink(existing, targetFolder)
               }
           }
       }
   }
   ```

### 最佳實踐總結

1. **預設使用虛擬路徑**
   - 90% 的使用情境透過 Web 介面
   - 虛擬路徑提供最大彈性

2. **按需建立真實路徑**
   - FTP/SFTP 存取需求
   - 外部程式整合
   - 備份工具存取

3. **重要檔案多重保護**
   - 虛擬路徑（主要存取）
   - 符號連結（檔案系統瀏覽）
   - 實體備份（災難恢復）

4. **平台相容性考量**
   ```go
   func GetOptimalStrategy() Strategy {
       switch runtime.GOOS {
       case "linux", "darwin":
           return SymlinkStrategy{} // Unix 系統使用符號連結
       case "windows":
           if hasSymlinkPermission() {
               return SymlinkStrategy{}
           }
           return CopyStrategy{} // Windows 無權限時用複製
       default:
           return VirtualOnlyStrategy{} // 其他系統僅用虛擬路徑
       }
   }
   ```

### 結論

對於 MemoryArk 2.0：
- **主要採用虛擬路徑**（已實作）
- **選擇性使用符號連結**（未來擴展）
- **重要檔案實體備份**（安全考量）

這樣可以兼顧：
- 空間效率（去重）
- 存取彈性（虛擬路徑）
- 相容性（跨平台）
- 安全性（多重備份）

#### 1. 檔案指紋識別

使用 SHA-256 hash 作為檔案指紋：

```go
type FileRecord struct {
    ID           uint      // 資料庫記錄 ID
    FileHash     string    // SHA-256 hash（檔案指紋）
    StorageUUID  string    // 實體檔案 UUID（多個記錄可共用）
    OriginalName string    // 原始檔名
    ParentID     *uint     // 所在資料夾
    UploadedBy   uint      // 上傳者
    CreatedAt    time.Time
}
```

#### 2. 去重儲存架構

```sql
-- 實體檔案表（一個 hash 對應一個實體檔案）
CREATE TABLE storage_files (
    id INTEGER PRIMARY KEY,
    file_hash VARCHAR(64) UNIQUE,
    storage_uuid VARCHAR(36) UNIQUE,
    file_size BIGINT,
    mime_type VARCHAR(100),
    reference_count INTEGER DEFAULT 1,
    created_at TIMESTAMP
);

-- 虛擬檔案表（使用者看到的檔案）
CREATE TABLE virtual_files (
    id INTEGER PRIMARY KEY,
    storage_file_id INTEGER REFERENCES storage_files(id),
    original_name VARCHAR(255),
    parent_id INTEGER REFERENCES virtual_files(id),
    uploaded_by INTEGER,
    is_directory BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);
```

#### 3. 上傳流程改進

```go
func HandleDuplicateUpload(file multipart.File, targetFolder uint) error {
    // 1. 計算檔案 hash
    hash := calculateSHA256(file)
    
    // 2. 檢查實體檔案是否存在
    storageFile := findStorageByHash(hash)
    
    if storageFile != nil {
        // 3a. 檔案已存在：建立虛擬連結
        virtualFile := &VirtualFile{
            StorageFileID: storageFile.ID,
            OriginalName:  uploadedFileName,
            ParentID:      &targetFolder,
            UploadedBy:    currentUser.ID,
        }
        
        // 增加引用計數
        storageFile.ReferenceCount++
        
        // 通知使用者
        return ResponseWithInfo{
            Status: "success",
            Message: "檔案已存在，已建立連結到目標資料夾",
            FileID: virtualFile.ID,
            IsDuplicate: true,
            ExistingLocations: getFileLocations(storageFile.ID),
        }
    } else {
        // 3b. 新檔案：正常上傳流程
        uuid := generateUUID()
        saveToDisk(uuid, file)
        
        storageFile = &StorageFile{
            FileHash: hash,
            StorageUUID: uuid,
            FileSize: fileSize,
            MimeType: mimeType,
        }
        
        virtualFile := &VirtualFile{
            StorageFileID: storageFile.ID,
            OriginalName: uploadedFileName,
            ParentID: &targetFolder,
        }
    }
}
```

#### 4. 使用者介面處理

**上傳時的提示：**

```vue
<template>
  <div v-if="uploadResult.isDuplicate" class="duplicate-notice">
    <div class="alert alert-info">
      <h4>發現重複檔案</h4>
      <p>此照片已存在於系統中，已為您建立連結。</p>
      
      <div class="existing-locations">
        <h5>檔案已存在於：</h5>
        <ul>
          <li v-for="location in uploadResult.existingLocations">
            {{ location.path }} (由 {{ location.uploadedBy }} 於 {{ location.date }} 上傳)
          </li>
        </ul>
      </div>
      
      <div class="actions">
        <button @click="viewInCurrentFolder">在當前資料夾查看</button>
        <button @click="viewAllLocations">查看所有位置</button>
      </div>
    </div>
  </div>
</template>
```

#### 5. 進階功能

**相似圖片偵測：**

```go
// 使用感知雜湊（pHash）偵測相似但不完全相同的圖片
type ImageFingerprint struct {
    FileID      uint
    PHash       string  // 感知雜湊
    ColorHash   string  // 顏色分布雜湊
    AspectRatio float32 // 長寬比
}

func detectSimilarImages(uploaded image.Image) []SimilarImage {
    pHash := calculatePerceptualHash(uploaded)
    
    // 找出雜湊距離小於閾值的圖片
    similar := db.Query(`
        SELECT * FROM image_fingerprints 
        WHERE hamming_distance(phash, ?) < 10
    `, pHash)
    
    return similar
}
```

**批次去重工具：**

```go
// 管理員工具：掃描並合併重複檔案
func scanAndMergeDuplicates() {
    // 找出所有重複的 hash
    duplicates := db.Query(`
        SELECT file_hash, COUNT(*) as count 
        FROM files 
        GROUP BY file_hash 
        HAVING count > 1
    `)
    
    for _, dup := range duplicates {
        mergeVirtualFiles(dup.FileHash)
    }
}
```

#### 6. 優點與考量

**優點：**

- 節省儲存空間（相同檔案只存一份）
- 保留檔案在不同位置的組織結構
- 支援不同使用者的個人化命名
- 便於追蹤檔案來源和使用情況

**注意事項：**

- 刪除檔案時需檢查引用計數
- 備份時需處理虛擬連結關係
- 權限管理需考慮共享檔案的存取控制

#### 7. 刪除保護機制

**問題：** 如果原始上傳者刪除檔案，其他使用虛擬連結的使用者會受影響。

**解決方案：引用計數與軟刪除結合**

```go
// 刪除檔案的安全流程
func DeleteFile(fileID uint, userID uint) error {
    virtualFile := getVirtualFile(fileID)
    storageFile := virtualFile.StorageFile
    
    // 1. 刪除虛擬檔案記錄
    virtualFile.IsDeleted = true
    virtualFile.DeletedBy = userID
    virtualFile.DeletedAt = time.Now()
    
    // 2. 減少引用計數
    storageFile.ReferenceCount--
    
    // 3. 檢查是否還有其他引用
    if storageFile.ReferenceCount > 0 {
        // 還有其他使用者在使用，只刪除虛擬連結
        return nil
    }
    
    // 4. 沒有其他引用，可以安全刪除實體檔案
    // 但先進入回收站狀態
    storageFile.IsInTrash = true
    storageFile.TrashDate = time.Now()
    
    // 5. 30天後才真正刪除實體檔案
    schedulePhysicalDeletion(storageFile.ID, 30*24*time.Hour)
    
    return nil
}
```

**多層保護策略：**

1. **引用計數保護**
   ```sql
   -- 實體檔案表增加保護欄位
   ALTER TABLE storage_files ADD COLUMN (
       reference_count INTEGER DEFAULT 1,
       is_protected BOOLEAN DEFAULT FALSE,
       is_in_trash BOOLEAN DEFAULT FALSE,
       trash_date TIMESTAMP,
       permanent_delete_date TIMESTAMP
   );
   ```

2. **檔案所有權轉移**
   ```go
   // 當原始上傳者刪除檔案時
   func handleOwnerDeletion(storageFile *StorageFile) {
       if storageFile.ReferenceCount > 1 {
           // 轉移所有權給下一個使用者
           nextOwner := getOldestVirtualFile(storageFile.ID)
           storageFile.PrimaryOwnerID = nextOwner.UploadedBy
           
           // 通知新所有者
           notifyNewOwner(nextOwner.UploadedBy, storageFile)
       }
   }
   ```

3. **回收站機制**
   ```go
   type TrashBin struct {
       ID              uint
       StorageFileID   uint
       DeletedBy       uint
       DeletedAt       time.Time
       ScheduledDelete time.Time // 預定永久刪除時間
       RestoredAt      *time.Time
   }
   
   // 還原檔案
   func RestoreFromTrash(trashID uint, userID uint) error {
       trash := getTrashItem(trashID)
       storageFile := trash.StorageFile
       
       // 建立新的虛擬檔案連結
       virtualFile := &VirtualFile{
           StorageFileID: storageFile.ID,
           OriginalName:  "已還原_" + storageFile.LastKnownName,
           ParentID:      getUserRootFolder(userID),
           UploadedBy:    userID,
       }
       
       // 增加引用計數
       storageFile.ReferenceCount++
       storageFile.IsInTrash = false
       
       return nil
   }
   ```

4. **管理員介入機制**
   ```vue
   <!-- 管理員檢視重要檔案 -->
   <template>
     <div class="protected-files-manager">
       <h3>受保護的共享檔案</h3>
       <table>
         <tr v-for="file in protectedFiles">
           <td>{{ file.name }}</td>
           <td>{{ file.referenceCount }} 個使用者</td>
           <td>
             <button @click="setProtected(file.id, true)">
               設為永久保護
             </button>
           </td>
         </tr>
       </table>
     </div>
   </template>
   ```

5. **使用者通知系統**
   ```go
   // 通知受影響的使用者
   func notifyAffectedUsers(storageFileID uint, action string) {
       affectedUsers := getVirtualFileUsers(storageFileID)
       
       for _, user := range affectedUsers {
           notification := &Notification{
               UserID: user.ID,
               Type: "FILE_DELETION_WARNING",
               Message: fmt.Sprintf(
                   "您使用的檔案 '%s' 將在30天後被刪除，請及時備份",
                   user.OriginalName,
               ),
               FileID: user.VirtualFileID,
           }
           sendNotification(notification)
       }
   }
   ```

**最佳實踐建議：**

1. **預設保護重要檔案**
   - 被多人引用的檔案自動標記為受保護
   - 教會重要活動照片設為永久保存

2. **定期備份策略**
   - 每週備份所有被多次引用的檔案
   - 保留刪除檔案的備份至少90天

3. **使用者教育**
   - 明確告知刪除只影響自己的連結
   - 提供「查看誰在使用此檔案」功能

## 實作建議

### 1. 立即可實施的改進

1. **加入檔案 Hash**
   - 用於檔案去重
   - 確保資料完整性
   - 支援秒傳功能

2. **優化儲存結構**
   - 按年月分目錄避免單一目錄檔案過多
   - 加入 thumbnails 目錄存放預覽圖

3. **改進虛擬路徑**
   - 快取完整虛擬路徑提升查詢效能
   - 支援路徑搜尋功能

### 2. 中期改進計畫

1. **版本控制系統**
   ```sql
   CREATE TABLE file_versions (
       id INTEGER PRIMARY KEY,
       file_id INTEGER REFERENCES files(id),
       version_number INTEGER,
       uuid VARCHAR(36),
       file_hash VARCHAR(64),
       created_at TIMESTAMP
   );
   ```

2. **檔案分享機制**
   - 生成分享連結
   - 設定過期時間
   - 追蹤分享記錄

3. **進階搜尋功能**
   - 全文搜尋支援
   - 標籤系統
   - 智能分類

### 3. 程式碼範例

**改進的檔案模型：**
```go
type File struct {
    ID           uint      `gorm:"primaryKey"`
    UUID         string    `gorm:"uniqueIndex;size:36"`
    OriginalName string    `gorm:"size:255"`
    FileHash     string    `gorm:"index;size:64"` // SHA-256
    FilePath     string    `gorm:"size:500"`
    FileSize     int64
    MimeType     string    `gorm:"size:100"`
    
    // 虛擬資料夾
    ParentID     *uint
    Parent       *File     `gorm:"foreignKey:ParentID"`
    Children     []File    `gorm:"foreignKey:ParentID"`
    VirtualPath  string    `gorm:"index;size:1000"`
    IsDirectory  bool      `gorm:"default:false"`
    
    // 元資料
    UploadedBy   uint
    User         User      `gorm:"foreignKey:UploadedBy"`
    CategoryID   uint
    Tags         []Tag     `gorm:"many2many:file_tags"`
    
    // 統計
    DownloadCount int      `gorm:"default:0"`
    ViewCount     int      `gorm:"default:0"`
    LastAccessed  *time.Time
    
    // 軟刪除
    IsDeleted    bool      `gorm:"default:false"`
    DeletedAt    *time.Time
    DeletedBy    *uint
    
    CreatedAt    time.Time
    UpdatedAt    time.Time
}
```

## 未來擴展考量

### 1. 雲端儲存整合

準備支援 S3 相容的物件儲存：
```go
type StorageBackend interface {
    Save(uuid string, content io.Reader) error
    Load(uuid string) (io.ReadCloser, error)
    Delete(uuid string) error
    Exists(uuid string) bool
}

type LocalStorage struct{}
type S3Storage struct{}
type HybridStorage struct{} // 本地+雲端
```

### 2. CDN 整合

- 靜態檔案透過 CDN 加速
- 支援多地區部署
- 智能路由選擇

### 3. 大檔案處理

- 分片上傳支援
- 斷點續傳
- 串流下載

### 4. AI 功能整合

- 圖片自動標籤
- 文件內容搜尋
- 智能分類建議

## 結論

MemoryArk 2.0 目前的混合式檔案管理架構已經相當完善，結合了：
- UUID 的安全性
- 虛擬資料夾的便利性
- 完整的元資料管理

建議的改進方向：
1. **短期**：加入檔案去重、優化儲存結構
2. **中期**：實作版本控制、進階搜尋
3. **長期**：雲端整合、AI 功能

這樣的架構可以確保系統在保持現有優勢的同時，為未來的擴展預留充分的彈性。
