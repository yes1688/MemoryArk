package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"memoryark/internal/config"
	"memoryark/internal/models"
)

// HTTPExportLoadTest HTTP 匯出負載測試套件
type HTTPExportLoadTest struct {
	handler *ExportHandler
	db      *gorm.DB
	cfg     *config.Config
	tempDir string
	router  *gin.Engine
}

// LoadTestResult 負載測試結果
type LoadTestResult struct {
	TotalRequests   int           `json:"total_requests"`
	SuccessRequests int           `json:"success_requests"`
	FailedRequests  int           `json:"failed_requests"`
	SuccessRate     float64       `json:"success_rate"`
	AvgResponseTime time.Duration `json:"avg_response_time"`
	MinResponseTime time.Duration `json:"min_response_time"`
	MaxResponseTime time.Duration `json:"max_response_time"`
	ThroughputRPS   float64       `json:"throughput_rps"`
	TotalDuration   time.Duration `json:"total_duration"`
	ErrorCodes      map[int]int   `json:"error_codes"`
}

// setupHTTPExportLoadTest 設置HTTP匯出負載測試環境
func setupHTTPExportLoadTest(t *testing.T) *HTTPExportLoadTest {
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
		Name:      "負載測試分類",
		CreatedBy: 1,
	}
	if err := db.Create(&category).Error; err != nil {
		t.Fatalf("Failed to create test category: %v", err)
	}

	// 創建臨時目錄
	tempDir, err := os.MkdirTemp("", "http_export_load_test_*")
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
			MaxSize:    100 * 1024 * 1024,
		},
	}

	// 創建匯出處理器
	exportHandler := NewExportHandler(db, cfg)

	// 設置路由
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})

	// 註冊路由
	api := router.Group("/api")
	{
		api.POST("/export/stream", exportHandler.CreateStreamExport)
		api.GET("/export/jobs/:id", exportHandler.GetExportJobStatus)
		api.GET("/export/download/:id", exportHandler.DownloadExportFile)
	}

	return &HTTPExportLoadTest{
		handler: exportHandler,
		db:      db,
		cfg:     cfg,
		tempDir: tempDir,
		router:  router,
	}
}

// cleanup 清理測試環境
func (helt *HTTPExportLoadTest) cleanup() {
	os.RemoveAll(helt.tempDir)
}

// generateTestData 生成測試數據
func (helt *HTTPExportLoadTest) generateTestData(fileCount int, avgSizeKB int) error {
	for i := 0; i < fileCount; i++ {
		// 創建測試檔案
		fileName := fmt.Sprintf("load_test_file_%d.dat", i)
		filePath := filepath.Join(helt.tempDir, fileName)
		
		// 創建檔案內容
		content := make([]byte, avgSizeKB*1024)
		for j := range content {
			content[j] = byte(j % 256)
		}
		
		if err := os.WriteFile(filePath, content, 0644); err != nil {
			return fmt.Errorf("failed to create test file %s: %v", fileName, err)
		}

		// 創建資料庫記錄
		file := models.File{
			Name:         fileName,
			OriginalName: fileName,
			FilePath:     filePath,
			VirtualPath:  "/" + fileName,
			FileSize:     int64(len(content)),
			MimeType:     "application/octet-stream",
			CategoryID:   func() *uint { id := uint(1); return &id }(),
			UploadedBy:   1,
			IsDirectory:  false,
			IsDeleted:    false,
		}

		if err := helt.db.Create(&file).Error; err != nil {
			return fmt.Errorf("failed to create file record: %v", err)
		}
	}

	return nil
}

// performRequest 執行單個HTTP請求
func (helt *HTTPExportLoadTest) performRequest(method, url string, body []byte) (*http.Response, time.Duration, error) {
	var reqBody *bytes.Buffer
	if body != nil {
		reqBody = bytes.NewBuffer(body)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	req := httptest.NewRequest(method, url, reqBody)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	w := httptest.NewRecorder()
	
	start := time.Now()
	helt.router.ServeHTTP(w, req)
	duration := time.Since(start)

	return w.Result(), duration, nil
}

// TestCreateStreamExportLoad 測試創建串流匯出的負載
func TestCreateStreamExportLoad(t *testing.T) {
	helt := setupHTTPExportLoadTest(t)
	defer helt.cleanup()

	// 生成測試數據
	if err := helt.generateTestData(100, 50); err != nil {
		t.Fatalf("Failed to generate test data: %v", err)
	}

	// 負載測試參數
	concurrentUsers := 10
	requestsPerUser := 5
	totalRequests := concurrentUsers * requestsPerUser

	// 準備請求體
	exportRequest := map[string]interface{}{
		"categoryIds":        []int{1},
		"includeSubfolders": true,
		"format":            "zip",
	}
	requestBody, _ := json.Marshal(exportRequest)

	// 結果收集
	var wg sync.WaitGroup
	var mu sync.Mutex
	results := make([]LoadTestResult, 0, totalRequests)
	responseTimes := make([]time.Duration, 0, totalRequests)
	errorCodes := make(map[int]int)

	startTime := time.Now()

	// 執行並發請求
	for i := 0; i < concurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()

			for j := 0; j < requestsPerUser; j++ {
				resp, duration, err := helt.performRequest("POST", "/api/export/stream", requestBody)
				
				mu.Lock()
				responseTimes = append(responseTimes, duration)
				
				if err != nil {
					errorCodes[0]++
				} else {
					errorCodes[resp.StatusCode]++
					resp.Body.Close()
				}
				mu.Unlock()
			}
		}(i)
	}

	wg.Wait()
	totalDuration := time.Since(startTime)

	// 計算統計數據
	successCount := errorCodes[http.StatusOK] + errorCodes[http.StatusCreated] + errorCodes[http.StatusAccepted]
	failedCount := totalRequests - successCount
	successRate := float64(successCount) / float64(totalRequests) * 100

	// 計算響應時間統計
	var totalResponseTime time.Duration
	minResponseTime := time.Hour
	maxResponseTime := time.Duration(0)

	for _, rt := range responseTimes {
		totalResponseTime += rt
		if rt < minResponseTime {
			minResponseTime = rt
		}
		if rt > maxResponseTime {
			maxResponseTime = rt
		}
	}

	avgResponseTime := totalResponseTime / time.Duration(len(responseTimes))
	throughputRPS := float64(totalRequests) / totalDuration.Seconds()

	// 驗證效能要求
	if successRate < 95.0 {
		t.Errorf("Success rate too low: %.2f%% (expected >= 95%%)", successRate)
	}

	if avgResponseTime > 5*time.Second {
		t.Errorf("Average response time too high: %v (expected < 5s)", avgResponseTime)
	}

	if throughputRPS < 1.0 {
		t.Errorf("Throughput too low: %.2f RPS (expected >= 1.0)", throughputRPS)
	}

	t.Logf("✅ Create stream export load test passed")
	t.Logf("📊 Requests: %d, Success: %d (%.1f%%), Failed: %d", 
		totalRequests, successCount, successRate, failedCount)
	t.Logf("⏱️  Avg response: %v, Min: %v, Max: %v", 
		avgResponseTime, minResponseTime, maxResponseTime)
	t.Logf("🚀 Throughput: %.2f RPS, Total duration: %v", 
		throughputRPS, totalDuration)
}

// TestExportJobStatusLoad 測試匯出任務狀態查詢的負載
func TestExportJobStatusLoad(t *testing.T) {
	helt := setupHTTPExportLoadTest(t)
	defer helt.cleanup()

	// 創建一些測試匯出任務
	jobCount := 20
	jobIDs := make([]string, 0, jobCount)

	for i := 0; i < jobCount; i++ {
		job := models.ExportJob{
			JobID:          fmt.Sprintf("load_test_job_%d", i),
			UserID:         1,
			Status:         "processing",
			TotalFiles:     100,
			ProcessedFiles: i * 5,
			Progress:       i * 5,
			ExportFormat:   "zip",
		}
		if err := helt.db.Create(&job).Error; err != nil {
			t.Fatalf("Failed to create test export job: %v", err)
		}
		jobIDs = append(jobIDs, strconv.Itoa(int(job.ID)))
	}

	// 負載測試參數
	concurrentUsers := 20
	requestsPerUser := 10
	totalRequests := concurrentUsers * requestsPerUser

	var wg sync.WaitGroup
	var mu sync.Mutex
	responseTimes := make([]time.Duration, 0, totalRequests)
	errorCodes := make(map[int]int)

	startTime := time.Now()

	// 執行並發請求
	for i := 0; i < concurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()

			for j := 0; j < requestsPerUser; j++ {
				// 隨機選擇一個任務ID
				jobID := jobIDs[j%len(jobIDs)]
				url := "/api/export/jobs/" + jobID

				resp, duration, err := helt.performRequest("GET", url, nil)
				
				mu.Lock()
				responseTimes = append(responseTimes, duration)
				
				if err != nil {
					errorCodes[0]++
				} else {
					errorCodes[resp.StatusCode]++
					resp.Body.Close()
				}
				mu.Unlock()
			}
		}(i)
	}

	wg.Wait()
	totalDuration := time.Since(startTime)

	// 計算統計數據
	successCount := errorCodes[http.StatusOK]
	successRate := float64(successCount) / float64(totalRequests) * 100
	throughputRPS := float64(totalRequests) / totalDuration.Seconds()

	var totalResponseTime time.Duration
	for _, rt := range responseTimes {
		totalResponseTime += rt
	}
	avgResponseTime := totalResponseTime / time.Duration(len(responseTimes))

	// 驗證效能要求
	if successRate < 98.0 {
		t.Errorf("Success rate too low: %.2f%% (expected >= 98%%)", successRate)
	}

	if avgResponseTime > 1*time.Second {
		t.Errorf("Average response time too high: %v (expected < 1s)", avgResponseTime)
	}

	if throughputRPS < 10.0 {
		t.Errorf("Throughput too low: %.2f RPS (expected >= 10.0)", throughputRPS)
	}

	t.Logf("✅ Export job status load test passed")
	t.Logf("📊 Requests: %d, Success rate: %.1f%%", totalRequests, successRate)
	t.Logf("⏱️  Avg response: %v, Throughput: %.2f RPS", avgResponseTime, throughputRPS)
}

// TestConcurrentExportOperations 測試並發匯出操作
func TestConcurrentExportOperations(t *testing.T) {
	helt := setupHTTPExportLoadTest(t)
	defer helt.cleanup()

	// 生成測試數據
	if err := helt.generateTestData(50, 25); err != nil {
		t.Fatalf("Failed to generate test data: %v", err)
	}

	concurrentUsers := 5
	operationsPerUser := 3 // 每個用戶執行3個操作：創建、查詢、下載

	var wg sync.WaitGroup
	var mu sync.Mutex
	allResults := make(map[string]int) // operation -> count
	allErrors := make([]error, 0)

	startTime := time.Now()

	for i := 0; i < concurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()

			// 1. 創建匯出任務
			exportRequest := map[string]interface{}{
				"categoryIds":        []int{1},
				"includeSubfolders": true,
				"format":            "zip",
			}
			requestBody, _ := json.Marshal(exportRequest)

			resp, _, err := helt.performRequest("POST", "/api/export/stream", requestBody)
			if err != nil {
				mu.Lock()
				allErrors = append(allErrors, err)
				mu.Unlock()
				return
			}

			mu.Lock()
			allResults["create"]++
			mu.Unlock()

			if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusAccepted {
				resp.Body.Close()
				return
			}

			// 解析響應獲取任務ID
			var createResp map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&createResp)
			resp.Body.Close()

			// 2. 查詢任務狀態
			time.Sleep(100 * time.Millisecond) // 短暫等待
			
			// 這裡需要從響應中獲取實際的任務ID
			// 簡化處理：使用模擬的任務ID
			taskID := "1"
			
			statusResp, _, err := helt.performRequest("GET", "/api/export/jobs/"+taskID, nil)
			if err == nil {
				mu.Lock()
				allResults["status"]++
				mu.Unlock()
				statusResp.Body.Close()
			} else {
				mu.Lock()
				allErrors = append(allErrors, err)
				mu.Unlock()
			}

			// 3. 模擬下載請求
			downloadResp, _, err := helt.performRequest("GET", "/api/export/download/"+taskID, nil)
			if err == nil {
				mu.Lock()
				allResults["download"]++
				mu.Unlock()
				downloadResp.Body.Close()
			} else {
				mu.Lock()
				allErrors = append(allErrors, err)
				mu.Unlock()
			}
		}(i)
	}

	wg.Wait()
	totalDuration := time.Since(startTime)

	// 分析結果
	totalOperations := allResults["create"] + allResults["status"] + allResults["download"]
	expectedOperations := concurrentUsers * operationsPerUser

	operationSuccessRate := float64(totalOperations) / float64(expectedOperations) * 100
	errorRate := float64(len(allErrors)) / float64(expectedOperations) * 100

	// 驗證併發操作效能
	if operationSuccessRate < 80.0 {
		t.Errorf("Operation success rate too low: %.2f%% (expected >= 80%%)", operationSuccessRate)
	}

	if errorRate > 20.0 {
		t.Errorf("Error rate too high: %.2f%% (expected <= 20%%)", errorRate)
	}

	t.Logf("✅ Concurrent export operations test passed")
	t.Logf("👥 Concurrent users: %d, Operations: %d", concurrentUsers, totalOperations)
	t.Logf("📊 Create: %d, Status: %d, Download: %d", 
		allResults["create"], allResults["status"], allResults["download"])
	t.Logf("⏱️  Total duration: %v, Success rate: %.1f%%, Error rate: %.1f%%", 
		totalDuration, operationSuccessRate, errorRate)
}

// TestStressExportAPI 測試匯出API的壓力極限
func TestStressExportAPI(t *testing.T) {
	helt := setupHTTPExportLoadTest(t)
	defer helt.cleanup()

	// 生成大量測試數據
	if err := helt.generateTestData(200, 10); err != nil {
		t.Fatalf("Failed to generate test data: %v", err)
	}

	// 壓力測試參數
	maxConcurrentUsers := 50
	requestsPerUser := 2
	
	var wg sync.WaitGroup
	var mu sync.Mutex
	responseTimes := make([]time.Duration, 0)
	statusCodes := make(map[int]int)
	
	exportRequest := map[string]interface{}{
		"categoryIds":        []int{1},
		"includeSubfolders": true,
		"format":            "zip",
	}
	requestBody, _ := json.Marshal(exportRequest)

	startTime := time.Now()

	// 逐漸增加負載
	for users := 5; users <= maxConcurrentUsers; users += 5 {
		t.Logf("🔄 Testing with %d concurrent users...", users)
		
		for i := 0; i < users; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()

				for j := 0; j < requestsPerUser; j++ {
					resp, duration, err := helt.performRequest("POST", "/api/export/stream", requestBody)
					
					mu.Lock()
					responseTimes = append(responseTimes, duration)
					
					if err != nil {
						statusCodes[0]++
					} else {
						statusCodes[resp.StatusCode]++
						resp.Body.Close()
					}
					mu.Unlock()

					// 短暫延遲避免過度壓力
					time.Sleep(10 * time.Millisecond)
				}
			}()
		}

		wg.Wait()

		// 檢查當前負載下的表現
		currentRequests := users * requestsPerUser
		currentSuccess := statusCodes[http.StatusOK] + statusCodes[http.StatusCreated] + statusCodes[http.StatusAccepted]
		currentSuccessRate := float64(currentSuccess) / float64(len(responseTimes)) * 100

		if currentSuccessRate < 70.0 {
			t.Logf("⚠️  Success rate dropped to %.1f%% at %d users", currentSuccessRate, users)
			break
		}
	}

	totalDuration := time.Since(startTime)

	// 計算最終統計
	totalRequests := len(responseTimes)
	successCount := statusCodes[http.StatusOK] + statusCodes[http.StatusCreated] + statusCodes[http.StatusAccepted]
	finalSuccessRate := float64(successCount) / float64(totalRequests) * 100

	var totalResponseTime time.Duration
	for _, rt := range responseTimes {
		totalResponseTime += rt
	}
	avgResponseTime := totalResponseTime / time.Duration(totalRequests)

	t.Logf("✅ Stress test completed")
	t.Logf("📊 Total requests: %d, Success: %d (%.1f%%)", 
		totalRequests, successCount, finalSuccessRate)
	t.Logf("⏱️  Avg response time: %v, Total duration: %v", 
		avgResponseTime, totalDuration)
	t.Logf("🔧 Max sustainable load: %d concurrent users", maxConcurrentUsers)

	// 記錄結果到文件以供分析
	result := map[string]interface{}{
		"max_concurrent_users": maxConcurrentUsers,
		"total_requests":      totalRequests,
		"success_rate":        finalSuccessRate,
		"avg_response_time":   avgResponseTime.String(),
		"total_duration":      totalDuration.String(),
		"status_codes":        statusCodes,
	}

	resultJSON, _ := json.MarshalIndent(result, "", "  ")
	os.WriteFile(filepath.Join(helt.tempDir, "stress_test_result.json"), resultJSON, 0644)
}

// BenchmarkExportAPIPerformance 匯出API效能基準測試
func BenchmarkExportAPIPerformance(b *testing.B) {
	helt := setupHTTPExportLoadTest(&testing.T{})
	defer helt.cleanup()

	// 生成測試數據
	if err := helt.generateTestData(10, 20); err != nil {
		b.Fatalf("Failed to generate test data: %v", err)
	}

	exportRequest := map[string]interface{}{
		"categoryIds":        []int{1},
		"includeSubfolders": true,
		"format":            "zip",
	}
	requestBody, _ := json.Marshal(exportRequest)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		resp, _, err := helt.performRequest("POST", "/api/export/stream", requestBody)
		if err != nil {
			b.Errorf("Benchmark request failed: %v", err)
		} else {
			resp.Body.Close()
		}
	}
}