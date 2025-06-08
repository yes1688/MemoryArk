package main

import (
	"crypto/md5"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// File 檔案模型（簡化版）
type File struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id"`
	Filename     string    `json:"filename"`
	OriginalName string    `json:"original_name"`
	FilePath     string    `json:"file_path"`
	FileSize     int64     `json:"file_size"`
	MimeType     string    `json:"mime_type"`
	MD5Hash      string    `json:"md5_hash"`
	CategoryID   *uint     `json:"category_id"`
	ParentID     *uint     `json:"parent_id"`
	IsDirectory  bool      `json:"is_directory"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func main() {
	// 連接資料庫
	db, err := gorm.Open(sqlite.Open("../data/memoryark.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("連接資料庫失敗:", err)
	}

	// 掃描上傳目錄
	uploadsPath := "../../uploads/files"
	userID := uint(1) // 預設用戶ID，可以根據需要修改

	err = filepath.Walk(uploadsPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 跳過根目錄
		if path == uploadsPath {
			return nil
		}

		// 計算相對路徑
		relPath, _ := filepath.Rel(uploadsPath, path)
		
		// 檢查是否已存在
		var existingFile File
		result := db.Where("file_path = ?", path).First(&existingFile)
		if result.Error == nil {
			fmt.Printf("檔案已存在: %s\n", relPath)
			return nil
		}

		// 創建新記錄
		file := File{
			UserID:       userID,
			Filename:     info.Name(),
			OriginalName: info.Name(),
			FilePath:     path,
			FileSize:     info.Size(),
			IsDirectory:  info.IsDir(),
			CreatedAt:    info.ModTime(),
			UpdatedAt:    time.Now(),
		}

		// 如果是檔案，計算額外資訊
		if !info.IsDir() {
			// 計算 MD5
			fileData, err := os.ReadFile(path)
			if err == nil {
				file.MD5Hash = fmt.Sprintf("%x", md5.Sum(fileData))
			}

			// 判斷 MIME 類型
			ext := strings.ToLower(filepath.Ext(info.Name()))
			switch ext {
			case ".jpg", ".jpeg", ".png", ".gif":
				file.MimeType = "image/*"
			case ".mp4", ".avi", ".mov":
				file.MimeType = "video/*"
			case ".mp3", ".wav", ".flac":
				file.MimeType = "audio/*"
			case ".pdf":
				file.MimeType = "application/pdf"
			case ".doc", ".docx":
				file.MimeType = "application/msword"
			default:
				file.MimeType = "application/octet-stream"
			}

			// 根據目錄結構設定分類
			if strings.Contains(path, "安息日") || strings.Contains(path, "sabbath") {
				categoryID := uint(1) // 安息日分類
				file.CategoryID = &categoryID
			}
		}

		// 儲存到資料庫
		if err := db.Create(&file).Error; err != nil {
			fmt.Printf("儲存失敗 %s: %v\n", relPath, err)
		} else {
			fmt.Printf("已同步: %s\n", relPath)
		}

		return nil
	})

	if err != nil {
		log.Fatal("掃描目錄失敗:", err)
	}

	fmt.Println("檔案同步完成！")
}