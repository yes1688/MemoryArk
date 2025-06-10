package database

import (
	"gorm.io/gorm"
	"memoryark/internal/config"
	"memoryark/internal/models"
	"time"
)

// InitializeRootAdmin 初始化根管理員
func InitializeRootAdmin(db *gorm.DB, cfg *config.Config) error {
	// 如果沒有設定根管理員信箱，跳過
	if cfg.Admin.RootEmail == "" {
		return nil
	}

	// 首先檢查 ROOT_ADMIN_EMAIL 對應的用戶是否已存在
	var existingUser models.User
	if err := db.Where("email = ?", cfg.Admin.RootEmail).First(&existingUser).Error; err == nil {
		// 用戶存在，確保他是管理員
		if existingUser.Role != "admin" {
			existingUser.Role = "admin"
			existingUser.Status = "approved"
			existingUser.UpdatedAt = time.Now()
			return db.Save(&existingUser).Error
		}
		// 用戶已經是管理員，無需操作
		return nil
	}

	// 用戶不存在，檢查是否已有其他管理員
	var adminCount int64
	if err := db.Model(&models.User{}).Where("role = ?", "admin").Count(&adminCount).Error; err != nil {
		return err
	}

	// 如果已有管理員，且 ROOT_ADMIN_EMAIL 用戶不存在，則創建新的根管理員
	// 如果沒有任何管理員，也創建根管理員
	rootAdmin := models.User{
		Email:     cfg.Admin.RootEmail,
		Name:      cfg.Admin.RootName,
		Role:      "admin",
		Status:    "approved",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	return db.Create(&rootAdmin).Error
}