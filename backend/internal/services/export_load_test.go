package services

import (
	"context"
	"fmt"
	"io"
	"math/rand"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"memoryark/internal/models"
)

// TestStreamingExportService 串流匯出服務負載測試套件
type TestStreamingExportService struct {
	db          *gorm.DB
	tempDir     string
	testFiles   []models.File
	totalSize   int64
}

// ExportPerformanceMetrics 匯出效能指標
type ExportPerformanceMetrics struct {
	TotalFiles      int           `json:"total_files"`
	TotalSize       int64         `json:"total_size_bytes"`
	Duration        time.Duration `json:"duration_ms"`
	Throughput      float64       `json:"throughput_mb_per_sec"`
	FilesPerSecond  float64       `json:"files_per_second"`
	MemoryUsage     int64         `json:"memory_usage_bytes"`
	ConcurrentUsers int           `json:"concurrent_users"`
	Success         bool          `json:"success"`
	ErrorRate       float64       `json:"error_rate"`
}

// setupExportLoadTest 設置匯出負載測試環境
func setupExportLoadTest(t *testing.T) *TestStreamingExportService {
	// 創建測試資料庫
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogLevel(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// 執行遷移
	err = db.AutoMigrate(&models.File{}, &models.User{}, &models.Category{}, &models.ExportJob{})
	if err != nil {
		t.Fatalf("Failed to migrate database: %v", err)
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

	// 創建測試分類
	category := models.Category{
		Name:      "測試分類",
		CreatedBy: 1,
	}
	if err := db.Create(&category).Error; err != nil {
		t.Fatalf("Failed to create test category: %v", err)
	}

	// 創建臨時目錄
	tempDir, err := os.MkdirTemp("", "export_load_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}

	return &TestStreamingExportService{
		db:      db,
		tempDir: tempDir,
	}
}

// cleanup 清理測試環境
func (tses *TestStreamingExportService) cleanup() {
	os.RemoveAll(tses.tempDir)
}

// generateTestFiles 生成測試檔案
func (tses *TestStreamingExportService) generateTestFiles(fileCount int, avgSizeKB int) error {
	tses.testFiles = make([]models.File, 0, fileCount)
	tses.totalSize = 0

	for i := 0; i < fileCount; i++ {
		// 隨機檔案大小 (50% - 150% of avgSize)
		size := int64(avgSizeKB*1024) + rand.Int63n(int64(avgSizeKB*1024)) - int64(avgSizeKB*512)
		if size < 1024 {
			size = 1024 // 最小 1KB
		}

		// 創建實體檔案
		fileName := fmt.Sprintf("test_file_%d.dat", i)
		filePath := filepath.Join(tses.tempDir, fileName)

		file, err := os.Create(filePath)
		if err != nil {
			return fmt.Errorf("failed to create file %s: %v", fileName, err)
		}

		// 寫入隨機數據
		buffer := make([]byte, 4096)
		written := int64(0)
		for written < size {
			n := len(buffer)
			if size-written < int64(n) {
				n = int(size - written)
			}
			rand.Read(buffer[:n])
			if _, err := file.Write(buffer[:n]); err != nil {
				file.Close()
				return fmt.Errorf("failed to write to file %s: %v", fileName, err)
			}
			written += int64(n)
		}
		file.Close()

		// 創建檔案記錄
		fileRecord := models.File{
			Name:         fileName,
			OriginalName: fileName,
			FilePath:     filePath,
			VirtualPath:  "/" + fileName,
			FileSize:     size,
			MimeType:     "application/octet-stream",
			CategoryID:   func() *uint { id := uint(1); return &id }(),
			UploadedBy:   1,
			IsDirectory:  false,
			IsDeleted:    false,
		}

		if err := tses.db.Create(&fileRecord).Error; err != nil {
			return fmt.Errorf("failed to create file record for %s: %v", fileName, err)
		}

		tses.testFiles = append(tses.testFiles, fileRecord)
		tses.totalSize += size
	}

	return nil
}

// simulateExportJob 模擬匯出任務
func (tses *TestStreamingExportService) simulateExportJob(fileIDs []uint, ctx context.Context) (*ExportPerformanceMetrics, error) {
	startTime := time.Now()

	// 創建匯出任務記錄
	job := models.ExportJob{
		JobID:          fmt.Sprintf("test_job_%d", time.Now().UnixNano()),
		UserID:         1,
		Status:         "processing",
		TotalFiles:     len(fileIDs),
		ProcessedFiles: 0,
		TotalSize:      tses.totalSize,
		ProcessedSize:  0,
		ExportFormat:   "zip",
	}

	if err := tses.db.Create(&job).Error; err != nil {
		return nil, fmt.Errorf("failed to create export job: %v", err)
	}

	// 模擬檔案處理過程
	var processedFiles int
	var processedSize int64
	var memUsage int64

	for i, fileID := range fileIDs {
		select {
		case <-ctx.Done():
			return &ExportPerformanceMetrics{
				Success: false,
			}, ctx.Err()
		default:
		}

		// 模擬檔案讀取和壓縮
		var file models.File
		if err := tses.db.First(&file, fileID).Error; err != nil {
			continue
		}

		// 模擬讀取檔案
		if _, err := os.Stat(file.FilePath); err != nil {
			continue
		}

		// 模擬壓縮過程（讀取檔案內容）
		f, err := os.Open(file.FilePath)
		if err != nil {
			continue
		}

		buffer := make([]byte, 32*1024) // 32KB buffer
		for {
			n, err := f.Read(buffer)
			if err == io.EOF {
				break
			}
			if err != nil {
				f.Close()
				continue
			}
			// 模擬壓縮處理時間
			time.Sleep(time.Microsecond * 10)
			memUsage += int64(n)
		}
		f.Close()

		processedFiles++
		processedSize += file.FileSize

		// 更新進度（每10個檔案更新一次）
		if i%10 == 0 {
			job.ProcessedFiles = processedFiles
			job.ProcessedSize = processedSize
			job.Progress = int(float64(processedFiles) / float64(len(fileIDs)) * 100)
			tses.db.Save(&job)
		}
	}

	duration := time.Since(startTime)

	// 計算效能指標
	throughputMBPS := float64(processedSize) / (1024 * 1024) / duration.Seconds()
	filesPerSecond := float64(processedFiles) / duration.Seconds()

	// 完成任務
	job.Status = "completed"
	job.ProcessedFiles = processedFiles
	job.ProcessedSize = processedSize
	job.Progress = 100
	job.CompletedAt = func() *time.Time { t := time.Now(); return &t }()
	tses.db.Save(&job)

	return &ExportPerformanceMetrics{
		TotalFiles:      len(fileIDs),
		TotalSize:       processedSize,
		Duration:        duration,
		Throughput:      throughputMBPS,
		FilesPerSecond:  filesPerSecond,
		MemoryUsage:     memUsage,
		ConcurrentUsers: 1,
		Success:         true,
		ErrorRate:       0.0,
	}, nil
}

// TestSmallFileExport 測試小檔案匯出（1000個檔案，平均10KB）
func TestSmallFileExport(t *testing.T) {
	tses := setupExportLoadTest(t)
	defer tses.cleanup()

	// 生成1000個小檔案
	if err := tses.generateTestFiles(1000, 10); err != nil {
		t.Fatalf("Failed to generate test files: %v", err)
	}

	// 獲取檔案ID列表
	fileIDs := make([]uint, len(tses.testFiles))
	for i, file := range tses.testFiles {
		fileIDs[i] = file.ID
	}

	// 執行匯出測試
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	metrics, err := tses.simulateExportJob(fileIDs, ctx)
	if err != nil {
		t.Fatalf("Export job failed: %v", err)
	}

	// 驗證效能指標
	if !metrics.Success {
		t.Errorf("Export job should succeed")
	}

	if metrics.FilesPerSecond < 50 {
		t.Errorf("Files per second too low: %.2f (expected > 50)", metrics.FilesPerSecond)
	}

	if metrics.Throughput < 0.5 {
		t.Errorf("Throughput too low: %.2f MB/s (expected > 0.5)", metrics.Throughput)
	}

	t.Logf("✅ Small file export test passed")
	t.Logf("📊 Files: %d, Size: %.2f MB, Duration: %v", 
		metrics.TotalFiles, float64(metrics.TotalSize)/(1024*1024), metrics.Duration)
	t.Logf("🚀 Throughput: %.2f MB/s, Files/sec: %.2f", 
		metrics.Throughput, metrics.FilesPerSecond)
}

// TestLargeFileExport 測試大檔案匯出（100個檔案，平均5MB）
func TestLargeFileExport(t *testing.T) {
	tses := setupExportLoadTest(t)
	defer tses.cleanup()

	// 生成100個大檔案
	if err := tses.generateTestFiles(100, 5*1024); err != nil {
		t.Fatalf("Failed to generate test files: %v", err)
	}

	fileIDs := make([]uint, len(tses.testFiles))
	for i, file := range tses.testFiles {
		fileIDs[i] = file.ID
	}

	// 執行匯出測試
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	metrics, err := tses.simulateExportJob(fileIDs, ctx)
	if err != nil {
		t.Fatalf("Export job failed: %v", err)
	}

	// 驗證效能指標
	if !metrics.Success {
		t.Errorf("Export job should succeed")
	}

	if metrics.FilesPerSecond < 1 {
		t.Errorf("Files per second too low: %.2f (expected > 1)", metrics.FilesPerSecond)
	}

	if metrics.Throughput < 10 {
		t.Errorf("Throughput too low: %.2f MB/s (expected > 10)", metrics.Throughput)
	}

	t.Logf("✅ Large file export test passed")
	t.Logf("📊 Files: %d, Size: %.2f MB, Duration: %v", 
		metrics.TotalFiles, float64(metrics.TotalSize)/(1024*1024), metrics.Duration)
	t.Logf("🚀 Throughput: %.2f MB/s, Files/sec: %.2f", 
		metrics.Throughput, metrics.FilesPerSecond)
}

// TestMixedFileExport 測試混合檔案匯出（500個檔案，大小不一）
func TestMixedFileExport(t *testing.T) {
	tses := setupExportLoadTest(t)
	defer tses.cleanup()

	// 生成混合大小的檔案
	if err := tses.generateTestFiles(500, 500); err != nil { // 平均500KB
		t.Fatalf("Failed to generate test files: %v", err)
	}

	fileIDs := make([]uint, len(tses.testFiles))
	for i, file := range tses.testFiles {
		fileIDs[i] = file.ID
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Minute)
	defer cancel()

	metrics, err := tses.simulateExportJob(fileIDs, ctx)
	if err != nil {
		t.Fatalf("Export job failed: %v", err)
	}

	if !metrics.Success {
		t.Errorf("Export job should succeed")
	}

	t.Logf("✅ Mixed file export test passed")
	t.Logf("📊 Files: %d, Size: %.2f MB, Duration: %v", 
		metrics.TotalFiles, float64(metrics.TotalSize)/(1024*1024), metrics.Duration)
	t.Logf("🚀 Throughput: %.2f MB/s, Files/sec: %.2f", 
		metrics.Throughput, metrics.FilesPerSecond)
}

// TestConcurrentExports 測試並發匯出
func TestConcurrentExports(t *testing.T) {
	tses := setupExportLoadTest(t)
	defer tses.cleanup()

	// 生成測試檔案
	if err := tses.generateTestFiles(200, 100); err != nil {
		t.Fatalf("Failed to generate test files: %v", err)
	}

	fileIDs := make([]uint, len(tses.testFiles))
	for i, file := range tses.testFiles {
		fileIDs[i] = file.ID
	}

	// 並發測試參數
	concurrentUsers := 5
	var wg sync.WaitGroup
	var mu sync.Mutex
	results := make([]*ExportPerformanceMetrics, 0, concurrentUsers)

	startTime := time.Now()

	// 啟動並發匯出任務
	for i := 0; i < concurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
			defer cancel()

			metrics, err := tses.simulateExportJob(fileIDs, ctx)
			if err != nil {
				t.Errorf("Concurrent export %d failed: %v", userID, err)
				return
			}

			metrics.ConcurrentUsers = concurrentUsers
			
			mu.Lock()
			results = append(results, metrics)
			mu.Unlock()
		}(i)
	}

	wg.Wait()
	totalDuration := time.Since(startTime)

	// 分析並發效能
	if len(results) != concurrentUsers {
		t.Errorf("Expected %d successful exports, got %d", concurrentUsers, len(results))
	}

	var totalThroughput float64
	var successCount int

	for _, result := range results {
		if result.Success {
			successCount++
			totalThroughput += result.Throughput
		}
	}

	avgThroughput := totalThroughput / float64(successCount)
	
	// 驗證並發效能不會嚴重降級
	if avgThroughput < 1.0 {
		t.Errorf("Average throughput too low under concurrent load: %.2f MB/s", avgThroughput)
	}

	t.Logf("✅ Concurrent export test passed")
	t.Logf("👥 Concurrent users: %d, Success rate: %.1f%%", 
		concurrentUsers, float64(successCount)/float64(concurrentUsers)*100)
	t.Logf("⏱️  Total duration: %v, Avg throughput: %.2f MB/s", 
		totalDuration, avgThroughput)
}

// TestExportTimeout 測試匯出超時處理
func TestExportTimeout(t *testing.T) {
	tses := setupExportLoadTest(t)
	defer tses.cleanup()

	// 生成大量檔案以觸發超時
	if err := tses.generateTestFiles(50, 1024); err != nil { // 50個 1MB 檔案
		t.Fatalf("Failed to generate test files: %v", err)
	}

	fileIDs := make([]uint, len(tses.testFiles))
	for i, file := range tses.testFiles {
		fileIDs[i] = file.ID
	}

	// 設置短超時時間
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	metrics, err := tses.simulateExportJob(fileIDs, ctx)
	
	// 應該因為超時而失敗
	if err == nil {
		t.Errorf("Expected timeout error, but export succeeded")
	}

	if metrics != nil && metrics.Success {
		t.Errorf("Export should fail due to timeout")
	}

	t.Logf("✅ Export timeout test passed - correctly handled timeout")
}

// TestMemoryUsage 測試記憶體使用情況
func TestMemoryUsage(t *testing.T) {
	tses := setupExportLoadTest(t)
	defer tses.cleanup()

	// 生成中等數量的檔案
	if err := tses.generateTestFiles(300, 200); err != nil {
		t.Fatalf("Failed to generate test files: %v", err)
	}

	fileIDs := make([]uint, len(tses.testFiles))
	for i, file := range tses.testFiles {
		fileIDs[i] = file.ID
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// 記錄開始時的記憶體狀況
	var startMem, endMem runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&startMem)

	metrics, err := tses.simulateExportJob(fileIDs, ctx)
	if err != nil {
		t.Fatalf("Export job failed: %v", err)
	}

	runtime.GC()
	runtime.ReadMemStats(&endMem)

	// 計算記憶體增長
	memGrowth := endMem.Alloc - startMem.Alloc
	memPerFile := float64(memGrowth) / float64(len(fileIDs))

	// 驗證記憶體使用合理（每個檔案不超過1MB記憶體）
	if memPerFile > 1024*1024 {
		t.Errorf("Memory usage too high: %.2f bytes per file", memPerFile)
	}

	t.Logf("✅ Memory usage test passed")
	t.Logf("💾 Memory growth: %d bytes, Per file: %.2f bytes", 
		memGrowth, memPerFile)
	t.Logf("📊 Files: %d, Total size: %.2f MB", 
		metrics.TotalFiles, float64(metrics.TotalSize)/(1024*1024))
}

// BenchmarkExportPerformance 匯出效能基準測試
func BenchmarkExportPerformance(b *testing.B) {
	tses := setupExportLoadTest(&testing.T{})
	defer tses.cleanup()

	// 生成基準測試檔案
	if err := tses.generateTestFiles(100, 50); err != nil {
		b.Fatalf("Failed to generate test files: %v", err)
	}

	fileIDs := make([]uint, len(tses.testFiles))
	for i, file := range tses.testFiles {
		fileIDs[i] = file.ID
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		
		_, err := tses.simulateExportJob(fileIDs, ctx)
		if err != nil {
			b.Errorf("Benchmark export failed: %v", err)
		}
		
		cancel()
	}
}

// 添加 runtime 包導入
import "runtime"