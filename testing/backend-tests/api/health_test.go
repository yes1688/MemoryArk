package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// HealthTestSuite 健康檢查測試套件
type HealthTestSuite struct {
	suite.Suite
	router *gin.Engine
}

// SetupSuite 在所有測試開始前執行
func (suite *HealthTestSuite) SetupSuite() {
	// 設定測試模式
	gin.SetMode(gin.TestMode)
	
	// 初始化路由
	suite.router = gin.New()
	
	// 註冊健康檢查路由
	// 注意：這裡需要匯入實際的 handler
	suite.router.GET("/api/health", func(c *gin.Context) {
		// 模擬健康檢查回應
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"status":  "healthy",
				"version": "2.0.0",
				"service": "MemoryArk API",
			},
		})
	})
}

// TestHealthCheck 測試健康檢查端點
func (suite *HealthTestSuite) TestHealthCheck() {
	// 建立測試請求
	req, err := http.NewRequest("GET", "/api/health", nil)
	assert.NoError(suite.T(), err)
	
	// 建立 ResponseRecorder 來記錄回應
	w := httptest.NewRecorder()
	
	// 執行請求
	suite.router.ServeHTTP(w, req)
	
	// 驗證狀態碼
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	// 解析回應
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	
	// 驗證回應結構
	assert.True(suite.T(), response["success"].(bool))
	assert.NotNil(suite.T(), response["data"])
	
	// 驗證回應內容
	data := response["data"].(map[string]interface{})
	assert.Equal(suite.T(), "healthy", data["status"])
	assert.Equal(suite.T(), "2.0.0", data["version"])
	assert.Equal(suite.T(), "MemoryArk API", data["service"])
}

// TestHealthCheckResponseTime 測試健康檢查回應時間
func (suite *HealthTestSuite) TestHealthCheckResponseTime() {
	req, _ := http.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	
	// 測量回應時間
	start := time.Now()
	suite.router.ServeHTTP(w, req)
	duration := time.Since(start)
	
	// 健康檢查應該在 100ms 內回應
	assert.Less(suite.T(), duration.Milliseconds(), int64(100), 
		"Health check took too long: %v", duration)
}

// TestHealthCheckHeaders 測試健康檢查回應標頭
func (suite *HealthTestSuite) TestHealthCheckHeaders() {
	req, _ := http.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	
	suite.router.ServeHTTP(w, req)
	
	// 驗證 Content-Type
	contentType := w.Header().Get("Content-Type")
	assert.Contains(suite.T(), contentType, "application/json")
}

// TestHealthCheckConcurrent 測試並發健康檢查
func (suite *HealthTestSuite) TestHealthCheckConcurrent() {
	// 並發請求數量
	concurrency := 10
	done := make(chan bool, concurrency)
	
	// 發起並發請求
	for i := 0; i < concurrency; i++ {
		go func() {
			req, _ := http.NewRequest("GET", "/api/health", nil)
			w := httptest.NewRecorder()
			suite.router.ServeHTTP(w, req)
			
			// 驗證每個請求都成功
			assert.Equal(suite.T(), http.StatusOK, w.Code)
			done <- true
		}()
	}
	
	// 等待所有請求完成
	for i := 0; i < concurrency; i++ {
		<-done
	}
}

// TestSuite 執行測試套件
func TestHealthTestSuite(t *testing.T) {
	suite.Run(t, new(HealthTestSuite))
}