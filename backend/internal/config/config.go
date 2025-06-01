package config

import (
	"os"
	"strconv"
)

// Config 應用配置結構
type Config struct {
	Server    ServerConfig
	Database  DatabaseConfig
	Auth      AuthConfig
	Upload    UploadConfig
	Cloudflare CloudflareConfig
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

// CloudflareConfig Cloudflare 配置
type CloudflareConfig struct {
	Domain       string
	ClientID     string
	ClientSecret string
	Enabled      bool
}

// Load 載入配置
func Load() (*Config, error) {
	config := &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "7001"),
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
		Cloudflare: CloudflareConfig{
			Domain:       getEnv("CLOUDFLARE_DOMAIN", ""),
			ClientID:     getEnv("CLOUDFLARE_CLIENT_ID", ""),
			ClientSecret: getEnv("CLOUDFLARE_CLIENT_SECRET", ""),
			Enabled:      getEnvBool("CLOUDFLARE_ENABLED", false),
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
