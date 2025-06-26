package database

import (
	"log"
	"os"
	"path/filepath"
	
	"gorm.io/gorm"
	"github.com/glebarez/sqlite"
	"memoryark/internal/models"
)

// Initialize 初始化數據庫
func Initialize(dbPath string) (*gorm.DB, error) {
	// 確保數據庫目錄存在
	dbDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, err
	}
	
	// 連接數據庫
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	
	// 自動遷移
	if err := autoMigrate(db); err != nil {
		return nil, err
	}
	
	// 創建默認管理員用戶
	if err := createDefaultAdmin(db); err != nil {
		log.Printf("Warning: Failed to create default admin: %v", err)
	}
	
	log.Println("Database initialized successfully")
	return db, nil
}

// autoMigrate 自動遷移數據庫表
func autoMigrate(db *gorm.DB) error {
	// 統一使用 GORM AutoMigrate 處理所有模型
	if err := db.AutoMigrate(
		&models.User{},
		&models.UserRegistrationRequest{},
		&models.File{},
		&models.Category{},
		&models.ExportJob{},
		&models.FileShare{},
		&models.ActivityLog{},
		&models.ChunkSession{},
		// LINE 功能相關模型
		&models.LineUploadRecord{},
		&models.LineUser{},
		&models.LineGroup{},
		&models.LineGroupMember{},
		&models.LineWebhookLog{},
		&models.LineSetting{},
		&models.LineUploadStat{},
	); err != nil {
		return err
	}

	// 為現有檔案填充虛擬路徑
	if err := PopulateVirtualPaths(db); err != nil {
		log.Printf("Warning: Failed to populate virtual paths: %v", err)
	}

	// 初始化 LINE 設定
	if err := initializeLineSettings(db); err != nil {
		log.Printf("Warning: Failed to initialize LINE settings: %v", err)
	}

	return nil
}

// createDefaultAdmin 創建默認管理員用戶
func createDefaultAdmin(db *gorm.DB) error {
	var count int64
	db.Model(&models.User{}).Where("role = ?", "admin").Count(&count)
	
	// 如果已有管理員，則跳過
	if count > 0 {
		return nil
	}
	
	// 從環境變數讀取管理員資訊
	adminEmail := os.Getenv("ROOT_ADMIN_EMAIL")
	adminName := os.Getenv("ROOT_ADMIN_NAME")
	
	// 如果沒有設定管理員信箱，跳過建立預設管理員
	if adminEmail == "" {
		log.Printf("Warning: ROOT_ADMIN_EMAIL not set, no default admin will be created")
		log.Printf("Hint: Set ROOT_ADMIN_EMAIL in .env file to create an admin user")
		return nil
	}
	
	// 設定預設名稱（如果沒有提供）
	if adminName == "" {
		adminName = "系統管理員"
	}
	
	log.Printf("Creating default admin user: %s", adminEmail)
	admin := models.User{
		Email:  adminEmail,
		Name:   adminName,
		Role:   "admin",
		Status: "approved",
	}
	
	return db.Create(&admin).Error
}

// GetDB 獲取數據庫實例的輔助函數
var dbInstance *gorm.DB

func SetDB(db *gorm.DB) {
	dbInstance = db
}

func GetDB() *gorm.DB {
	return dbInstance
}

// initializeLineSettings 初始化 LINE 預設設定
func initializeLineSettings(db *gorm.DB) error {
	// 檢查是否已有設定
	var count int64
	db.Model(&models.LineSetting{}).Count(&count)
	
	if count > 0 {
		return nil // 已有設定，跳過初始化
	}
	
	log.Println("Initializing LINE default settings...")
	
	defaultSettings := []models.LineSetting{
		{SettingKey: "auto_download_enabled", SettingValue: stringPtr("true"), SettingType: "boolean", Description: stringPtr("是否自動下載 LINE 上傳的照片")},
		{SettingKey: "download_timeout", SettingValue: stringPtr("30"), SettingType: "integer", Description: stringPtr("下載逾時時間（秒）")},
		{SettingKey: "max_retry_count", SettingValue: stringPtr("3"), SettingType: "integer", Description: stringPtr("下載失敗最大重試次數")},
		{SettingKey: "allowed_file_types", SettingValue: stringPtr("image/jpeg,image/png,image/gif,image/webp"), SettingType: "string", Description: stringPtr("允許的檔案類型")},
		{SettingKey: "max_file_size", SettingValue: stringPtr("52428800"), SettingType: "integer", Description: stringPtr("最大檔案大小（bytes）- 預設 50MB")},
		{SettingKey: "webhook_verification_enabled", SettingValue: stringPtr("true"), SettingType: "boolean", Description: stringPtr("是否啟用 Webhook 簽名驗證")},
		{SettingKey: "rate_limit_per_minute", SettingValue: stringPtr("100"), SettingType: "integer", Description: stringPtr("每分鐘 API 請求限制")},
		{SettingKey: "stat_aggregation_enabled", SettingValue: stringPtr("true"), SettingType: "boolean", Description: stringPtr("是否啟用統計數據聚合")},
		{SettingKey: "stat_retention_days", SettingValue: stringPtr("365"), SettingType: "integer", Description: stringPtr("統計數據保留天數")},
	}
	
	for _, setting := range defaultSettings {
		if err := db.Create(&setting).Error; err != nil {
			return err
		}
	}
	
	log.Println("LINE default settings initialized successfully")
	return nil
}

// stringPtr 輔助函數，返回字串指標
func stringPtr(s string) *string {
	return &s
}
