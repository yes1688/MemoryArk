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
	RejectionHistory string        `json:"rejection_history" gorm:"type:text"` // 保存歷史拒絕原因
	
	// 關聯
	ProcessedByUser *User          `json:"processed_by_user,omitempty" gorm:"foreignKey:ProcessedBy"`
}

// File 檔案模型 - 擴展支援純虛擬路徑架構
type File struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	Name          string         `json:"name" gorm:"size:255;not null"`
	OriginalName  string         `json:"originalName" gorm:"size:255;not null"`
	FilePath      string         `json:"filePath" gorm:"size:500;not null"` // 實體檔案路徑（UUID檔名）
	VirtualPath   string         `json:"virtualPath" gorm:"size:1000;index"` // 虛擬路徑
	SHA256Hash    string         `json:"sha256Hash" gorm:"size:64;index"` // 檔案雜湊值（去重用）
	FileSize      int64          `json:"size" gorm:"not null"`
	MimeType      string         `json:"mimeType" gorm:"size:100"`
	ThumbnailURL  string         `json:"thumbnailUrl" gorm:"size:500"` // 縮圖URL
	ParentID      *uint          `json:"parentId"`
	CategoryID    *uint          `json:"categoryId" gorm:"index"` // 分類ID
	UploadedBy    uint           `json:"uploadedBy" gorm:"not null"`
	DownloadCount int            `json:"downloadCount" gorm:"default:0"`
	IsDirectory   bool           `json:"isDirectory" gorm:"default:false"`
	IsDeleted     bool           `json:"isDeleted" gorm:"default:false"`
	DeletedAt     *time.Time     `json:"deletedAt"`
	DeletedBy     *uint          `json:"deletedBy"`
	
	// 教會特色欄位
	Description   string         `json:"description" gorm:"type:text"`
	Tags          string         `json:"tags" gorm:"size:500"`
	ContentType   string         `json:"contentType" gorm:"size:100"` // 內容類型
	Speaker       string         `json:"speaker" gorm:"size:255"` // 講員
	SermonTitle   string         `json:"sermonTitle" gorm:"size:500"` // 講道標題
	BibleReference string        `json:"bibleReference" gorm:"size:255"` // 經文參考
	LikeCount     int            `json:"likeCount" gorm:"default:0"` // 按讚數
	
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	
	// 關聯
	Parent        *File          `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Category      *Category      `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Uploader      User           `json:"uploader" gorm:"foreignKey:UploadedBy"`
	DeletedByUser *User          `json:"deletedByUser,omitempty" gorm:"foreignKey:DeletedBy"`
}

// Category 分類模型 - 支援檔案分類管理
type Category struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"size:255;not null;uniqueIndex"`
	Description string    `json:"description" gorm:"type:text"`
	Color       string    `json:"color" gorm:"size:20"` // 分類顏色
	Icon        string    `json:"icon" gorm:"size:100"` // 分類圖示
	SortOrder   int       `json:"sort_order" gorm:"default:0"` // 排序順序
	IsActive    bool      `json:"is_active" gorm:"default:true"` // 是否啟用
	CreatedBy   uint      `json:"created_by" gorm:"not null"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	
	// 關聯
	Creator     User      `json:"creator" gorm:"foreignKey:CreatedBy"`
	Files       []File    `json:"files,omitempty" gorm:"foreignKey:CategoryID"`
}

// ExportJob 匯出任務模型 - 支援串流匯出追蹤
type ExportJob struct {
	ID                  uint      `json:"id" gorm:"primaryKey"`
	JobID               string    `json:"job_id" gorm:"size:100;uniqueIndex;not null"`
	UserID              uint      `json:"user_id" gorm:"not null"`
	Status              string    `json:"status" gorm:"size:20;default:pending"` // pending, processing, completed, failed
	Progress            int       `json:"progress" gorm:"default:0"` // 0-100
	TotalFiles          int       `json:"total_files" gorm:"default:0"`
	ProcessedFiles      int       `json:"processed_files" gorm:"default:0"`
	TotalSize           int64     `json:"total_size" gorm:"default:0"`
	ProcessedSize       int64     `json:"processed_size" gorm:"default:0"`
	ExportFormat        string    `json:"export_format" gorm:"size:10;default:zip"` // zip, tar
	DownloadPath        string    `json:"download_path" gorm:"size:500"`
	Error               string    `json:"error" gorm:"type:text"`
	EstimatedCompletion *time.Time `json:"estimated_completion"`
	CompletedAt         *time.Time `json:"completed_at"`
	ExpiresAt           *time.Time `json:"expires_at"` // 下載連結過期時間
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
	
	// 關聯
	User                User      `json:"user" gorm:"foreignKey:UserID"`
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

func (Category) TableName() string {
	return "categories"
}

func (ExportJob) TableName() string {
	return "export_jobs"
}
