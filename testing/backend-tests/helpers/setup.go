package helpers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"memoryark/internal/config"
	"memoryark/internal/database"
	"memoryark/internal/models"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

// TestConfig 測試環境配置
type TestConfig struct {
	DB         *gorm.DB
	Router     *gin.Engine
	AdminUser  *models.User
	NormalUser *models.User
	TestFiles  []string
}

// SetupTestEnvironment 設定測試環境
func SetupTestEnvironment(t *testing.T) *TestConfig {
	// 設定測試模式
	gin.SetMode(gin.TestMode)

	// 載入測試環境變數
	err := loadTestEnv()
	assert.NoError(t, err, "Failed to load test environment")

	// 初始化測試資料庫
	db := setupTestDatabase(t)

	// 建立測試目錄
	setupTestDirectories(t)

	// 初始化路由（這裡需要從實際的 router 中匯入）
	router := gin.New()
	// TODO: 設定實際的路由

	// 建立測試用戶
	adminUser := createTestUser(t, db, "admin@test.com", "admin")
	normalUser := createTestUser(t, db, "user@test.com", "user")

	return &TestConfig{
		DB:         db,
		Router:     router,
		AdminUser:  adminUser,
		NormalUser: normalUser,
	}
}

// CleanupTestEnvironment 清理測試環境
func CleanupTestEnvironment(t *testing.T, tc *TestConfig) {
	// 清理測試檔案
	for _, file := range tc.TestFiles {
		os.Remove(file)
	}

	// 清理測試目錄
	os.RemoveAll("../test-data/uploads")
	os.RemoveAll("../test-data/logs")

	// 關閉資料庫連接
	sqlDB, err := tc.DB.DB()
	if err == nil {
		sqlDB.Close()
	}

	// 刪除測試資料庫
	os.Remove("../test-data/test.db")
}

// loadTestEnv 載入測試環境變數
func loadTestEnv() error {
	// 設定測試環境變數
	os.Setenv("ENVIRONMENT", "test")
	os.Setenv("DATABASE_PATH", "../test-data/test.db")
	os.Setenv("UPLOAD_PATH", "../test-data/uploads")
	os.Setenv("LOG_PATH", "../test-data/logs")
	os.Setenv("ROOT_ADMIN_EMAIL", "test-admin@example.com")
	os.Setenv("CLOUDFLARE_AUTH_ENABLED", "false")
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-only")
	os.Setenv("PORT", "7002")
	os.Setenv("HOST", "localhost")

	return nil
}

// setupTestDatabase 設定測試資料庫
func setupTestDatabase(t *testing.T) *gorm.DB {
	// 建立測試資料目錄
	err := os.MkdirAll("../test-data", 0755)
	assert.NoError(t, err, "Failed to create test data directory")

	// 初始化測試資料庫
	db, err := database.InitDatabase("../test-data/test.db")
	assert.NoError(t, err, "Failed to initialize test database")

	// 執行資料庫遷移
	err = db.AutoMigrate(
		&models.User{},
		&models.File{},
		&models.Category{},
		&models.ShareLink{},
		&models.ActivityLog{},
		&models.Registration{},
		&models.ExportJob{},
		&models.DownloadHistory{},
	)
	assert.NoError(t, err, "Failed to migrate database")

	return db
}

// setupTestDirectories 建立測試目錄
func setupTestDirectories(t *testing.T) {
	dirs := []string{
		"../test-data/uploads",
		"../test-data/logs",
	}

	for _, dir := range dirs {
		err := os.MkdirAll(dir, 0755)
		assert.NoError(t, err, fmt.Sprintf("Failed to create directory: %s", dir))
	}
}

// createTestUser 建立測試用戶
func createTestUser(t *testing.T, db *gorm.DB, email, role string) *models.User {
	user := &models.User{
		Email:    email,
		Name:     fmt.Sprintf("Test %s", role),
		Role:     role,
		Status:   "active",
		Provider: "test",
	}

	err := db.Create(user).Error
	assert.NoError(t, err, fmt.Sprintf("Failed to create test %s user", role))

	return user
}

// MakeAuthenticatedRequest 建立帶認證的請求
func MakeAuthenticatedRequest(router *gin.Engine, method, path string, body interface{}, user *models.User) *httptest.ResponseRecorder {
	var reqBody io.Reader
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, _ := http.NewRequest(method, path, reqBody)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	// 設定測試用認證 header
	if user != nil {
		req.Header.Set("CF-Access-Authenticated-User-Email", user.Email)
	}

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	return w
}

// CreateTestFile 建立測試檔案
func CreateTestFile(t *testing.T, filename string, content []byte) string {
	filepath := filepath.Join("../test-data/uploads", filename)
	err := os.WriteFile(filepath, content, 0644)
	assert.NoError(t, err, "Failed to create test file")
	return filepath
}

// AssertJSONResponse 驗證 JSON 回應
func AssertJSONResponse(t *testing.T, w *httptest.ResponseRecorder, expectedStatus int) map[string]interface{} {
	assert.Equal(t, expectedStatus, w.Code, "Unexpected status code")

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err, "Failed to parse JSON response")

	return response
}

// AssertSuccessResponse 驗證成功回應
func AssertSuccessResponse(t *testing.T, w *httptest.ResponseRecorder) map[string]interface{} {
	response := AssertJSONResponse(t, w, http.StatusOK)
	assert.True(t, response["success"].(bool), "Expected success response")
	return response
}

// AssertErrorResponse 驗證錯誤回應
func AssertErrorResponse(t *testing.T, w *httptest.ResponseRecorder, expectedStatus int, expectedCode string) {
	response := AssertJSONResponse(t, w, expectedStatus)
	assert.False(t, response["success"].(bool), "Expected error response")
	
	if error, ok := response["error"].(map[string]interface{}); ok {
		assert.Equal(t, expectedCode, error["code"], "Unexpected error code")
	} else {
		t.Fatal("Missing error object in response")
	}
}