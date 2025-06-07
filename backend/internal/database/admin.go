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

	// 檢查是否已存在管理員
	var adminCount int64
	if err := db.Model(&models.User{}).Where("role = ?", "admin").Count(&adminCount).Error; err != nil {
		return err
	}

	// 如果已有管理員，跳過
	if adminCount > 0 {
		return nil
	}

	// 檢查用戶是否已存在
	var existingUser models.User
	if err := db.Where("email = ?", cfg.Admin.RootEmail).First(&existingUser).Error; err == nil {
		// 用戶存在，更新為管理員
		existingUser.Role = "admin"
		existingUser.Status = "approved"
		existingUser.UpdatedAt = time.Now()
		return db.Save(&existingUser).Error
	}

	// 創建新的根管理員
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