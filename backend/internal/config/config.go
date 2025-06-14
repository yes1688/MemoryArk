package config

import (
	"os"
	"strconv"
	
	"github.com/joho/godotenv"
)

// Config 應用配置結構
type Config struct {
	Server    ServerConfig
	Database  DatabaseConfig
	Auth      AuthConfig
	Upload    UploadConfig
	Storage   StorageConfig
	Cloudflare CloudflareConfig
	Admin     AdminConfig
	Development DevelopmentConfig
	Features  FeatureConfig
}

// ServerConfig 服務器配置
type ServerConfig struct {
	Port    string
	Mode    string
	Host    string
}

// DatabaseConfig 數據庫配置
type DatabaseConfig struct {
	Path string
}

// AuthConfig 認證配置
type AuthConfig struct {
	JWTSecret     string
	TokenExpiry   int
	RefreshExpiry int
}

// UploadConfig 上傳配置
type UploadConfig struct {
	MaxFileSize  int64
	AllowedTypes []string
	UploadPath   string
}

// StorageConfig 儲存空間配置
type StorageConfig struct {
	TotalCapacity int64 // 總容量（字節）
}

// CloudflareConfig Cloudflare 配置
type CloudflareConfig struct {
	Domain       string
	ClientID     string
	ClientSecret string
	Enabled      bool
}

// AdminConfig 管理員配置
type AdminConfig struct {
	RootEmail string
	RootName  string
}

// DevelopmentConfig 開發者模式配置
type DevelopmentConfig struct {
	Enabled         bool
	AutoLoginEmail  string
	BypassAuth      bool
	CORSEnabled     bool
}

// FeatureConfig 功能模組配置
type FeatureConfig struct {
	EnableSharedResources bool // 啟用共享資源功能
	EnableSabbathData     bool // 啟用安息日資料功能
}

// Load 載入配置
func Load() (*Config, error) {
	// 載入 .env 文件（如果存在）
	_ = godotenv.Load()
	
	config := &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8081"),
			Mode: getEnv("GIN_MODE", "debug"),
			Host: getEnv("HOST", "0.0.0.0"),
		},
		Database: DatabaseConfig{
			Path: getEnv("DATABASE_PATH", "./data/memoryark.db"),
		},
		Auth: AuthConfig{
			JWTSecret:     getEnv("JWT_SECRET", "memoryark-secret-key"),
			TokenExpiry:   getEnvInt("TOKEN_EXPIRY", 24),
			RefreshExpiry: getEnvInt("REFRESH_EXPIRY", 168),
		},
		Upload: UploadConfig{
			MaxFileSize:  getEnvInt64("MAX_FILE_SIZE", 100*1024*1024), // 100MB
			AllowedTypes: []string{".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mp3", ".wav", ".pdf", ".doc", ".docx"},
			UploadPath:   getEnv("UPLOAD_PATH", "./uploads"),
		},
		Storage: StorageConfig{
			TotalCapacity: getEnvInt64("TOTAL_STORAGE_CAPACITY", 10*1024*1024*1024), // 10GB 默認
		},
		Cloudflare: CloudflareConfig{
			Domain:       getEnv("CLOUDFLARE_DOMAIN", ""),
			ClientID:     getEnv("CLOUDFLARE_CLIENT_ID", ""),
			ClientSecret: getEnv("CLOUDFLARE_CLIENT_SECRET", ""),
			Enabled:      getEnvBool("CLOUDFLARE_ENABLED", false),
		},
		Admin: AdminConfig{
			RootEmail: getEnv("ROOT_ADMIN_EMAIL", ""),
			RootName:  getEnv("ROOT_ADMIN_NAME", "系統管理員"),
		},
		Development: DevelopmentConfig{
			Enabled:        getEnvBool("DEVELOPMENT_MODE", false),
			AutoLoginEmail: getEnv("DEV_AUTO_LOGIN_EMAIL", ""),
			BypassAuth:     getEnvBool("DEV_BYPASS_AUTH", false),
			CORSEnabled:    getEnvBool("DEV_CORS_ENABLED", false),
		},
		Features: FeatureConfig{
			EnableSharedResources: getEnvBool("ENABLE_SHARED_RESOURCES", false),
			EnableSabbathData:     getEnvBool("ENABLE_SABBATH_DATA", false),
		},
	}
	
	return config, nil
}

// getEnv 獲取環境變量，如果不存在則返回默認值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvInt 獲取整數環境變量
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvInt64 獲取 int64 環境變量
func getEnvInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvBool 獲取布爾環境變量
func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
