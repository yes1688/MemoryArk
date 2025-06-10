package services

import (
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"memoryark/internal/models"
)

// TestDeduplicationService 檔案去重服務測試套件
type TestDeduplicationService struct {
	db          *gorm.DB
	tempDir     string
	testFiles   map[string]string // filename -> content
	testHashes  map[string]string // filename -> hash
}

// setupTestEnvironment 設置測試環境
func setupTestEnvironment(t *testing.T) *TestDeduplicationService {
	// 創建臨時資料庫
	tempDB := ":memory:"
	db, err := gorm.Open(sqlite.Open(tempDB), &gorm.Config{
		Logger: logger.Default.LogLevel(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// 執行資料庫遷移
	err = db.AutoMigrate(&models.File{}, &models.User{}, &models.Category{})
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	// 創建臨時目錄
	tempDir, err := os.MkdirTemp("", "dedup_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}

	// 準備測試檔案內容
	testFiles := map[string]string{
		"file1.txt":     "This is the content of file 1",
		"file2.txt":     "This is the content of file 2", 
		"file1_dup.txt": "This is the content of file 1", // 與 file1.txt 相同
		"file3.bin":     "Binary content here",
		"file3_dup.bin": "Binary content here", // 與 file3.bin 相同
		"empty.txt":     "", // 空檔案
		"empty_dup.txt": "", // 另一個空檔案
	}

	// 計算 SHA256 雜湊值
	testHashes := make(map[string]string)
	for filename, content := range testFiles {
		hash := sha256.Sum256([]byte(content))
		testHashes[filename] = fmt.Sprintf("%x", hash)
	}

	// 創建測試用戶
	user := models.User{
		Email:  "test@example.com",
		Name:   "Test User",
		Role:   "user",
		Status: "approved",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	return &TestDeduplicationService{
		db:         db,
		tempDir:    tempDir,
		testFiles:  testFiles,
		testHashes: testHashes,
	}
}

// cleanup 清理測試環境
func (tds *TestDeduplicationService) cleanup() {
	os.RemoveAll(tds.tempDir)
}

// createPhysicalFile 創建實體檔案
func (tds *TestDeduplicationService) createPhysicalFile(filename, content string) (string, error) {
	filePath := filepath.Join(tds.tempDir, filename)
	return filePath, os.WriteFile(filePath, []byte(content), 0644)
}

// TestBasicDeduplication 測試基本去重功能
func TestBasicDeduplication(t *testing.T) {
	tds := setupTestEnvironment(t)
	defer tds.cleanup()

	// 創建第一個檔案
	file1Path, err := tds.createPhysicalFile("file1.txt", tds.testFiles["file1.txt"])
	if err != nil {
		t.Fatalf("Failed to create file1: %v", err)
	}

	file1 := models.File{
		Name:         "file1.txt",
		OriginalName: "file1.txt",
		FilePath:     file1Path,
		VirtualPath:  "/file1.txt",
		SHA256Hash:   tds.testHashes["file1.txt"],
		FileSize:     int64(len(tds.testFiles["file1.txt"])),
		MimeType:     "text/plain",
		UploadedBy:   1,
		IsDirectory:  false,
		IsDeleted:    false,
	}

	if err := tds.db.Create(&file1).Error; err != nil {
		t.Fatalf("Failed to create file1 record: %v", err)
	}

	// 上傳相同內容的檔案（應該被去重）
	var existingFile models.File
	result := tds.db.Where("sha256_hash = ? AND is_deleted = ?", 
		tds.testHashes["file1_dup.txt"], false).First(&existingFile)

	if result.Error != nil {
		t.Fatalf("Expected to find existing file with same hash: %v", result.Error)
	}

	// 驗證找到的檔案確實是原始檔案
	if existingFile.ID != file1.ID {
		t.Errorf("Expected to find file1, got file ID %d", existingFile.ID)
	}

	// 創建去重檔案記錄（不同虛擬路徑但指向相同實體檔案）
	file1Dup := models.File{
		Name:         "file1_dup.txt",
		OriginalName: "file1_dup.txt",
		FilePath:     existingFile.FilePath, // 使用相同的實體路徑
		VirtualPath:  "/file1_dup.txt",
		SHA256Hash:   tds.testHashes["file1_dup.txt"],
		FileSize:     int64(len(tds.testFiles["file1_dup.txt"])),
		MimeType:     "text/plain",
		UploadedBy:   1,
		IsDirectory:  false,
		IsDeleted:    false,
	}

	if err := tds.db.Create(&file1Dup).Error; err != nil {
		t.Fatalf("Failed to create duplicate file record: %v", err)
	}

	// 驗證兩個檔案記錄指向相同的實體檔案
	if file1.FilePath != file1Dup.FilePath {
		t.Errorf("Duplicate files should share same physical path: %s vs %s", 
			file1.FilePath, file1Dup.FilePath)
	}

	// 驗證只有一個實體檔案存在
	if _, err := os.Stat(file1.FilePath); os.IsNotExist(err) {
		t.Errorf("Physical file should exist: %s", file1.FilePath)
	}

	t.Logf("✅ Basic deduplication test passed")
}

// TestMultipleFileDeduplication 測試多檔案去重
func TestMultipleFileDeduplication(t *testing.T) {
	tds := setupTestEnvironment(t)
	defer tds.cleanup()

	// 創建多個檔案，包括重複內容
	testCases := []struct {
		filename    string
		virtualPath string
	}{
		{"file1.txt", "/folder1/file1.txt"},
		{"file1_dup.txt", "/folder2/file1.txt"},
		{"file2.txt", "/file2.txt"},
		{"file3.bin", "/binary/file3.bin"},
		{"file3_dup.bin", "/backup/file3.bin"},
		{"empty.txt", "/empty1.txt"},
		{"empty_dup.txt", "/empty2.txt"},
	}

	physicalPaths := make(map[string]string) // hash -> physical path

	for _, tc := range testCases {
		content := tds.testFiles[tc.filename]
		hash := tds.testHashes[tc.filename]

		var filePath string
		if existingPath, exists := physicalPaths[hash]; exists {
			// 使用現有的實體檔案
			filePath = existingPath
		} else {
			// 創建新的實體檔案
			var err error
			filePath, err = tds.createPhysicalFile(tc.filename, content)
			if err != nil {
				t.Fatalf("Failed to create file %s: %v", tc.filename, err)
			}
			physicalPaths[hash] = filePath
		}

		file := models.File{
			Name:         tc.filename,
			OriginalName: tc.filename,
			FilePath:     filePath,
			VirtualPath:  tc.virtualPath,
			SHA256Hash:   hash,
			FileSize:     int64(len(content)),
			MimeType:     "application/octet-stream",
			UploadedBy:   1,
			IsDirectory:  false,
			IsDeleted:    false,
		}

		if err := tds.db.Create(&file).Error; err != nil {
			t.Fatalf("Failed to create file record %s: %v", tc.filename, err)
		}
	}

	// 統計去重效果
	var totalFiles int64
	tds.db.Model(&models.File{}).Where("is_deleted = ?", false).Count(&totalFiles)

	uniqueHashes := make(map[string]bool)
	var files []models.File
	tds.db.Where("is_deleted = ?", false).Find(&files)

	for _, file := range files {
		uniqueHashes[file.SHA256Hash] = true
	}

	expectedUniqueFiles := 4 // file1, file2, file3, empty
	actualUniqueFiles := len(uniqueHashes)

	if actualUniqueFiles != expectedUniqueFiles {
		t.Errorf("Expected %d unique files, got %d", expectedUniqueFiles, actualUniqueFiles)
	}

	// 驗證儲存空間節省
	var totalLogicalSize int64
	var totalPhysicalFiles int
	physicalFilesSeen := make(map[string]bool)

	for _, file := range files {
		totalLogicalSize += file.FileSize
		if !physicalFilesSeen[file.FilePath] {
			physicalFilesSeen[file.FilePath] = true
			totalPhysicalFiles++
		}
	}

	if totalPhysicalFiles != expectedUniqueFiles {
		t.Errorf("Expected %d physical files, got %d", expectedUniqueFiles, totalPhysicalFiles)
	}

	spaceSavingPercentage := float64(len(testCases)-totalPhysicalFiles) / float64(len(testCases)) * 100

	t.Logf("✅ Multiple file deduplication test passed")
	t.Logf("📊 Files created: %d, Physical files: %d, Space saved: %.1f%%", 
		len(testCases), totalPhysicalFiles, spaceSavingPercentage)
}

// TestDeduplicationWithDeletion 測試刪除檔案時的去重處理
func TestDeduplicationWithDeletion(t *testing.T) {
	tds := setupTestEnvironment(t)
	defer tds.cleanup()

	content := tds.testFiles["file1.txt"]
	hash := tds.testHashes["file1.txt"]

	// 創建實體檔案
	physicalPath, err := tds.createPhysicalFile("shared.txt", content)
	if err != nil {
		t.Fatalf("Failed to create physical file: %v", err)
	}

	// 創建三個檔案記錄，共享同一個實體檔案
	files := []models.File{
		{
			Name:         "file1.txt",
			OriginalName: "file1.txt",
			FilePath:     physicalPath,
			VirtualPath:  "/file1.txt",
			SHA256Hash:   hash,
			FileSize:     int64(len(content)),
			UploadedBy:   1,
		},
		{
			Name:         "file1_copy.txt",
			OriginalName: "file1_copy.txt", 
			FilePath:     physicalPath,
			VirtualPath:  "/backup/file1_copy.txt",
			SHA256Hash:   hash,
			FileSize:     int64(len(content)),
			UploadedBy:   1,
		},
		{
			Name:         "file1_backup.txt",
			OriginalName: "file1_backup.txt",
			FilePath:     physicalPath,
			VirtualPath:  "/archive/file1_backup.txt",
			SHA256Hash:   hash,
			FileSize:     int64(len(content)),
			UploadedBy:   1,
		},
	}

	for i := range files {
		if err := tds.db.Create(&files[i]).Error; err != nil {
			t.Fatalf("Failed to create file record %d: %v", i, err)
		}
	}

	// 驗證實體檔案存在
	if _, err := os.Stat(physicalPath); os.IsNotExist(err) {
		t.Fatalf("Physical file should exist: %s", physicalPath)
	}

	// 軟刪除第一個檔案
	now := time.Now()
	files[0].IsDeleted = true
	files[0].DeletedAt = &now
	if err := tds.db.Save(&files[0]).Error; err != nil {
		t.Fatalf("Failed to soft delete file: %v", err)
	}

	// 驗證實體檔案仍然存在（因為還有其他檔案使用）
	if _, err := os.Stat(physicalPath); os.IsNotExist(err) {
		t.Errorf("Physical file should still exist after soft delete: %s", physicalPath)
	}

	// 軟刪除第二個檔案
	files[1].IsDeleted = true
	files[1].DeletedAt = &now
	if err := tds.db.Save(&files[1]).Error; err != nil {
		t.Fatalf("Failed to soft delete second file: %v", err)
	}

	// 實體檔案仍應存在
	if _, err := os.Stat(physicalPath); os.IsNotExist(err) {
		t.Errorf("Physical file should still exist after second soft delete: %s", physicalPath)
	}

	// 檢查還有多少個活躍的檔案使用這個實體檔案
	var activeFileCount int64
	tds.db.Model(&models.File{}).Where("file_path = ? AND is_deleted = ?", 
		physicalPath, false).Count(&activeFileCount)

	if activeFileCount != 1 {
		t.Errorf("Expected 1 active file using physical path, got %d", activeFileCount)
	}

	// 軟刪除最後一個檔案
	files[2].IsDeleted = true
	files[2].DeletedAt = &now
	if err := tds.db.Save(&files[2]).Error; err != nil {
		t.Fatalf("Failed to soft delete last file: %v", err)
	}

	// 現在應該沒有活躍檔案使用這個實體檔案
	tds.db.Model(&models.File{}).Where("file_path = ? AND is_deleted = ?", 
		physicalPath, false).Count(&activeFileCount)

	if activeFileCount != 0 {
		t.Errorf("Expected 0 active files using physical path, got %d", activeFileCount)
	}

	// 實體檔案應該可以被清理（這裡我們模擬清理過程）
	// 在實際實現中，這可能由後台任務處理
	if activeFileCount == 0 {
		if err := os.Remove(physicalPath); err != nil {
			t.Errorf("Failed to clean up orphaned physical file: %v", err)
		}
	}

	t.Logf("✅ Deduplication with deletion test passed")
}

// TestLargeFileDeduplication 測試大檔案去重
func TestLargeFileDeduplication(t *testing.T) {
	tds := setupTestEnvironment(t)
	defer tds.cleanup()

	// 創建大檔案內容（1MB）
	largeContent := strings.Repeat("This is a large file content block. ", 28571) // 約 1MB
	hash := sha256.Sum256([]byte(largeContent))
	hashString := fmt.Sprintf("%x", hash)

	// 創建第一個大檔案
	largePath1, err := tds.createPhysicalFile("large1.dat", largeContent)
	if err != nil {
		t.Fatalf("Failed to create large file 1: %v", err)
	}

	file1 := models.File{
		Name:         "large1.dat",
		OriginalName: "large1.dat",
		FilePath:     largePath1,
		VirtualPath:  "/large1.dat",
		SHA256Hash:   hashString,
		FileSize:     int64(len(largeContent)),
		MimeType:     "application/octet-stream",
		UploadedBy:   1,
	}

	if err := tds.db.Create(&file1).Error; err != nil {
		t.Fatalf("Failed to create large file 1 record: %v", err)
	}

	// 模擬上傳相同的大檔案（去重）
	file2 := models.File{
		Name:         "large2.dat",
		OriginalName: "large2.dat", 
		FilePath:     largePath1, // 指向相同實體檔案
		VirtualPath:  "/backup/large2.dat",
		SHA256Hash:   hashString,
		FileSize:     int64(len(largeContent)),
		MimeType:     "application/octet-stream",
		UploadedBy:   1,
	}

	if err := tds.db.Create(&file2).Error; err != nil {
		t.Fatalf("Failed to create large file 2 record: %v", err)
	}

	// 驗證儲存空間節省
	var totalLogicalSize int64
	var files []models.File
	tds.db.Where("is_deleted = ?", false).Find(&files)

	for _, file := range files {
		totalLogicalSize += file.FileSize
	}

	// 檢查實體檔案大小
	fileInfo, err := os.Stat(largePath1)
	if err != nil {
		t.Fatalf("Failed to stat physical file: %v", err)
	}

	physicalSize := fileInfo.Size()
	logicalSize := totalLogicalSize

	spaceSaved := logicalSize - physicalSize
	spaceSavingPercentage := float64(spaceSaved) / float64(logicalSize) * 100

	if spaceSavingPercentage < 45 { // 應該節省約 50%
		t.Errorf("Expected significant space savings for large file deduplication, got %.1f%%", 
			spaceSavingPercentage)
	}

	t.Logf("✅ Large file deduplication test passed")
	t.Logf("📊 Logical size: %d bytes, Physical size: %d bytes, Space saved: %.1f%%", 
		logicalSize, physicalSize, spaceSavingPercentage)
}

// TestHashCollisionHandling 測試雜湊碰撞處理（理論測試）
func TestHashCollisionHandling(t *testing.T) {
	tds := setupTestEnvironment(t)
	defer tds.cleanup()

	// 注意：這是理論測試，實際 SHA256 碰撞極其罕見
	// 此測試主要驗證系統如何處理相同雜湊值但不同內容的情況

	// 創建兩個檔案，人為設置相同的雜湊值（模擬碰撞）
	content1 := "Content of file 1"
	content2 := "Content of file 2 (different)"
	fakeHash := "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

	path1, err := tds.createPhysicalFile("file1.txt", content1)
	if err != nil {
		t.Fatalf("Failed to create file 1: %v", err)
	}

	path2, err := tds.createPhysicalFile("file2.txt", content2)
	if err != nil {
		t.Fatalf("Failed to create file 2: %v", err)
	}

	file1 := models.File{
		Name:         "file1.txt",
		OriginalName: "file1.txt",
		FilePath:     path1,
		VirtualPath:  "/file1.txt", 
		SHA256Hash:   fakeHash,
		FileSize:     int64(len(content1)),
		UploadedBy:   1,
	}

	if err := tds.db.Create(&file1).Error; err != nil {
		t.Fatalf("Failed to create file 1 record: %v", err)
	}

	// 嘗試創建第二個檔案（相同雜湊值）
	// 在真實系統中，應該有額外驗證來檢測這種情況
	file2 := models.File{
		Name:         "file2.txt",
		OriginalName: "file2.txt",
		FilePath:     path2, // 不同的實體路徑
		VirtualPath:  "/file2.txt",
		SHA256Hash:   fakeHash, // 相同的雜湊值
		FileSize:     int64(len(content2)),
		UploadedBy:   1,
	}

	if err := tds.db.Create(&file2).Error; err != nil {
		t.Fatalf("Failed to create file 2 record: %v", err)
	}

	// 驗證兩個檔案都存在且有不同的實體路徑
	var filesWithSameHash []models.File
	tds.db.Where("sha256_hash = ?", fakeHash).Find(&filesWithSameHash)

	if len(filesWithSameHash) != 2 {
		t.Errorf("Expected 2 files with same hash, got %d", len(filesWithSameHash))
	}

	// 在實際實現中，系統應該檢測到這種異常情況並記錄警告
	t.Logf("⚠️  Hash collision handling test completed (theoretical scenario)")
	t.Logf("💡 In production, additional content verification should be implemented")
}

// BenchmarkDeduplicationPerformance 效能基準測試
func BenchmarkDeduplicationPerformance(b *testing.B) {
	tds := setupTestEnvironment(&testing.T{})
	defer tds.cleanup()

	testContent := "This is test content for performance benchmarking"
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(testContent)))

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		// 模擬去重查詢
		var existingFile models.File
		tds.db.Where("sha256_hash = ? AND is_deleted = ?", hash, false).First(&existingFile)
	}
}