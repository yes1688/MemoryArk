# LINE 功能資料庫遷移完整方案

## 🎯 採用方案：直接建立關聯表

建立 `line_upload_records` 表來存儲 LINE 特定資訊，與現有 `files` 表建立關聯，確保所有功能都能正常使用。

## 📊 資料庫設計

### 1. 新增 LineUploadRecord 模型

```go
// backend/internal/models/models.go 新增
type LineUploadRecord struct {
    ID            uint      `json:"id" gorm:"primaryKey"`
    FileID        uint      `json:"file_id" gorm:"not null;index"`
    LineUserId    string    `json:"line_user_id" gorm:"size:100;not null;index"`
    LineUserName  string    `json:"line_user_name" gorm:"size:255;not null"`
    LineMessageId string    `json:"line_message_id" gorm:"size:100;not null;uniqueIndex"`
    LineGroupId   string    `json:"line_group_id,omitempty" gorm:"size:100;index"` // 群組 ID（預留）
    LineGroupName string    `json:"line_group_name,omitempty" gorm:"size:255"`     // 群組名稱（預留）
    MessageType   string    `json:"message_type" gorm:"size:20;default:image"`      // image, video, file
    OriginalUrl   string    `json:"original_url,omitempty" gorm:"size:500"`        // LINE 原始 URL（預留）
    CreatedAt     time.Time `json:"created_at"`
    UpdatedAt     time.Time `json:"updated_at"`
    
    // 關聯
    File          File      `json:"file" gorm:"foreignKey:FileID;constraint:OnDelete:CASCADE"`
}

func (LineUploadRecord) TableName() string {
    return "line_upload_records"
}
```

### 2. 擴展 File 模型關聯

```go
// backend/internal/models/models.go 更新 File 模型
type File struct {
    // ... 原有欄位保持不變
    
    // 新增關聯（不影響資料庫結構）
    LineUploadRecord *LineUploadRecord `json:"lineUploadRecord,omitempty" gorm:"foreignKey:FileID"`
    
    // ... 其他原有欄位
}
```

## 🗄️ 資料庫遷移

### 1. 建立遷移檔案

```go
// backend/internal/database/migrations/20250624_add_line_upload_records.go
package migrations

import (
    "gorm.io/gorm"
    "memoryark/internal/models"
)

func AddLineUploadRecords(db *gorm.DB) error {
    // 建立 line_upload_records 表
    if err := db.AutoMigrate(&models.LineUploadRecord{}); err != nil {
        return fmt.Errorf("建立 line_upload_records 表失敗: %w", err)
    }
    
    // 建立索引
    if err := createLineUploadIndexes(db); err != nil {
        return fmt.Errorf("建立索引失敗: %w", err)
    }
    
    log.Info("LINE 上傳記錄表建立完成")
    return nil
}

func createLineUploadIndexes(db *gorm.DB) error {
    // 複合索引：用戶ID + 建立時間（用於查詢用戶的上傳歷史）
    if err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_line_user_created 
                       ON line_upload_records (line_user_id, created_at DESC)`).Error; err != nil {
        return err
    }
    
    // 複合索引：檔案ID + LINE 用戶ID（用於關聯查詢）
    if err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_file_line_user 
                       ON line_upload_records (file_id, line_user_id)`).Error; err != nil {
        return err
    }
    
    return nil
}

// 回滾函數
func DropLineUploadRecords(db *gorm.DB) error {
    return db.Migrator().DropTable(&models.LineUploadRecord{})
}
```

### 2. 遷移管理器

```go
// backend/internal/database/migrator.go
package database

import (
    "gorm.io/gorm"
    "memoryark/internal/database/migrations"
    "memoryark/internal/utils/logger"
)

type Migration struct {
    ID      string
    Name    string
    Up      func(*gorm.DB) error
    Down    func(*gorm.DB) error
    Applied bool
}

var migrationList = []Migration{
    {
        ID:   "20250624_001",
        Name: "add_line_upload_records",
        Up:   migrations.AddLineUploadRecords,
        Down: migrations.DropLineUploadRecords,
    },
}

func RunMigrations(db *gorm.DB) error {
    // 建立遷移記錄表
    if err := createMigrationTable(db); err != nil {
        return err
    }
    
    // 執行未應用的遷移
    for _, migration := range migrationList {
        if !isMigrationApplied(db, migration.ID) {
            logger.Info("執行遷移: " + migration.Name)
            
            if err := migration.Up(db); err != nil {
                logger.Error("遷移失敗: "+migration.Name, err)
                return err
            }
            
            if err := markMigrationApplied(db, migration.ID, migration.Name); err != nil {
                return err
            }
            
            logger.Info("遷移完成: " + migration.Name)
        }
    }
    
    return nil
}

func createMigrationTable(db *gorm.DB) error {
    return db.Exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `).Error
}

func isMigrationApplied(db *gorm.DB, migrationID string) bool {
    var count int64
    db.Table("migrations").Where("id = ?", migrationID).Count(&count)
    return count > 0
}

func markMigrationApplied(db *gorm.DB, migrationID, name string) error {
    return db.Exec(`
        INSERT INTO migrations (id, name, applied_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
    `, migrationID, name).Error
}
```

## 🔧 服務層實作

### 1. LINE 服務擴展

```go
// backend/internal/services/line_service.go
package services

import (
    "fmt"
    "time"
    "gorm.io/gorm"
    "memoryark/internal/models"
)

type LineService struct {
    db          *gorm.DB
    fileService *FileService
}

func NewLineService(db *gorm.DB, fileService *FileService) *LineService {
    return &LineService{
        db:          db,
        fileService: fileService,
    }
}

type LineUploadParams struct {
    File          multipart.FileHeader
    LineUserId    string
    LineUserName  string
    LineMessageId string
    LineGroupId   string
    LineGroupName string
    MessageType   string
    UploadedBy    uint
    CategoryID    *uint
    VirtualPath   string
}

func (s *LineService) UploadPhoto(params LineUploadParams) (*models.File, *models.LineUploadRecord, error) {
    // 檢查是否已經處理過這個訊息
    var existingRecord models.LineUploadRecord
    if err := s.db.Where("line_message_id = ?", params.LineMessageId).First(&existingRecord).Error; err == nil {
        // 訊息已處理，返回現有檔案
        var file models.File
        s.db.First(&file, existingRecord.FileID)
        return &file, &existingRecord, nil
    }
    
    // 開始資料庫事務
    tx := s.db.Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()
    
    // 1. 上傳檔案到 MemoryArk
    uploadParams := FileUploadParams{
        File:         &params.File,
        UploadedBy:   params.UploadedBy,
        OriginalName: params.File.Filename,
        VirtualPath:  params.VirtualPath,
        CategoryID:   params.CategoryID,
        Description:  s.buildDescription(params),
        Tags:         s.buildTags(params),
        ContentType:  "LINE照片",
    }
    
    file, err := s.fileService.UploadFileWithTx(tx, uploadParams)
    if err != nil {
        tx.Rollback()
        return nil, nil, fmt.Errorf("檔案上傳失敗: %w", err)
    }
    
    // 2. 建立 LINE 上傳記錄
    lineRecord := models.LineUploadRecord{
        FileID:        file.ID,
        LineUserId:    params.LineUserId,
        LineUserName:  params.LineUserName,
        LineMessageId: params.LineMessageId,
        LineGroupId:   params.LineGroupId,
        LineGroupName: params.LineGroupName,
        MessageType:   params.MessageType,
        CreatedAt:     time.Now(),
        UpdatedAt:     time.Now(),
    }
    
    if err := tx.Create(&lineRecord).Error; err != nil {
        tx.Rollback()
        return nil, nil, fmt.Errorf("建立 LINE 記錄失敗: %w", err)
    }
    
    // 提交事務
    if err := tx.Commit().Error; err != nil {
        return nil, nil, fmt.Errorf("事務提交失敗: %w", err)
    }
    
    return file, &lineRecord, nil
}

func (s *LineService) buildDescription(params LineUploadParams) string {
    if params.LineGroupName != "" {
        return fmt.Sprintf("由 LINE 群組「%s」中的用戶「%s」上傳", 
            params.LineGroupName, params.LineUserName)
    }
    return fmt.Sprintf("由 LINE 用戶「%s」上傳", params.LineUserName)
}

func (s *LineService) buildTags(params LineUploadParams) string {
    tags := []string{"LINE", "機器人上傳"}
    if params.LineGroupName != "" {
        tags = append(tags, "群組上傳")
    } else {
        tags = append(tags, "私訊上傳")
    }
    return strings.Join(tags, ",")
}

// 查詢 LINE 用戶的上傳記錄
func (s *LineService) GetUserUploadHistory(lineUserId string, limit int, offset int) ([]models.LineUploadRecord, int64, error) {
    var records []models.LineUploadRecord
    var total int64
    
    query := s.db.Where("line_user_id = ?", lineUserId)
    
    // 計算總數
    if err := query.Model(&models.LineUploadRecord{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }
    
    // 查詢記錄（包含關聯的檔案資訊）
    if err := query.Preload("File").
        Order("created_at DESC").
        Limit(limit).
        Offset(offset).
        Find(&records).Error; err != nil {
        return nil, 0, err
    }
    
    return records, total, nil
}

// 查詢 LINE 群組的上傳記錄
func (s *LineService) GetGroupUploadHistory(lineGroupId string, limit int, offset int) ([]models.LineUploadRecord, int64, error) {
    var records []models.LineUploadRecord
    var total int64
    
    query := s.db.Where("line_group_id = ?", lineGroupId)
    
    if err := query.Model(&models.LineUploadRecord{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }
    
    if err := query.Preload("File").
        Order("created_at DESC").
        Limit(limit).
        Offset(offset).
        Find(&records).Error; err != nil {
        return nil, 0, err
    }
    
    return records, total, nil
}

// 取得 LINE 上傳統計
func (s *LineService) GetUploadStats() (*LineUploadStats, error) {
    var stats LineUploadStats
    
    // 總上傳數
    if err := s.db.Model(&models.LineUploadRecord{}).Count(&stats.TotalUploads).Error; err != nil {
        return nil, err
    }
    
    // 今日上傳數
    today := time.Now().Format("2006-01-02")
    if err := s.db.Model(&models.LineUploadRecord{}).
        Where("DATE(created_at) = ?", today).
        Count(&stats.TodayUploads).Error; err != nil {
        return nil, err
    }
    
    // 活躍用戶數
    if err := s.db.Model(&models.LineUploadRecord{}).
        Distinct("line_user_id").
        Count(&stats.ActiveUsers).Error; err != nil {
        return nil, err
    }
    
    // 本月上傳數
    thisMonth := time.Now().Format("2006-01")
    if err := s.db.Model(&models.LineUploadRecord{}).
        Where("strftime('%Y-%m', created_at) = ?", thisMonth).
        Count(&stats.MonthlyUploads).Error; err != nil {
        return nil, err
    }
    
    return &stats, nil
}

type LineUploadStats struct {
    TotalUploads   int64 `json:"totalUploads"`
    TodayUploads   int64 `json:"todayUploads"`
    MonthlyUploads int64 `json:"monthlyUploads"`
    ActiveUsers    int64 `json:"activeUsers"`
}
```

### 2. 檔案服務擴展

```go
// backend/internal/services/file_service.go 新增方法
func (s *FileService) UploadFileWithTx(tx *gorm.DB, params FileUploadParams) (*models.File, error) {
    // 與原有 UploadFile 邏輯相同，但使用傳入的事務
    // 這確保檔案上傳和 LINE 記錄建立在同一個事務中
    
    // ... 檔案處理邏輯
    
    file := &models.File{
        Name:         params.OriginalName,
        OriginalName: params.OriginalName,
        FilePath:     finalPath,
        VirtualPath:  params.VirtualPath,
        SHA256Hash:   hash,
        FileSize:     fileSize,
        MimeType:     mimeType,
        CategoryID:   params.CategoryID,
        UploadedBy:   params.UploadedBy,
        Description:  params.Description,
        Tags:         params.Tags,
        ContentType:  params.ContentType,
        CreatedAt:    time.Now(),
        UpdatedAt:    time.Now(),
    }
    
    // 使用傳入的事務
    if err := tx.Create(file).Error; err != nil {
        return nil, err
    }
    
    return file, nil
}
```

## 🔌 API 端點實作

### 1. LINE Handler 更新

```go
// backend/internal/api/handlers/line_handler.go
package handlers

import (
    "net/http"
    "strconv"
    "github.com/gin-gonic/gin"
    "memoryark/internal/services"
    "memoryark/internal/models"
)

type LineHandler struct {
    lineService *services.LineService
    userService *services.UserService
}

func NewLineHandler(lineService *services.LineService, userService *services.UserService) *LineHandler {
    return &LineHandler{
        lineService: lineService,
        userService: userService,
    }
}

// LINE 照片上傳
func (h *LineHandler) UploadPhoto(c *gin.Context) {
    // 解析表單資料
    form, err := c.MultipartForm()
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "INVALID_FORM",
                "message": "無效的表單資料",
            },
        })
        return
    }

    files := form.File["file"]
    if len(files) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "NO_FILE",
                "message": "沒有上傳檔案",
            },
        })
        return
    }

    file := files[0]
    
    // 取得 LINE 資訊
    lineUserId := c.PostForm("lineUserId")
    lineUserName := c.PostForm("lineUserName")
    lineMessageId := c.PostForm("lineMessageId")
    lineGroupId := c.PostForm("lineGroupId")
    lineGroupName := c.PostForm("lineGroupName")
    
    if lineUserId == "" || lineUserName == "" || lineMessageId == "" {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "MISSING_LINE_INFO",
                "message": "缺少 LINE 用戶資訊",
            },
        })
        return
    }

    // 取得或建立 LINE 用戶
    lineUser, err := h.userService.GetOrCreateLineUser(lineUserId, lineUserName)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "USER_ERROR",
                "message": "處理用戶資訊失敗",
            },
        })
        return
    }

    // 準備上傳參數
    uploadParams := services.LineUploadParams{
        File:          *file,
        LineUserId:    lineUserId,
        LineUserName:  lineUserName,
        LineMessageId: lineMessageId,
        LineGroupId:   lineGroupId,
        LineGroupName: lineGroupName,
        MessageType:   "image",
        UploadedBy:    lineUser.ID,
        CategoryID:    h.parseUintParam(c.PostForm("categoryId")),
        VirtualPath:   h.buildVirtualPath(lineUserName, lineGroupName, file.Filename),
    }

    // 執行上傳
    uploadedFile, lineRecord, err := h.lineService.UploadPhoto(uploadParams)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "UPLOAD_FAILED",
                "message": err.Error(),
            },
        })
        return
    }

    // 回傳結果
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "file":       uploadedFile,
            "lineRecord": lineRecord,
        },
    })
}

// 查詢 LINE 用戶上傳歷史
func (h *LineHandler) GetUserHistory(c *gin.Context) {
    lineUserId := c.Param("userId")
    page := h.parseIntParam(c.Query("page"), 1)
    pageSize := h.parseIntParam(c.Query("pageSize"), 20)
    
    offset := (page - 1) * pageSize
    
    records, total, err := h.lineService.GetUserUploadHistory(lineUserId, pageSize, offset)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "QUERY_FAILED",
                "message": "查詢失敗",
            },
        })
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "records": records,
            "pagination": gin.H{
                "page":       page,
                "pageSize":   pageSize,
                "total":      total,
                "totalPages": (total + int64(pageSize) - 1) / int64(pageSize),
            },
        },
    })
}

// 查詢 LINE 上傳統計
func (h *LineHandler) GetStats(c *gin.Context) {
    stats, err := h.lineService.GetUploadStats()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "STATS_FAILED",
                "message": "統計資料取得失敗",
            },
        })
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    stats,
    })
}

// 輔助方法
func (h *LineHandler) buildVirtualPath(userName, groupName, filename string) string {
    yearMonth := time.Now().Format("2006-01")
    
    if groupName != "" {
        return fmt.Sprintf("/LINE上傳/群組/%s/%s/%s", groupName, yearMonth, filename)
    }
    return fmt.Sprintf("/LINE上傳/個人/%s/%s/%s", userName, yearMonth, filename)
}

func (h *LineHandler) parseUintParam(param string) *uint {
    if param == "" {
        return nil
    }
    val, err := strconv.ParseUint(param, 10, 32)
    if err != nil {
        return nil
    }
    result := uint(val)
    return &result
}

func (h *LineHandler) parseIntParam(param string, defaultValue int) int {
    if param == "" {
        return defaultValue
    }
    val, err := strconv.Atoi(param)
    if err != nil {
        return defaultValue
    }
    return val
}
```

### 2. 路由註冊

```go
// backend/internal/api/router.go 更新
func SetupRouter(cfg *config.Config, db *gorm.DB) *gin.Engine {
    // ... 原有程式碼
    
    // 建立服務
    fileService := services.NewFileService(db, cfg)
    lineService := services.NewLineService(db, fileService)
    userService := services.NewUserService(db)
    
    // 建立處理器
    lineHandler := handlers.NewLineHandler(lineService, userService)
    
    // LINE 服務專用路由
    internal := api.Group("/internal")
    internal.Use(lineHandler.InternalServiceMiddleware())
    {
        line := internal.Group("/line")
        {
            line.POST("/upload-photo", lineHandler.UploadPhoto)
            line.GET("/users/:userId/history", lineHandler.GetUserHistory)
            line.GET("/groups/:groupId/history", lineHandler.GetGroupHistory)
            line.GET("/stats", lineHandler.GetStats)
            line.GET("/health", lineHandler.HealthCheck)
        }
    }
    
    return r
}
```

## 🚀 部署與遷移

### 1. 遷移腳本

```bash
#!/bin/bash
# scripts/migrate-line-features.sh

echo "🗄️ 開始 LINE 功能資料庫遷移..."

# 檢查環境
if [ "$NODE_ENV" = "production" ]; then
    echo "⚠️ 生產環境遷移，請確認備份已完成"
    read -p "繼續嗎？(y/N): " confirm
    if [ "$confirm" != "y" ]; then
        echo "❌ 遷移已取消"
        exit 1
    fi
fi

# 備份資料庫
echo "📦 備份資料庫..."
cp ./data/memoryark.db "./data/memoryark.db.backup.$(date +%Y%m%d_%H%M%S)"

# 執行遷移
echo "🔄 執行資料庫遷移..."
./memoryark migrate

if [ $? -eq 0 ]; then
    echo "✅ 資料庫遷移完成"
else
    echo "❌ 資料庫遷移失敗"
    exit 1
fi

# 重啟服務
echo "🔄 重啟服務..."
podman-compose down
podman-compose up -d

echo "🎉 LINE 功能部署完成！"
```

### 2. 主程式啟動時執行遷移

```go
// backend/cmd/server/main.go 更新
func main() {
    // ... 原有初始化代碼
    
    // 執行資料庫遷移
    if err := database.RunMigrations(db); err != nil {
        log.Fatal("資料庫遷移失敗: ", err)
    }
    
    // ... 啟動服務器
}
```

## 📊 驗證測試

### 1. 功能驗證清單

```bash
# 1. 檢查資料庫表是否建立成功
sqlite3 ./data/memoryark.db ".tables" | grep line_upload_records

# 2. 檢查索引是否建立成功
sqlite3 ./data/memoryark.db ".indices line_upload_records"

# 3. 測試 API 端點
curl -X POST http://localhost:8081/api/internal/line/upload-photo \
  -H "X-Internal-Service-Key: your_key" \
  -F "file=@test.jpg" \
  -F "lineUserId=test_user" \
  -F "lineUserName=測試用戶" \
  -F "lineMessageId=test_message_123"

# 4. 查詢測試
curl http://localhost:8081/api/internal/line/stats \
  -H "X-Internal-Service-Key: your_key"
```

### 2. 資料一致性檢查

```sql
-- 檢查關聯完整性
SELECT 
    f.id as file_id,
    f.name as file_name,
    l.line_user_name,
    l.line_message_id
FROM files f
LEFT JOIN line_upload_records l ON f.id = l.file_id
WHERE f.tags LIKE '%LINE%';

-- 檢查重複訊息ID
SELECT line_message_id, COUNT(*) as count
FROM line_upload_records 
GROUP BY line_message_id 
HAVING COUNT(*) > 1;
```

## 📝 總結

此方案提供：

1. ✅ **完整的資料關聯** - LINE 資訊與檔案完整關聯
2. ✅ **資料一致性** - 事務確保資料完整性
3. ✅ **查詢效率** - 適當的索引設計
4. ✅ **擴展性** - 支援群組、不同訊息類型
5. ✅ **向後相容** - 不影響現有功能
6. ✅ **安全遷移** - 完整的備份和回滾機制

這樣設計確保 LINE 功能與 MemoryArk2 完美整合，所有功能都能正常使用！