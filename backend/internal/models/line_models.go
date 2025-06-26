package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
	"memoryark/internal/utils"
)

// LineUploadRecord LINE 上傳記錄主表
type LineUploadRecord struct {
	ID             string    `json:"id" gorm:"type:char(36);primaryKey"`
	FileID         uint      `json:"file_id" gorm:"not null"`
	LineUserID     string    `json:"line_user_id" gorm:"type:varchar(100);not null;index"`
	LineUserName   string    `json:"line_user_name" gorm:"type:varchar(255);not null"`
	LineMessageID  string    `json:"line_message_id" gorm:"type:varchar(100);not null;uniqueIndex"`
	LineGroupID    *string   `json:"line_group_id" gorm:"type:varchar(100);index"`
	LineGroupName  *string   `json:"line_group_name" gorm:"type:varchar(255)"`
	MessageType    string    `json:"message_type" gorm:"type:varchar(20);default:'image';index"`
	OriginalURL    *string   `json:"original_url" gorm:"type:varchar(500)"`
	DownloadStatus string    `json:"download_status" gorm:"type:varchar(20);default:'completed'"`
	ErrorMessage   *string   `json:"error_message" gorm:"type:text"`
	RetryCount     int       `json:"retry_count" gorm:"default:0"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// 關聯
	File     *File     `json:"file,omitempty" gorm:"foreignKey:FileID;constraint:OnDelete:CASCADE"`
	LineUser *LineUser `json:"line_user,omitempty" gorm:"foreignKey:LineUserID;references:LineUserID"`
}

// BeforeCreate 在創建前生成 UUID v7
func (l *LineUploadRecord) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = utils.GenerateUUIDv7()
	}
	return nil
}

// LineUser LINE 用戶資訊表
type LineUser struct {
	ID                  uint      `json:"id" gorm:"primaryKey"`
	LineUserID          string    `json:"line_user_id" gorm:"type:varchar(100);not null;uniqueIndex"`
	DisplayName         string    `json:"display_name" gorm:"type:varchar(255);not null;index"`
	PictureURL          *string   `json:"picture_url" gorm:"type:varchar(500)"`
	StatusMessage       *string   `json:"status_message" gorm:"type:text"`
	Language            *string   `json:"language" gorm:"type:varchar(10)"`
	IsBlocked           bool      `json:"is_blocked" gorm:"default:false"`
	IsActive            bool      `json:"is_active" gorm:"default:true"`
	FirstInteractionAt  *time.Time `json:"first_interaction_at"`
	LastInteractionAt   *time.Time `json:"last_interaction_at" gorm:"index"`
	TotalUploads        int       `json:"total_uploads" gorm:"default:0;index"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`

	// 關聯
	UploadRecords []LineUploadRecord `json:"upload_records,omitempty" gorm:"foreignKey:LineUserID;references:LineUserID"`
	GroupMembers  []LineGroupMember  `json:"group_members,omitempty" gorm:"foreignKey:LineUserID;references:LineUserID"`
}

// LineGroup LINE 群組資訊表
type LineGroup struct {
	ID                 uint      `json:"id" gorm:"primaryKey"`
	LineGroupID        string    `json:"line_group_id" gorm:"type:varchar(100);not null;uniqueIndex"`
	GroupName          string    `json:"group_name" gorm:"type:varchar(255);not null;index"`
	GroupType          string    `json:"group_type" gorm:"type:varchar(20);default:'group'"`
	IsActive           bool      `json:"is_active" gorm:"default:true"`
	MemberCount        int       `json:"member_count" gorm:"default:0"`
	TotalUploads       int       `json:"total_uploads" gorm:"default:0;index"`
	FirstInteractionAt *time.Time `json:"first_interaction_at"`
	LastInteractionAt  *time.Time `json:"last_interaction_at" gorm:"index"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`

	// 關聯
	Members []LineGroupMember `json:"members,omitempty" gorm:"foreignKey:LineGroupID;references:LineGroupID"`
}

// LineGroupMember 群組成員關聯表
type LineGroupMember struct {
	ID            uint       `json:"id" gorm:"primaryKey"`
	LineGroupID   string     `json:"line_group_id" gorm:"type:varchar(100);not null;uniqueIndex:idx_group_user"`
	LineUserID    string     `json:"line_user_id" gorm:"type:varchar(100);not null;uniqueIndex:idx_group_user"`
	Role          string     `json:"role" gorm:"type:varchar(20);default:'member'"`
	JoinDate      *time.Time `json:"join_date"`
	LeaveDate     *time.Time `json:"leave_date"`
	IsActive      bool       `json:"is_active" gorm:"default:true;index"`
	UploadCount   int        `json:"upload_count" gorm:"default:0;index"`
	LastUploadAt  *time.Time `json:"last_upload_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	// 關聯
	LineGroup *LineGroup `json:"line_group,omitempty" gorm:"foreignKey:LineGroupID;references:LineGroupID"`
	LineUser  *LineUser  `json:"line_user,omitempty" gorm:"foreignKey:LineUserID;references:LineUserID"`
}

// LineWebhookLog Webhook 日誌表
type LineWebhookLog struct {
	ID                string         `json:"id" gorm:"type:char(36);primaryKey"`
	WebhookType       string         `json:"webhook_type" gorm:"type:varchar(50);not null;index"`
	LineUserID        *string        `json:"line_user_id" gorm:"type:varchar(100);index"`
	LineGroupID       *string        `json:"line_group_id" gorm:"type:varchar(100)"`
	MessageID         *string        `json:"message_id" gorm:"type:varchar(100);index"`
	MessageType       *string        `json:"message_type" gorm:"type:varchar(20)"`
	EventData         JSONMap        `json:"event_data" gorm:"type:json"`
	ProcessingStatus  string         `json:"processing_status" gorm:"type:varchar(20);default:'pending';index"`
	ProcessingTime    *int           `json:"processing_time"` // 毫秒
	ErrorMessage      *string        `json:"error_message" gorm:"type:text"`
	RetryCount        int            `json:"retry_count" gorm:"default:0;index"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

// BeforeCreate 在創建前生成 UUID v7
func (l *LineWebhookLog) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = utils.GenerateUUIDv7()
	}
	return nil
}

// LineSetting LINE 機器人設定表
type LineSetting struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	SettingKey   string    `json:"setting_key" gorm:"type:varchar(100);not null;uniqueIndex"`
	SettingValue *string   `json:"setting_value" gorm:"type:text"`
	SettingType  string    `json:"setting_type" gorm:"type:varchar(20);default:'string'"`
	Description  *string   `json:"description" gorm:"type:text"`
	IsActive     bool      `json:"is_active" gorm:"default:true;index"`
	CreatedBy    *uint     `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	// 關聯
	Creator *User `json:"creator,omitempty" gorm:"foreignKey:CreatedBy"`
}

// LineUploadStat 上傳統計表
type LineUploadStat struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	StatDate       time.Time `json:"stat_date" gorm:"type:date;not null;index"`
	StatType       string    `json:"stat_type" gorm:"type:varchar(20);not null;index"`
	LineUserID     *string   `json:"line_user_id" gorm:"type:varchar(100);index"`
	LineGroupID    *string   `json:"line_group_id" gorm:"type:varchar(100);index"`
	UploadCount    int       `json:"upload_count" gorm:"default:0;index"`
	FileSizeTotal  int64     `json:"file_size_total" gorm:"default:0"`
	ImageCount     int       `json:"image_count" gorm:"default:0"`
	VideoCount     int       `json:"video_count" gorm:"default:0"`
	OtherCount     int       `json:"other_count" gorm:"default:0"`
	ActiveUsers    int       `json:"active_users" gorm:"default:0"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// JSONMap 自定義 JSON 類型，用於存儲 JSON 數據
type JSONMap map[string]interface{}

// Scan 實現 sql.Scanner 接口
func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONMap)
		return nil
	}
	
	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, j)
	case string:
		return json.Unmarshal([]byte(v), j)
	default:
		return json.Unmarshal([]byte{}, j)
	}
}

// Value 實現 driver.Valuer 接口
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// TableName 定義表名（可選，如果表名與結構體名稱的複數形式不同）
func (LineUploadRecord) TableName() string {
	return "line_upload_records"
}

func (LineUser) TableName() string {
	return "line_users"
}

func (LineGroup) TableName() string {
	return "line_groups"
}

func (LineGroupMember) TableName() string {
	return "line_group_members"
}

func (LineWebhookLog) TableName() string {
	return "line_webhook_logs"
}

func (LineSetting) TableName() string {
	return "line_settings"
}

func (LineUploadStat) TableName() string {
	return "line_upload_stats"
}