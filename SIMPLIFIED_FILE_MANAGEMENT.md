# 簡化檔案管理方案 - MemoryArk 2.0

## 您的擔憂分析

### 現實考量
1. **系統故障風險** - 資料庫損壞時如何快速恢復？
2. **匯出效能** - 大量檔案匯出時的速度問題
3. **維護複雜度** - 虛擬路徑增加系統複雜性
4. **災難恢復** - 如何確保檔案不會遺失？

## 方案比較

### 方案 A：純標籤系統（無資料夾）

```
檔案儲存：
/uploads/2025/01/a7b9c2d4.jpg
/uploads/2025/01/b8c0d3e5.pdf

組織方式：
- 標籤：#安息日聚會 #2025年 #照片
- 分類：聚會活動
- 日期：2025-01-15
```

**優點：**
- 極度簡單，維護容易
- 檔案直接可見，備份簡單
- 系統故障時仍可存取檔案
- 搜尋靈活（多維度標籤）

**缺點：**
- 使用者需要適應新模式
- 缺少階層式瀏覽習慣

### 方案 B：簡化混合方案（推薦）

```
實體儲存結構（簡單且可預測）：
/uploads/
  ├── 2025/
  │   ├── 01/
  │   │   ├── 15_安息日聚會_001.jpg
  │   │   ├── 15_安息日聚會_002.jpg
  │   │   └── 20_青年團契_001.pdf
  │   └── 02/
  └── protected/  # 重要檔案
      └── 永久保存_建堂紀念.mp4
```

**命名規則：**
```
{日期}_{活動類型}_{序號}.{副檔名}
15_安息日聚會_001.jpg
```

**實作方式：**
```go
type SimpleFile struct {
    ID           uint
    Filename     string    // 15_安息日聚會_001.jpg
    OriginalName string    // DSC_1234.jpg
    FilePath     string    // /uploads/2025/01/15_安息日聚會_001.jpg
    
    // 簡單分類
    Year         int       // 2025
    Month        int       // 1
    EventType    string    // 安息日聚會
    
    // 彈性標籤
    Tags         []string  // ["照片", "講道", "受洗"]
    
    // 基本資訊
    FileSize     int64
    UploadedBy   uint
    UploadedAt   time.Time
}
```

### 實作簡化策略

#### 1. 智能檔名生成
```go
func GenerateSmartFilename(original string, eventType string, date time.Time) string {
    // 取得副檔名
    ext := filepath.Ext(original)
    
    // 生成可讀檔名
    day := date.Format("02")
    
    // 計算當天同類型檔案數量
    count := getEventFileCount(date, eventType) + 1
    
    // 組合：日期_活動類型_序號
    filename := fmt.Sprintf("%s_%s_%03d%s", 
        day, 
        sanitize(eventType), 
        count, 
        ext)
    
    return filename
}

// 範例輸出：
// 15_安息日聚會_001.jpg
// 15_安息日聚會_002.jpg
// 20_青年團契_001.pdf
```

#### 2. 快速匯出功能
```go
func QuickExport(criteria ExportCriteria) string {
    // 因為檔案已經按年月組織，直接複製整個資料夾即可
    if criteria.ExportAll {
        // 直接打包 uploads 資料夾
        return createZip("/uploads")
    }
    
    // 按條件匯出
    if criteria.Year > 0 && criteria.Month > 0 {
        // 直接複製對應資料夾
        sourcePath := fmt.Sprintf("/uploads/%d/%02d", criteria.Year, criteria.Month)
        return createZip(sourcePath)
    }
}
```

#### 3. 災難恢復設計
```bash
# 每日自動備份腳本
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# 1. 備份資料庫
sqlite3 /data/memoryark.db ".backup $BACKUP_DIR/database.db"

# 2. 備份檔案（增量備份）
rsync -av --link-dest=/backup/latest /uploads/ $BACKUP_DIR/files/

# 3. 更新最新備份連結
ln -sfn $BACKUP_DIR /backup/latest

# 4. 產生恢復說明
cat > $BACKUP_DIR/RECOVERY.txt << EOF
恢復步驟：
1. 複製 database.db 到 /data/
2. 複製 files/* 到 /uploads/
3. 重啟系統即可
EOF
```

### 使用者介面簡化

#### 虛擬資料夾（僅供瀏覽）
```vue
<template>
  <div class="file-browser">
    <!-- 提供熟悉的資料夾視圖，但實際上是動態生成 -->
    <div class="virtual-folders">
      <folder-view 
        :title="currentView"
        :files="filteredFiles"
      />
    </div>
    
    <!-- 快速切換視圖 -->
    <div class="view-switcher">
      <button @click="viewBy('date')">按日期</button>
      <button @click="viewBy('event')">按活動</button>
      <button @click="viewBy('type')">按類型</button>
      <button @click="viewBy('tags')">按標籤</button>
    </div>
  </div>
</template>
```

### 去重簡化方案

```go
// 超簡單的去重：相同檔案直接不儲存
func HandleDuplicate(file *UploadedFile) (*File, error) {
    hash := calculateHash(file)
    
    // 檢查是否已存在
    if existing := db.Where("file_hash = ?", hash).First(&File{}); existing != nil {
        // 直接返回現有檔案，加上新標籤
        existing.Tags = append(existing.Tags, file.IntendedTags...)
        return existing, nil
    }
    
    // 新檔案正常儲存
    return saveNewFile(file)
}
```

## 建議採用：簡化混合方案

### 核心原則
1. **實體檔案組織簡單可預測**（年/月/可讀檔名）
2. **虛擬組織靈活**（標籤 + 分類）
3. **直接存取**（檔案系統可直接瀏覽）
4. **快速恢復**（複製即可使用）

### 優勢總結
- ✅ **簡單**：檔案結構一目了然
- ✅ **安全**：系統故障也能存取
- ✅ **快速**：直接複製資料夾即可匯出
- ✅ **彈性**：透過標籤實現複雜組織
- ✅ **熟悉**：保留資料夾瀏覽體驗

### 實施步驟
1. **第一階段**：實作簡單檔名規則
2. **第二階段**：建立標籤系統
3. **第三階段**：實作虛擬資料夾視圖
4. **第四階段**：自動備份機制

## 結論

不需要完全放棄資料夾概念，而是：
- **實體儲存超簡單**（年/月 + 可讀檔名）
- **虛擬呈現很靈活**（使用者看到的是組織好的結構）
- **災難恢復超容易**（直接複製檔案即可）

這樣既保留了使用者習慣，又大幅降低了系統複雜度！