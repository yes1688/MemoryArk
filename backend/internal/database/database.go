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
	// 首先執行 SQL 遷移腳本
	if err := RunMigrations(db); err != nil {
		log.Printf("Warning: SQL migrations failed: %v", err)
	}

	// 然後執行 GORM AutoMigrate 確保所有模型同步
	if err := db.AutoMigrate(
		&models.User{},
		&models.UserRegistrationRequest{},
		&models.File{},
		&models.Category{},
		&models.ExportJob{},
		&models.FileShare{},
		&models.ActivityLog{},
		&models.ChunkSession{},
	); err != nil {
		return err
	}

	// 為現有檔案填充虛擬路徑
	if err := PopulateVirtualPaths(db); err != nil {
		log.Printf("Warning: Failed to populate virtual paths: %v", err)
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
