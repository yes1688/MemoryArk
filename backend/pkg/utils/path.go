package utils

import (
	"fmt"
	"os"
	"path/filepath"
)

// NormalizePath 正規化上傳路徑
func NormalizePath(configPath string) string {
	// 如果是相對路徑，轉換為絕對路徑
	if !filepath.IsAbs(configPath) {
		if wd, err := os.Getwd(); err == nil {
			absPath := filepath.Join(wd, configPath)
			fmt.Printf("[NormalizePath] 相對路徑 %s 轉換為絕對路徑 %s\n", configPath, absPath)
			return absPath
		}
	}
	fmt.Printf("[NormalizePath] 使用絕對路徑 %s\n", configPath)
	return configPath
}

// EnsureDir 確保目錄存在
func EnsureDir(path string) error {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		fmt.Printf("[EnsureDir] 創建目錄: %s\n", path)
		return os.MkdirAll(path, 0755)
	}
	return nil
}

// ValidateUploadPath 驗證上傳路徑是否有效
func ValidateUploadPath(path string) error {
	// 檢查路徑是否存在
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return fmt.Errorf("上傳路徑不存在: %s", path)
	}
	
	// 檢查是否為目錄
	if info, err := os.Stat(path); err == nil {
		if !info.IsDir() {
			return fmt.Errorf("上傳路徑不是目錄: %s", path)
		}
	}
	
	// 檢查寫入權限
	testFile := filepath.Join(path, ".write_test")
	if file, err := os.Create(testFile); err != nil {
		return fmt.Errorf("上傳路徑沒有寫入權限: %s", path)
	} else {
		file.Close()
		os.Remove(testFile)
	}
	
	fmt.Printf("[ValidateUploadPath] 路徑驗證成功: %s\n", path)
	return nil
}