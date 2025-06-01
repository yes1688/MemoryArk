package logger

import (
	"log"
	"os"
	"path/filepath"
)

// Init 初始化日誌
func Init() {
	// 確保日誌目錄存在
	logDir := "./logs"
	if err := os.MkdirAll(logDir, 0755); err != nil {
		log.Printf("Failed to create log directory: %v", err)
		return
	}
	
	// 創建日誌文件
	logFile := filepath.Join(logDir, "memoryark.log")
	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Printf("Failed to open log file: %v", err)
		return
	}
	
	// 設置日誌輸出到文件和控制台
	log.SetOutput(file)
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	
	log.Println("Logger initialized")
}

// Error 記錄錯誤日誌
func Error(msg string, args ...interface{}) {
	log.Printf("[ERROR] "+msg, args...)
}

// Warn 記錄警告日誌
func Warn(msg string, args ...interface{}) {
	log.Printf("[WARN] "+msg, args...)
}

// Info 記錄信息日誌
func Info(msg string, args ...interface{}) {
	log.Printf("[INFO] "+msg, args...)
}

// Debug 記錄調試日誌
func Debug(msg string, args ...interface{}) {
	log.Printf("[DEBUG] "+msg, args...)
}

// LogActivity 記錄活動日誌（稍後會整合到數據庫）
func LogActivity(userID *uint, action, resource string, resourceID *uint, details string) {
	log.Printf("Activity: UserID=%v, Action=%s, Resource=%s, ResourceID=%v, Details=%s", 
		userID, action, resource, resourceID, details)
}
