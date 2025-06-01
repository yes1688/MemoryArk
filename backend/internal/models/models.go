package models

import (
	"time"
	"gorm.io/gorm"
)

// User 用戶模型
type User struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Email       string    `json:"email" gorm:"unique;not null"`
	Name        string    `json:"name" gorm:"not null"`
	Role        string    `json:"role" gorm:"default:user"` // admin, user
	Status      string    `json:"status" gorm:"default:pending"` // pending, approved, rejected
	Avatar      string    `json:"avatar"`
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// UserRegistrationRequest 用戶註冊申請模型
type UserRegistrationRequest struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Email        string    `json:"email" gorm:"unique;not null"`
	Name         string    `json:"name" gorm:"not null"`
	Reason       string    `json:"reason"`
	Status       string    `json:"status" gorm:"default:pending"` // pending, approved, rejected
	ReviewedBy   *uint     `json:"reviewed_by"`
	ReviewedAt   *time.Time `json:"reviewed_at"`
	ReviewNote   string    `json:"review_note"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	
	// 關聯
	Reviewer     *User     `json:"reviewer,omitempty" gorm:"foreignKey:ReviewedBy"`
}

// File 文件模型
type File struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Name         string    `json:"name" gorm:"not null"`
	OriginalName string    `json:"original_name" gorm:"not null"`
	Path         string    `json:"path" gorm:"not null"`
	Size         int64     `json:"size"`
	MimeType     string    `json:"mime_type"`
	Category     string    `json:"category"` // audio, video, image, document
	Description  string    `json:"description"`
	Tags         string    `json:"tags"` // JSON array as string
	Thumbnail    string    `json:"thumbnail"`
	Duration     *float64  `json:"duration,omitempty"` // 音頻/視頻時長
	Metadata     string    `json:"metadata"` // JSON metadata
	UploadedBy   uint      `json:"uploaded_by"`
	IsPublic     bool      `json:"is_public" gorm:"default:false"`
	DownloadCount int      `json:"download_count" gorm:"default:0"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
	
	// 關聯
	Uploader     User      `json:"uploader" gorm:"foreignKey:UploadedBy"`
}

// MediaTask 媒體處理任務模型
type MediaTask struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	FileID      uint      `json:"file_id" gorm:"not null"`
	TaskType    string    `json:"task_type" gorm:"not null"` // thumbnail, convert, compress
	Status      string    `json:"status" gorm:"default:pending"` // pending, processing, completed, failed
	Progress    int       `json:"progress" gorm:"default:0"`
	InputPath   string    `json:"input_path"`
	OutputPath  string    `json:"output_path"`
	Parameters  string    `json:"parameters"` // JSON parameters
	Error       string    `json:"error"`
	StartedAt   *time.Time `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	
	// 關聯
	File        File      `json:"file" gorm:"foreignKey:FileID"`
}

// ActivityLog 活動日誌模型
type ActivityLog struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	UserID     *uint     `json:"user_id"`
	Action     string    `json:"action" gorm:"not null"`
	Resource   string    `json:"resource"` // file, user, system
	ResourceID *uint     `json:"resource_id"`
	Details    string    `json:"details"` // JSON details
	IPAddress  string    `json:"ip_address"`
	UserAgent  string    `json:"user_agent"`
	CreatedAt  time.Time `json:"created_at"`
	
	// 關聯
	User       *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}

func (UserRegistrationRequest) TableName() string {
	return "user_registration_requests"
}

func (File) TableName() string {
	return "files"
}

func (MediaTask) TableName() string {
	return "media_tasks"
}

func (ActivityLog) TableName() string {
	return "activity_logs"
}
