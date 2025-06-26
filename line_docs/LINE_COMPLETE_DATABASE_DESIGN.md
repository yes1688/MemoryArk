# LINE 功能完整資料庫設計

## 🗄️ 完整資料表設計

### 1. line_upload_records (主要 LINE 上傳記錄表)

```sql
-- LINE 上傳記錄主表
CREATE TABLE line_upload_records (
    id CHAR(36) PRIMARY KEY,                    -- UUID v7
    file_id INTEGER NOT NULL,                   -- 關聯到 files 表
    line_user_id VARCHAR(100) NOT NULL,         -- LINE 用戶 ID
    line_user_name VARCHAR(255) NOT NULL,       -- LINE 用戶顯示名稱
    line_message_id VARCHAR(100) NOT NULL,      -- LINE 訊息 ID (防重複)
    line_group_id VARCHAR(100),                 -- LINE 群組 ID (可空)
    line_group_name VARCHAR(255),               -- LINE 群組名稱 (可空)
    message_type VARCHAR(20) DEFAULT 'image',   -- 訊息類型: image, video, file
    original_url VARCHAR(500),                  -- LINE 原始檔案 URL (預留)
    download_status VARCHAR(20) DEFAULT 'completed', -- 下載狀態: pending, downloading, completed, failed
    error_message TEXT,                         -- 錯誤訊息 (如果下載失敗)
    retry_count INTEGER DEFAULT 0,              -- 重試次數
    created_at DATETIME NOT NULL,               -- 建立時間
    updated_at DATETIME NOT NULL,               -- 更新時間
    
    -- 外鍵約束
    FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
    
    -- 唯一約束 (防止重複處理同一訊息)
    UNIQUE KEY uk_line_message_id (line_message_id),
    
    -- 索引優化
    INDEX idx_line_user_id (line_user_id),
    INDEX idx_line_group_id (line_group_id),
    INDEX idx_line_user_created (line_user_id, created_at DESC),
    INDEX idx_file_line (file_id, line_user_id),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_message_type (message_type)
);
```

### 2. line_users (LINE 用戶資訊表)

```sql
-- LINE 用戶資訊表
CREATE TABLE line_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_user_id VARCHAR(100) NOT NULL UNIQUE,  -- LINE 用戶 ID
    display_name VARCHAR(255) NOT NULL,         -- 顯示名稱
    picture_url VARCHAR(500),                   -- 頭像 URL
    status_message TEXT,                        -- 狀態訊息
    language VARCHAR(10),                       -- 語言設定
    is_blocked BOOLEAN DEFAULT FALSE,           -- 是否被封鎖
    is_active BOOLEAN DEFAULT TRUE,             -- 是否活躍
    first_interaction_at DATETIME,              -- 首次互動時間
    last_interaction_at DATETIME,               -- 最後互動時間
    total_uploads INTEGER DEFAULT 0,            -- 總上傳數
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    
    -- 索引
    INDEX idx_line_user_id (line_user_id),
    INDEX idx_display_name (display_name),
    INDEX idx_last_interaction (last_interaction_at DESC),
    INDEX idx_total_uploads (total_uploads DESC)
);
```

### 3. line_groups (LINE 群組資訊表)

```sql
-- LINE 群組資訊表
CREATE TABLE line_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_group_id VARCHAR(100) NOT NULL UNIQUE, -- LINE 群組 ID
    group_name VARCHAR(255) NOT NULL,           -- 群組名稱
    group_type VARCHAR(20) DEFAULT 'group',     -- 群組類型: group, room
    is_active BOOLEAN DEFAULT TRUE,             -- 是否活躍
    member_count INTEGER DEFAULT 0,             -- 成員數量 (估算)
    total_uploads INTEGER DEFAULT 0,            -- 總上傳數
    first_interaction_at DATETIME,              -- 首次互動時間
    last_interaction_at DATETIME,               -- 最後互動時間
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    
    -- 索引
    INDEX idx_line_group_id (line_group_id),
    INDEX idx_group_name (group_name),
    INDEX idx_last_interaction (last_interaction_at DESC),
    INDEX idx_total_uploads (total_uploads DESC)
);
```

### 4. line_group_members (群組成員關聯表)

```sql
-- LINE 群組成員關聯表
CREATE TABLE line_group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_group_id VARCHAR(100) NOT NULL,        -- LINE 群組 ID
    line_user_id VARCHAR(100) NOT NULL,         -- LINE 用戶 ID
    role VARCHAR(20) DEFAULT 'member',          -- 角色: admin, member
    join_date DATETIME,                         -- 加入時間
    leave_date DATETIME,                        -- 離開時間 (NULL 表示仍在群組)
    is_active BOOLEAN DEFAULT TRUE,             -- 是否活躍成員
    upload_count INTEGER DEFAULT 0,             -- 在此群組的上傳數
    last_upload_at DATETIME,                    -- 在此群組的最後上傳時間
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    
    -- 聯合唯一約束
    UNIQUE KEY uk_group_user (line_group_id, line_user_id),
    
    -- 索引
    INDEX idx_group_id (line_group_id),
    INDEX idx_user_id (line_user_id),
    INDEX idx_active_members (line_group_id, is_active),
    INDEX idx_upload_count (upload_count DESC)
);
```

### 5. line_webhook_logs (Webhook 日誌表)

```sql
-- LINE Webhook 日誌表
CREATE TABLE line_webhook_logs (
    id CHAR(36) PRIMARY KEY,                    -- UUID v7
    webhook_type VARCHAR(50) NOT NULL,          -- 事件類型: message, follow, unfollow, etc.
    line_user_id VARCHAR(100),                  -- LINE 用戶 ID
    line_group_id VARCHAR(100),                 -- LINE 群組 ID (可空)
    message_id VARCHAR(100),                    -- 訊息 ID
    message_type VARCHAR(20),                   -- 訊息類型: text, image, video, etc.
    event_data JSON,                            -- 完整事件資料 (JSON 格式)
    processing_status VARCHAR(20) DEFAULT 'pending', -- 處理狀態: pending, processing, completed, failed
    processing_time INTEGER,                    -- 處理耗時 (毫秒)
    error_message TEXT,                         -- 錯誤訊息
    retry_count INTEGER DEFAULT 0,              -- 重試次數
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    
    -- 索引
    INDEX idx_webhook_type (webhook_type),
    INDEX idx_line_user_id (line_user_id),
    INDEX idx_message_id (message_id),
    INDEX idx_processing_status (processing_status),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_retry_count (retry_count)
);
```

### 6. line_settings (LINE 機器人設定表)

```sql
-- LINE 機器人設定表
CREATE TABLE line_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,   -- 設定鍵
    setting_value TEXT,                         -- 設定值
    setting_type VARCHAR(20) DEFAULT 'string',  -- 設定類型: string, integer, boolean, json
    description TEXT,                           -- 設定描述
    is_active BOOLEAN DEFAULT TRUE,             -- 是否啟用
    created_by INTEGER,                         -- 建立者 (管理員 ID)
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    
    -- 外鍵
    FOREIGN KEY (created_by) REFERENCES users (id),
    
    -- 索引
    INDEX idx_setting_key (setting_key),
    INDEX idx_is_active (is_active)
);
```

### 7. line_upload_stats (上傳統計表 - 用於快速查詢)

```sql
-- LINE 上傳統計表 (定期彙總數據，提升查詢效能)
CREATE TABLE line_upload_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stat_date DATE NOT NULL,                    -- 統計日期
    stat_type VARCHAR(20) NOT NULL,             -- 統計類型: daily, weekly, monthly
    line_user_id VARCHAR(100),                  -- LINE 用戶 ID (可空，表示全體統計)
    line_group_id VARCHAR(100),                 -- LINE 群組 ID (可空)
    upload_count INTEGER DEFAULT 0,             -- 上傳數量
    file_size_total BIGINT DEFAULT 0,           -- 檔案大小總計 (bytes)
    image_count INTEGER DEFAULT 0,              -- 圖片數量
    video_count INTEGER DEFAULT 0,              -- 影片數量
    other_count INTEGER DEFAULT 0,              -- 其他檔案數量
    active_users INTEGER DEFAULT 0,             -- 活躍用戶數 (僅適用於群組統計)
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    
    -- 聯合唯一約束
    UNIQUE KEY uk_stat_date_type_user (stat_date, stat_type, line_user_id, line_group_id),
    
    -- 索引
    INDEX idx_stat_date (stat_date DESC),
    INDEX idx_stat_type (stat_type),
    INDEX idx_line_user_id (line_user_id),
    INDEX idx_line_group_id (line_group_id),
    INDEX idx_upload_count (upload_count DESC)
);
```

## 🔄 資料庫遷移腳本

### 完整遷移檔案

```go
// backend/internal/database/migrations/20250624_create_line_tables.go
package migrations

import (
    "fmt"
    "gorm.io/gorm"
    "memoryark/internal/utils/logger"
)

func CreateLineTables(db *gorm.DB) error {
    logger.Info("開始建立 LINE 相關資料表...")
    
    // 1. 建立 line_upload_records 表
    if err := createLineUploadRecordsTable(db); err != nil {
        return fmt.Errorf("建立 line_upload_records 表失敗: %w", err)
    }
    
    // 2. 建立 line_users 表
    if err := createLineUsersTable(db); err != nil {
        return fmt.Errorf("建立 line_users 表失敗: %w", err)
    }
    
    // 3. 建立 line_groups 表
    if err := createLineGroupsTable(db); err != nil {
        return fmt.Errorf("建立 line_groups 表失敗: %w", err)
    }
    
    // 4. 建立 line_group_members 表
    if err := createLineGroupMembersTable(db); err != nil {
        return fmt.Errorf("建立 line_group_members 表失敗: %w", err)
    }
    
    // 5. 建立 line_webhook_logs 表
    if err := createLineWebhookLogsTable(db); err != nil {
        return fmt.Errorf("建立 line_webhook_logs 表失敗: %w", err)
    }
    
    // 6. 建立 line_settings 表
    if err := createLineSettingsTable(db); err != nil {
        return fmt.Errorf("建立 line_settings 表失敗: %w", err)
    }
    
    // 7. 建立 line_upload_stats 表
    if err := createLineUploadStatsTable(db); err != nil {
        return fmt.Errorf("建立 line_upload_stats 表失敗: %w", err)
    }
    
    // 8. 插入初始設定資料
    if err := insertDefaultLineSettings(db); err != nil {
        return fmt.Errorf("插入預設設定失敗: %w", err)
    }
    
    logger.Info("LINE 相關資料表建立完成")
    return nil
}

func createLineUploadRecordsTable(db *gorm.DB) error {
    sql := `
    CREATE TABLE IF NOT EXISTS line_upload_records (
        id CHAR(36) PRIMARY KEY,
        file_id INTEGER NOT NULL,
        line_user_id VARCHAR(100) NOT NULL,
        line_user_name VARCHAR(255) NOT NULL,
        line_message_id VARCHAR(100) NOT NULL,
        line_group_id VARCHAR(100),
        line_group_name VARCHAR(255),
        message_type VARCHAR(20) DEFAULT 'image',
        original_url VARCHAR(500),
        download_status VARCHAR(20) DEFAULT 'completed',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS uk_line_message_id ON line_upload_records (line_message_id);
    CREATE INDEX IF NOT EXISTS idx_line_user_id ON line_upload_records (line_user_id);
    CREATE INDEX IF NOT EXISTS idx_line_group_id ON line_upload_records (line_group_id);
    CREATE INDEX IF NOT EXISTS idx_line_user_created ON line_upload_records (line_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_file_line ON line_upload_records (file_id, line_user_id);
    CREATE INDEX IF NOT EXISTS idx_created_at ON line_upload_records (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_message_type ON line_upload_records (message_type);
    `
    
    return db.Exec(sql).Error
}

func createLineUsersTable(db *gorm.DB) error {
    sql := `
    CREATE TABLE IF NOT EXISTS line_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        line_user_id VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        picture_url VARCHAR(500),
        status_message TEXT,
        language VARCHAR(10),
        is_blocked BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        first_interaction_at DATETIME,
        last_interaction_at DATETIME,
        total_uploads INTEGER DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS uk_line_user_id ON line_users (line_user_id);
    CREATE INDEX IF NOT EXISTS idx_display_name ON line_users (display_name);
    CREATE INDEX IF NOT EXISTS idx_last_interaction ON line_users (last_interaction_at DESC);
    CREATE INDEX IF NOT EXISTS idx_total_uploads ON line_users (total_uploads DESC);
    `
    
    return db.Exec(sql).Error
}

func createLineGroupsTable(db *gorm.DB) error {
    sql := `
    CREATE TABLE IF NOT EXISTS line_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        line_group_id VARCHAR(100) NOT NULL UNIQUE,
        group_name VARCHAR(255) NOT NULL,
        group_type VARCHAR(20) DEFAULT 'group',
        is_active BOOLEAN DEFAULT TRUE,
        member_count INTEGER DEFAULT 0,
        total_uploads INTEGER DEFAULT 0,
        first_interaction_at DATETIME,
        last_interaction_at DATETIME,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS uk_line_group_id ON line_groups (line_group_id);
    CREATE INDEX IF NOT EXISTS idx_group_name ON line_groups (group_name);
    CREATE INDEX IF NOT EXISTS idx_last_interaction_group ON line_groups (last_interaction_at DESC);
    CREATE INDEX IF NOT EXISTS idx_total_uploads_group ON line_groups (total_uploads DESC);
    `
    
    return db.Exec(sql).Error
}

func createLineGroupMembersTable(db *gorm.DB) error {
    sql := `
    CREATE TABLE IF NOT EXISTS line_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        line_group_id VARCHAR(100) NOT NULL,
        line_user_id VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'member',
        join_date DATETIME,
        leave_date DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        upload_count INTEGER DEFAULT 0,
        last_upload_at DATETIME,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS uk_group_user ON line_group_members (line_group_id, line_user_id);
    CREATE INDEX IF NOT EXISTS idx_group_id_members ON line_group_members (line_group_id);
    CREATE INDEX IF NOT EXISTS idx_user_id_members ON line_group_members (line_user_id);
    CREATE INDEX IF NOT EXISTS idx_active_members ON line_group_members (line_group_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_upload_count_members ON line_group_members (upload_count DESC);
    `
    
    return db.Exec(sql).Error
}

func createLineWebhookLogsTable(db *gorm.DB) error {
    sql := `
    CREATE TABLE IF NOT EXISTS line_webhook_logs (
        id CHAR(36) PRIMARY KEY,
        webhook_type VARCHAR(50) NOT NULL,
        line_user_id VARCHAR(100),
        line_group_id VARCHAR(100),
        message_id VARCHAR(100),
        message_type VARCHAR(20),
        event_data TEXT,
        processing_status VARCHAR(20) DEFAULT 'pending',
        processing_time INTEGER,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_webhook_type ON line_webhook_logs (webhook_type);
    CREATE INDEX IF NOT EXISTS idx_line_user_id_logs ON line_webhook_logs (line_user_id);
    CREATE INDEX IF NOT EXISTS idx_message_id_logs ON line_webhook_logs (message_id);
    CREATE INDEX IF NOT EXISTS idx_processing_status ON line_webhook_logs (processing_status);
    CREATE INDEX IF NOT EXISTS idx_created_at_logs ON line_webhook_logs (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_retry_count ON line_webhook_logs (retry_count);
    `
    
    return db.Exec(sql).Error
}

func createLineSettingsTable(db *gorm.DB) error {
    sql := `
    CREATE TABLE IF NOT EXISTS line_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT,
        setting_type VARCHAR(20) DEFAULT 'string',
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        
        FOREIGN KEY (created_by) REFERENCES users (id)
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS uk_setting_key ON line_settings (setting_key);
    CREATE INDEX IF NOT EXISTS idx_is_active_settings ON line_settings (is_active);
    `
    
    return db.Exec(sql).Error
}

func createLineUploadStatsTable(db *gorm.DB) error {
    sql := `
    CREATE TABLE IF NOT EXISTS line_upload_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stat_date DATE NOT NULL,
        stat_type VARCHAR(20) NOT NULL,
        line_user_id VARCHAR(100),
        line_group_id VARCHAR(100),
        upload_count INTEGER DEFAULT 0,
        file_size_total BIGINT DEFAULT 0,
        image_count INTEGER DEFAULT 0,
        video_count INTEGER DEFAULT 0,
        other_count INTEGER DEFAULT 0,
        active_users INTEGER DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS uk_stat_date_type_user 
        ON line_upload_stats (stat_date, stat_type, line_user_id, line_group_id);
    CREATE INDEX IF NOT EXISTS idx_stat_date ON line_upload_stats (stat_date DESC);
    CREATE INDEX IF NOT EXISTS idx_stat_type ON line_upload_stats (stat_type);
    CREATE INDEX IF NOT EXISTS idx_line_user_id_stats ON line_upload_stats (line_user_id);
    CREATE INDEX IF NOT EXISTS idx_line_group_id_stats ON line_upload_stats (line_group_id);
    CREATE INDEX IF NOT EXISTS idx_upload_count_stats ON line_upload_stats (upload_count DESC);
    `
    
    return db.Exec(sql).Error
}

func insertDefaultLineSettings(db *gorm.DB) error {
    defaultSettings := []struct {
        Key         string
        Value       string
        Type        string
        Description string
    }{
        {
            Key:         "line_auto_reply_enabled",
            Value:       "true",
            Type:        "boolean",
            Description: "是否啟用自動回覆功能",
        },
        {
            Key:         "line_upload_category_id",
            Value:       "1",
            Type:        "integer",
            Description: "LINE 上傳檔案的預設分類 ID",
        },
        {
            Key:         "line_max_file_size",
            Value:       "10485760",
            Type:        "integer",
            Description: "LINE 上傳檔案的最大大小 (bytes)",
        },
        {
            Key:         "line_allowed_file_types",
            Value:       "image/jpeg,image/png,image/gif,image/webp,video/mp4",
            Type:        "string",
            Description: "允許的檔案類型 MIME types",
        },
        {
            Key:         "line_welcome_message",
            Value:       "歡迎使用教會照片上傳服務！請直接傳送照片即可自動上傳。",
            Type:        "string",
            Description: "新用戶歡迎訊息",
        },
        {
            Key:         "line_upload_success_message",
            Value:       "✅ 照片上傳成功！感謝您的分享。",
            Type:        "string",
            Description: "上傳成功訊息範本",
        },
        {
            Key:         "line_upload_error_message",
            Value:       "❌ 上傳失敗，請稍後再試或聯繫管理員。",
            Type:        "string",
            Description: "上傳失敗訊息範本",
        },
    }
    
    for _, setting := range defaultSettings {
        sql := `
        INSERT OR IGNORE INTO line_settings 
        (setting_key, setting_value, setting_type, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, true, datetime('now'), datetime('now'))
        `
        
        if err := db.Exec(sql, setting.Key, setting.Value, setting.Type, setting.Description).Error; err != nil {
            return err
        }
    }
    
    return nil
}

// 回滾函數
func DropLineTables(db *gorm.DB) error {
    tables := []string{
        "line_upload_stats",
        "line_settings", 
        "line_webhook_logs",
        "line_group_members",
        "line_groups",
        "line_users",
        "line_upload_records",
    }
    
    for _, table := range tables {
        if err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", table)).Error; err != nil {
            return err
        }
    }
    
    return nil
}
```

## 🏗️ GORM 模型定義

### 完整模型檔案

```go
// backend/internal/models/line_models.go
package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

// LineUploadRecord LINE 上傳記錄
type LineUploadRecord struct {
    ID               string    `json:"id" gorm:"type:char(36);primaryKey"`
    FileID           uint      `json:"file_id" gorm:"not null;index"`
    LineUserId       string    `json:"line_user_id" gorm:"size:100;not null;index"`
    LineUserName     string    `json:"line_user_name" gorm:"size:255;not null"`
    LineMessageId    string    `json:"line_message_id" gorm:"size:100;not null;uniqueIndex"`
    LineGroupId      string    `json:"line_group_id,omitempty" gorm:"size:100;index"`
    LineGroupName    string    `json:"line_group_name,omitempty" gorm:"size:255"`
    MessageType      string    `json:"message_type" gorm:"size:20;default:image"`
    OriginalUrl      string    `json:"original_url,omitempty" gorm:"size:500"`
    DownloadStatus   string    `json:"download_status" gorm:"size:20;default:completed"`
    ErrorMessage     string    `json:"error_message,omitempty" gorm:"type:text"`
    RetryCount       int       `json:"retry_count" gorm:"default:0"`
    CreatedAt        time.Time `json:"created_at"`
    UpdatedAt        time.Time `json:"updated_at"`
    
    // 關聯
    File             File      `json:"file" gorm:"foreignKey:FileID;constraint:OnDelete:CASCADE"`
    LineUser         *LineUser `json:"lineUser,omitempty" gorm:"foreignKey:LineUserId;references:LineUserId"`
    LineGroup        *LineGroup `json:"lineGroup,omitempty" gorm:"foreignKey:LineGroupId;references:LineGroupId"`
}

func (l *LineUploadRecord) BeforeCreate(tx *gorm.DB) error {
    if l.ID == "" {
        l.ID = uuid.Must(uuid.NewV7()).String()
    }
    return nil
}

func (LineUploadRecord) TableName() string {
    return "line_upload_records"
}

// LineUser LINE 用戶
type LineUser struct {
    ID                   uint      `json:"id" gorm:"primaryKey"`
    LineUserId           string    `json:"line_user_id" gorm:"size:100;not null;uniqueIndex"`
    DisplayName          string    `json:"display_name" gorm:"size:255;not null"`
    PictureUrl           string    `json:"picture_url,omitempty" gorm:"size:500"`
    StatusMessage        string    `json:"status_message,omitempty" gorm:"type:text"`
    Language             string    `json:"language,omitempty" gorm:"size:10"`
    IsBlocked            bool      `json:"is_blocked" gorm:"default:false"`
    IsActive             bool      `json:"is_active" gorm:"default:true"`
    FirstInteractionAt   *time.Time `json:"first_interaction_at"`
    LastInteractionAt    *time.Time `json:"last_interaction_at"`
    TotalUploads         int       `json:"total_uploads" gorm:"default:0"`
    CreatedAt            time.Time `json:"created_at"`
    UpdatedAt            time.Time `json:"updated_at"`
    
    // 關聯
    UploadRecords        []LineUploadRecord `json:"uploadRecords,omitempty" gorm:"foreignKey:LineUserId;references:LineUserId"`
    GroupMemberships     []LineGroupMember  `json:"groupMemberships,omitempty" gorm:"foreignKey:LineUserId;references:LineUserId"`
}

func (LineUser) TableName() string {
    return "line_users"
}

// LineGroup LINE 群組
type LineGroup struct {
    ID                   uint      `json:"id" gorm:"primaryKey"`
    LineGroupId          string    `json:"line_group_id" gorm:"size:100;not null;uniqueIndex"`
    GroupName            string    `json:"group_name" gorm:"size:255;not null"`
    GroupType            string    `json:"group_type" gorm:"size:20;default:group"`
    IsActive             bool      `json:"is_active" gorm:"default:true"`
    MemberCount          int       `json:"member_count" gorm:"default:0"`
    TotalUploads         int       `json:"total_uploads" gorm:"default:0"`
    FirstInteractionAt   *time.Time `json:"first_interaction_at"`
    LastInteractionAt    *time.Time `json:"last_interaction_at"`
    CreatedAt            time.Time `json:"created_at"`
    UpdatedAt            time.Time `json:"updated_at"`
    
    // 關聯
    UploadRecords        []LineUploadRecord `json:"uploadRecords,omitempty" gorm:"foreignKey:LineGroupId;references:LineGroupId"`
    Members              []LineGroupMember  `json:"members,omitempty" gorm:"foreignKey:LineGroupId;references:LineGroupId"`
}

func (LineGroup) TableName() string {
    return "line_groups"
}

// LineGroupMember 群組成員關聯
type LineGroupMember struct {
    ID              uint      `json:"id" gorm:"primaryKey"`
    LineGroupId     string    `json:"line_group_id" gorm:"size:100;not null;index"`
    LineUserId      string    `json:"line_user_id" gorm:"size:100;not null;index"`
    Role            string    `json:"role" gorm:"size:20;default:member"`
    JoinDate        *time.Time `json:"join_date"`
    LeaveDate       *time.Time `json:"leave_date"`
    IsActive        bool      `json:"is_active" gorm:"default:true"`
    UploadCount     int       `json:"upload_count" gorm:"default:0"`
    LastUploadAt    *time.Time `json:"last_upload_at"`
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
    
    // 關聯
    LineUser        *LineUser  `json:"lineUser,omitempty" gorm:"foreignKey:LineUserId;references:LineUserId"`
    LineGroup       *LineGroup `json:"lineGroup,omitempty" gorm:"foreignKey:LineGroupId;references:LineGroupId"`
}

func (LineGroupMember) TableName() string {
    return "line_group_members"
}

// LineWebhookLog Webhook 日誌
type LineWebhookLog struct {
    ID                string    `json:"id" gorm:"type:char(36);primaryKey"`
    WebhookType       string    `json:"webhook_type" gorm:"size:50;not null"`
    LineUserId        string    `json:"line_user_id,omitempty" gorm:"size:100;index"`
    LineGroupId       string    `json:"line_group_id,omitempty" gorm:"size:100;index"`
    MessageId         string    `json:"message_id,omitempty" gorm:"size:100"`
    MessageType       string    `json:"message_type,omitempty" gorm:"size:20"`
    EventData         string    `json:"event_data,omitempty" gorm:"type:text"`
    ProcessingStatus  string    `json:"processing_status" gorm:"size:20;default:pending"`
    ProcessingTime    int       `json:"processing_time,omitempty"`
    ErrorMessage      string    `json:"error_message,omitempty" gorm:"type:text"`
    RetryCount        int       `json:"retry_count" gorm:"default:0"`
    CreatedAt         time.Time `json:"created_at"`
    UpdatedAt         time.Time `json:"updated_at"`
}

func (l *LineWebhookLog) BeforeCreate(tx *gorm.DB) error {
    if l.ID == "" {
        l.ID = uuid.Must(uuid.NewV7()).String()
    }
    return nil
}

func (LineWebhookLog) TableName() string {
    return "line_webhook_logs"
}

// LineSetting 設定
type LineSetting struct {
    ID           uint      `json:"id" gorm:"primaryKey"`
    SettingKey   string    `json:"setting_key" gorm:"size:100;not null;uniqueIndex"`
    SettingValue string    `json:"setting_value" gorm:"type:text"`
    SettingType  string    `json:"setting_type" gorm:"size:20;default:string"`
    Description  string    `json:"description" gorm:"type:text"`
    IsActive     bool      `json:"is_active" gorm:"default:true"`
    CreatedBy    *uint     `json:"created_by"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
    
    // 關聯
    Creator      *User     `json:"creator,omitempty" gorm:"foreignKey:CreatedBy"`
}

func (LineSetting) TableName() string {
    return "line_settings"
}

// LineUploadStat 上傳統計
type LineUploadStat struct {
    ID             uint      `json:"id" gorm:"primaryKey"`
    StatDate       time.Time `json:"stat_date" gorm:"type:date;not null"`
    StatType       string    `json:"stat_type" gorm:"size:20;not null"`
    LineUserId     string    `json:"line_user_id,omitempty" gorm:"size:100;index"`
    LineGroupId    string    `json:"line_group_id,omitempty" gorm:"size:100;index"`
    UploadCount    int       `json:"upload_count" gorm:"default:0"`
    FileSizeTotal  int64     `json:"file_size_total" gorm:"default:0"`
    ImageCount     int       `json:"image_count" gorm:"default:0"`
    VideoCount     int       `json:"video_count" gorm:"default:0"`
    OtherCount     int       `json:"other_count" gorm:"default:0"`
    ActiveUsers    int       `json:"active_users" gorm:"default:0"`
    CreatedAt      time.Time `json:"created_at"`
    UpdatedAt      time.Time `json:"updated_at"`
}

func (LineUploadStat) TableName() string {
    return "line_upload_stats"
}
```

## 📋 資料表關係圖

```
files (原有表)
  ↑
  │ (file_id)
  │
line_upload_records ──────┐
  ↑                      │
  │ (line_user_id)        │ (line_group_id)
  │                      ↓
line_users            line_groups
  ↑                      ↑
  │                      │
  └──── line_group_members ──┘
        (many-to-many 關聯)

line_webhook_logs (獨立日誌表)

line_settings (系統設定)

line_upload_stats (統計快取表)
```

## 🚀 部署檢查清單

### 1. 遷移前檢查

```bash
# 檢查資料庫連接
sqlite3 ./data/memoryark.db ".tables"

# 檢查現有 files 表結構
sqlite3 ./data/memoryark.db ".schema files"

# 備份資料庫
cp ./data/memoryark.db ./data/memoryark.db.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. 執行遷移

```bash
# 執行遷移
./memoryark migrate

# 檢查新表是否建立成功
sqlite3 ./data/memoryark.db ".tables" | grep line_
```

### 3. 驗證資料表

```sql
-- 檢查表結構
.schema line_upload_records
.schema line_users
.schema line_groups

-- 檢查索引
.indices line_upload_records

-- 檢查預設設定
SELECT * FROM line_settings;
```

現在資料庫設計就完整了！包含了完整的 7 張表、所有索引、外鍵約束和初始設定資料。