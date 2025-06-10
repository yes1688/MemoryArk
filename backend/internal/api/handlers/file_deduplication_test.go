package handlers

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"memoryark/internal/config"
	"memoryark/internal/models"
)

// TestFileHandlerDeduplication 檔案處理器去重功能集成測試
type TestFileHandlerDeduplication struct {
	handler *FileHandler
	db      *gorm.DB
	cfg     *config.Config
	tempDir string
}

// setupFileHandlerTest 設置檔案處理器測試環境
func setupFileHandlerTest(t *testing.T) *TestFileHandlerDeduplication {
	// 創建臨時資料庫
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
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

	// 創建臨時上傳目錄
	tempDir, err := os.MkdirTemp("", "upload_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}

	// 配置
	cfg := &config.Config{
		Upload: struct {
			UploadPath string `yaml:"upload_path"`
			MaxSize    int64  `yaml:"max_size"`
		}{
			UploadPath: tempDir,
			MaxSize:    100 * 1024 * 1024, // 100MB
		},
	}

	// 創建檔案處理器
	handler := NewFileHandler(db, cfg)

	return &TestFileHandlerDeduplication{
		handler: handler,
		db:      db,
		cfg:     cfg,
		tempDir: tempDir,
	}
}

// cleanup 清理測試環境
func (tfhd *TestFileHandlerDeduplication) cleanup() {
	os.RemoveAll(tfhd.tempDir)
}

// createMultipartRequest 創建多部分表單請求
func createMultipartRequest(filename, content string) (*http.Request, string, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// 添加檔案部分
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return nil, "", err
	}

	if _, err := io.WriteString(part, content); err != nil {
		return nil, "", err
	}

	if err := writer.Close(); err != nil {
		return nil, "", err
	}

	req := httptest.NewRequest("POST", "/files/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	return req, writer.FormDataContentType(), nil
}

// TestFileUploadDeduplication 測試檔案上傳去重功能
func TestFileUploadDeduplication(t *testing.T) {
	tfhd := setupFileHandlerTest(t)
	defer tfhd.cleanup()

	// 設置 Gin 為測試模式
	gin.SetMode(gin.TestMode)

	testContent := "This is test content for deduplication testing"
	expectedHash := fmt.Sprintf("%x", sha256.Sum256([]byte(testContent)))

	// 第一次上傳檔案
	req1, contentType, err := createMultipartRequest("test1.txt", testContent)
	if err != nil {
		t.Fatalf("Failed to create first request: %v", err)
	}
	req1.Header.Set("Content-Type", contentType)

	// 創建響應記錄器
	w1 := httptest.NewRecorder()
	c1, _ := gin.CreateTestContext(w1)
	c1.Request = req1
	c1.Set("user_id", uint(1)) // 設置用戶ID

	// 執行第一次上傳
	tfhd.handler.UploadFile(c1)

	if w1.Code != http.StatusCreated {
		t.Fatalf("Expected status 201, got %d. Response: %s", w1.Code, w1.Body.String())
	}

	// 檢查檔案是否被創建
	var firstFile models.File
	if err := tfhd.db.Where("original_name = ?", "test1.txt").First(&firstFile).Error; err != nil {
		t.Fatalf("Failed to find first uploaded file: %v", err)
	}

	// 驗證雜湊值
	if firstFile.SHA256Hash != expectedHash {
		t.Errorf("Expected hash %s, got %s", expectedHash, firstFile.SHA256Hash)
	}

	// 檢查實體檔案是否存在
	if _, err := os.Stat(firstFile.FilePath); os.IsNotExist(err) {
		t.Errorf("Physical file should exist: %s", firstFile.FilePath)
	}

	// 第二次上傳相同內容的檔案（應該被去重）
	req2, contentType2, err := createMultipartRequest("test2.txt", testContent)
	if err != nil {
		t.Fatalf("Failed to create second request: %v", err)
	}
	req2.Header.Set("Content-Type", contentType2)

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Set("user_id", uint(1))

	// 執行第二次上傳
	tfhd.handler.UploadFile(c2)

	if w2.Code != http.StatusCreated {
		t.Fatalf("Expected status 201, got %d. Response: %s", w2.Code, w2.Body.String())
	}

	// 檢查第二個檔案記錄
	var secondFile models.File
	if err := tfhd.db.Where("original_name = ?", "test2.txt").First(&secondFile).Error; err != nil {
		t.Fatalf("Failed to find second uploaded file: %v", err)
	}

	// 驗證去重：兩個檔案應該指向相同的實體檔案
	if firstFile.FilePath != secondFile.FilePath {
		t.Errorf("Files should share same physical path. First: %s, Second: %s", 
			firstFile.FilePath, secondFile.FilePath)
	}

	// 驗證雜湊值相同
	if firstFile.SHA256Hash != secondFile.SHA256Hash {
		t.Errorf("Files should have same hash. First: %s, Second: %s", 
			firstFile.SHA256Hash, secondFile.SHA256Hash)
	}

	// 驗證只有一個實體檔案
	filesDir := filepath.Join(tfhd.tempDir, "files")
	var physicalFileCount int
	filepath.Walk(filesDir, func(path string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			physicalFileCount++
		}
		return nil
	})

	if physicalFileCount != 1 {
		t.Errorf("Expected 1 physical file, found %d", physicalFileCount)
	}

	// 檢查資料庫中的檔案記錄數量
	var dbFileCount int64
	tfhd.db.Model(&models.File{}).Where("is_deleted = ?", false).Count(&dbFileCount)

	if dbFileCount != 2 {
		t.Errorf("Expected 2 file records in database, found %d", dbFileCount)
	}

	t.Logf("✅ File upload deduplication test passed")
	t.Logf("📊 Database records: %d, Physical files: %d", dbFileCount, physicalFileCount)
}

// TestDifferentFilesNonDeduplication 測試不同檔案不會被錯誤去重
func TestDifferentFilesNonDeduplication(t *testing.T) {
	tfhd := setupFileHandlerTest(t)
	defer tfhd.cleanup()

	gin.SetMode(gin.TestMode)

	// 創建兩個不同內容的檔案
	content1 := "This is the first file content"
	content2 := "This is the second file content - completely different"

	// 上傳第一個檔案
	req1, contentType1, err := createMultipartRequest("file1.txt", content1)
	if err != nil {
		t.Fatalf("Failed to create first request: %v", err)
	}

	w1 := httptest.NewRecorder()
	c1, _ := gin.CreateTestContext(w1)
	c1.Request = req1
	c1.Request.Header.Set("Content-Type", contentType1)
	c1.Set("user_id", uint(1))

	tfhd.handler.UploadFile(c1)

	if w1.Code != http.StatusCreated {
		t.Fatalf("First upload failed with status %d", w1.Code)
	}

	// 上傳第二個檔案
	req2, contentType2, err := createMultipartRequest("file2.txt", content2)
	if err != nil {
		t.Fatalf("Failed to create second request: %v", err)
	}

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Request.Header.Set("Content-Type", contentType2)
	c2.Set("user_id", uint(1))

	tfhd.handler.UploadFile(c2)

	if w2.Code != http.StatusCreated {
		t.Fatalf("Second upload failed with status %d", w2.Code)
	}

	// 檢查兩個檔案記錄
	var files []models.File
	tfhd.db.Where("is_deleted = ?", false).Find(&files)

	if len(files) != 2 {
		t.Fatalf("Expected 2 files, found %d", len(files))
	}

	// 驗證檔案有不同的雜湊值和實體路徑
	if files[0].SHA256Hash == files[1].SHA256Hash {
		t.Errorf("Different files should have different hashes")
	}

	if files[0].FilePath == files[1].FilePath {
		t.Errorf("Different files should have different physical paths")
	}

	// 驗證兩個實體檔案都存在
	for _, file := range files {
		if _, err := os.Stat(file.FilePath); os.IsNotExist(err) {
			t.Errorf("Physical file should exist: %s", file.FilePath)
		}
	}

	t.Logf("✅ Different files non-deduplication test passed")
}

// TestLargeFileDeduplication 測試大檔案去重
func TestLargeFileDeduplication(t *testing.T) {
	tfhd := setupFileHandlerTest(t)
	defer tfhd.cleanup()

	gin.SetMode(gin.TestMode)

	// 創建較大的測試檔案內容（100KB）
	largeContent := make([]byte, 100*1024)
	for i := range largeContent {
		largeContent[i] = byte(i % 256)
	}
	largeContentStr := string(largeContent)

	// 第一次上傳大檔案
	req1, contentType1, err := createMultipartRequest("large1.bin", largeContentStr)
	if err != nil {
		t.Fatalf("Failed to create first large file request: %v", err)
	}

	w1 := httptest.NewRecorder()
	c1, _ := gin.CreateTestContext(w1)
	c1.Request = req1
	c1.Request.Header.Set("Content-Type", contentType1)
	c1.Set("user_id", uint(1))

	tfhd.handler.UploadFile(c1)

	if w1.Code != http.StatusCreated {
		t.Fatalf("First large file upload failed with status %d", w1.Code)
	}

	// 第二次上傳相同的大檔案
	req2, contentType2, err := createMultipartRequest("large2.bin", largeContentStr)
	if err != nil {
		t.Fatalf("Failed to create second large file request: %v", err)
	}

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Request.Header.Set("Content-Type", contentType2)
	c2.Set("user_id", uint(1))

	tfhd.handler.UploadFile(c2)

	if w2.Code != http.StatusCreated {
		t.Fatalf("Second large file upload failed with status %d", w2.Code)
	}

	// 驗證去重效果
	var files []models.File
	tfhd.db.Where("is_deleted = ?", false).Find(&files)

	if len(files) != 2 {
		t.Fatalf("Expected 2 file records, found %d", len(files))
	}

	// 驗證指向相同實體檔案
	if files[0].FilePath != files[1].FilePath {
		t.Errorf("Large files should share same physical path")
	}

	// 計算儲存空間節省
	var totalLogicalSize int64
	for _, file := range files {
		totalLogicalSize += file.FileSize
	}

	fileInfo, err := os.Stat(files[0].FilePath)
	if err != nil {
		t.Fatalf("Failed to stat physical file: %v", err)
	}

	physicalSize := fileInfo.Size()
	spaceSaved := totalLogicalSize - physicalSize
	spaceSavingPercentage := float64(spaceSaved) / float64(totalLogicalSize) * 100

	if spaceSavingPercentage < 45 { // 應該節省約50%
		t.Errorf("Expected significant space savings, got %.1f%%", spaceSavingPercentage)
	}

	t.Logf("✅ Large file deduplication test passed")
	t.Logf("📊 Logical size: %d bytes, Physical size: %d bytes, Space saved: %.1f%%", 
		totalLogicalSize, physicalSize, spaceSavingPercentage)
}

// TestConcurrentUploadDeduplication 測試並發上傳的去重處理
func TestConcurrentUploadDeduplication(t *testing.T) {
	tfhd := setupFileHandlerTest(t)
	defer tfhd.cleanup()

	gin.SetMode(gin.TestMode)

	testContent := "Concurrent upload test content"
	numUploads := 5

	// 創建多個並發上傳
	results := make(chan int, numUploads)

	for i := 0; i < numUploads; i++ {
		go func(index int) {
			filename := fmt.Sprintf("concurrent_%d.txt", index)
			req, contentType, err := createMultipartRequest(filename, testContent)
			if err != nil {
				results <- 0
				return
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Request.Header.Set("Content-Type", contentType)
			c.Set("user_id", uint(1))

			tfhd.handler.UploadFile(c)
			results <- w.Code
		}(i)
	}

	// 收集結果
	successCount := 0
	for i := 0; i < numUploads; i++ {
		code := <-results
		if code == http.StatusCreated {
			successCount++
		}
	}

	if successCount != numUploads {
		t.Errorf("Expected %d successful uploads, got %d", numUploads, successCount)
	}

	// 驗證檔案記錄數量
	var dbFileCount int64
	tfhd.db.Model(&models.File{}).Where("is_deleted = ?", false).Count(&dbFileCount)

	if dbFileCount != int64(numUploads) {
		t.Errorf("Expected %d file records, found %d", numUploads, dbFileCount)
	}

	// 驗證所有檔案共享相同的實體檔案
	var files []models.File
	tfhd.db.Where("is_deleted = ?", false).Find(&files)

	firstFilePath := files[0].FilePath
	for _, file := range files {
		if file.FilePath != firstFilePath {
			t.Errorf("All concurrent uploads should share same physical path")
			break
		}
	}

	// 驗證只有一個實體檔案
	filesDir := filepath.Join(tfhd.tempDir, "files")
	var physicalFileCount int
	filepath.Walk(filesDir, func(path string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			physicalFileCount++
		}
		return nil
	})

	if physicalFileCount != 1 {
		t.Errorf("Expected 1 physical file, found %d", physicalFileCount)
	}

	t.Logf("✅ Concurrent upload deduplication test passed")
	t.Logf("📊 Concurrent uploads: %d, Physical files: %d", numUploads, physicalFileCount)
}

// TestEmptyFileDeduplication 測試空檔案去重
func TestEmptyFileDeduplication(t *testing.T) {
	tfhd := setupFileHandlerTest(t)
	defer tfhd.cleanup()

	gin.SetMode(gin.TestMode)

	emptyContent := ""

	// 上傳第一個空檔案
	req1, contentType1, err := createMultipartRequest("empty1.txt", emptyContent)
	if err != nil {
		t.Fatalf("Failed to create first empty file request: %v", err)
	}

	w1 := httptest.NewRecorder()
	c1, _ := gin.CreateTestContext(w1)
	c1.Request = req1
	c1.Request.Header.Set("Content-Type", contentType1)
	c1.Set("user_id", uint(1))

	tfhd.handler.UploadFile(c1)

	if w1.Code != http.StatusCreated {
		t.Fatalf("First empty file upload failed with status %d", w1.Code)
	}

	// 上傳第二個空檔案
	req2, contentType2, err := createMultipartRequest("empty2.txt", emptyContent)
	if err != nil {
		t.Fatalf("Failed to create second empty file request: %v", err)
	}

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Request.Header.Set("Content-Type", contentType2)
	c2.Set("user_id", uint(1))

	tfhd.handler.UploadFile(c2)

	if w2.Code != http.StatusCreated {
		t.Fatalf("Second empty file upload failed with status %d", w2.Code)
	}

	// 驗證空檔案去重
	var files []models.File
	tfhd.db.Where("is_deleted = ?", false).Find(&files)

	if len(files) != 2 {
		t.Fatalf("Expected 2 file records, found %d", len(files))
	}

	// 驗證空檔案共享相同的實體檔案
	if files[0].FilePath != files[1].FilePath {
		t.Errorf("Empty files should share same physical path")
	}

	// 驗證雜湊值（空檔案的 SHA256）
	expectedEmptyHash := "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
	for _, file := range files {
		if file.SHA256Hash != expectedEmptyHash {
			t.Errorf("Expected empty file hash %s, got %s", expectedEmptyHash, file.SHA256Hash)
		}
	}

	t.Logf("✅ Empty file deduplication test passed")
}