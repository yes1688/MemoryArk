package models

import (
	"time"
	"gorm.io/gorm"
)

// User 用戶模型 - 按照規格書定義
type User struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	Email        string         `json:"email" gorm:"uniqueIndex;size:255;not null"`
	Name         string         `json:"name" gorm:"size:255;not null"`
	Phone        string         `json:"phone" gorm:"size:20"`
	Role         string         `json:"role" gorm:"size:20;default:user"` // admin, user
	Status       string         `json:"status" gorm:"size:20;default:pending"` // pending, approved, rejected, suspended
	AvatarURL    string         `json:"avatar_url" gorm:"size:500"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	LastLoginAt  *time.Time     `json:"last_login_at"`
	ApprovedBy   *uint          `json:"approved_by"`
	ApprovedAt   *time.Time     `json:"approved_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
	
	// 關聯
	Approver     *User          `json:"approver,omitempty" gorm:"foreignKey:ApprovedBy"`
}

// UserRegistrationRequest 用戶註冊申請模型 - 按照規格書定義
type UserRegistrationRequest struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	Email           string         `json:"email" gorm:"uniqueIndex;size:255;not null"`
	Name            string         `json:"name" gorm:"size:255;not null"`
	Phone           string         `json:"phone" gorm:"size:20"`
	Status          string         `json:"status" gorm:"size:20;default:pending"` // pending, approved, rejected
	CreatedAt       time.Time      `json:"created_at"`
	ProcessedAt     *time.Time     `json:"processed_at"`
	ProcessedBy     *uint          `json:"processed_by"`
	RejectionReason string         `json:"rejection_reason" gorm:"type:text"`
	
	// 關聯
	ProcessedByUser *User          `json:"processed_by_user,omitempty" gorm:"foreignKey:ProcessedBy"`
}

// File 檔案模型 - 按照規格書定義
type File struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	Name         string         `json:"name" gorm:"size:255;not null"`
	OriginalName string         `json:"original_name" gorm:"size:255;not null"`
	FilePath     string         `json:"file_path" gorm:"size:500;not null"`
	FileSize     int64          `json:"file_size" gorm:"not null"`
	MimeType     string         `json:"mime_type" gorm:"size:100"`
	ParentID     *uint          `json:"parent_id"`
	UploadedBy   uint           `json:"uploaded_by" gorm:"not null"`
	IsDirectory  bool           `json:"is_directory" gorm:"default:false"`
	IsDeleted    bool           `json:"is_deleted" gorm:"default:false"`
	DeletedAt    *time.Time     `json:"deleted_at"`
	DeletedBy    *uint          `json:"deleted_by"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	
	// 關聯
	Parent       *File          `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Uploader     User           `json:"uploader" gorm:"foreignKey:UploadedBy"`
	DeletedByUser *User         `json:"deleted_by_user,omitempty" gorm:"foreignKey:DeletedBy"`
}

// FileShare 檔案分享模型 - 按照規格書定義
type FileShare struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	FileID        uint      `json:"file_id" gorm:"not null"`
	SharedBy      uint      `json:"shared_by" gorm:"not null"`
	ShareToken    string    `json:"share_token" gorm:"uniqueIndex;size:255;not null"`
	ExpiresAt     *time.Time `json:"expires_at"`
	DownloadCount int       `json:"download_count" gorm:"default:0"`
	MaxDownloads  *int      `json:"max_downloads"`
	CreatedAt     time.Time `json:"created_at"`
	
	// 關聯
	File          File      `json:"file" gorm:"foreignKey:FileID"`
	SharedByUser  User      `json:"shared_by_user" gorm:"foreignKey:SharedBy"`
}

// ActivityLog 操作記錄模型 - 按照規格書定義
type ActivityLog struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id" gorm:"not null"`
	Action       string    `json:"action" gorm:"size:50;not null"`
	ResourceType string    `json:"resource_type" gorm:"size:50;not null"`
	ResourceID   *uint     `json:"resource_id"`
	Details      string    `json:"details" gorm:"type:text"`
	IPAddress    string    `json:"ip_address" gorm:"size:45"`
	CreatedAt    time.Time `json:"created_at"`
	
	// 關聯
	User         User      `json:"user" gorm:"foreignKey:UserID"`
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

func (FileShare) TableName() string {
	return "file_shares"
}

func (ActivityLog) TableName() string {
	return "activity_logs"
}
