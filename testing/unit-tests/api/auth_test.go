package api_test

import (
	"bytes"
	"encoding/json"
	"memoryark/internal/models"
	"memoryark/testing/backend-tests/helpers"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
)

// AuthTestSuite 認證測試套件
type AuthTestSuite struct {
	suite.Suite
	testConfig *helpers.TestConfig
	db         *gorm.DB
	router     *gin.Engine
}

// SetupSuite 在所有測試開始前執行
func (suite *AuthTestSuite) SetupSuite() {
	// 設定測試環境
	suite.testConfig = helpers.SetupTestEnvironment(suite.T())
	suite.db = suite.testConfig.DB
	suite.router = suite.testConfig.Router
}

// TearDownSuite 在所有測試結束後執行
func (suite *AuthTestSuite) TearDownSuite() {
	helpers.CleanupTestEnvironment(suite.T(), suite.testConfig)
}

// SetupTest 在每個測試前執行
func (suite *AuthTestSuite) SetupTest() {
	// 清理測試資料
	suite.db.Exec("DELETE FROM users WHERE email LIKE '%@test.com'")
	suite.db.Exec("DELETE FROM registrations WHERE email LIKE '%@test.com'")
}

// TestGetAuthStatus_Unauthenticated 測試未認證狀態
func (suite *AuthTestSuite) TestGetAuthStatus_Unauthenticated() {
	req, _ := http.NewRequest("GET", "/api/auth/status", nil)
	w := httptest.NewRecorder()
	
	suite.router.ServeHTTP(w, req)
	
	// 驗證回應
	response := helpers.AssertJSONResponse(suite.T(), w, http.StatusOK)
	assert.True(suite.T(), response["success"].(bool))
	
	data := response["data"].(map[string]interface{})
	assert.False(suite.T(), data["authenticated"].(bool))
	assert.Nil(suite.T(), data["user"])
}

// TestGetAuthStatus_Authenticated 測試已認證狀態
func (suite *AuthTestSuite) TestGetAuthStatus_Authenticated() {
	// 建立測試用戶
	user := &models.User{
		Email:  "auth-test@test.com",
		Name:   "Auth Test User",
		Role:   "user",
		Status: "active",
	}
	suite.db.Create(user)
	
	// 發送認證請求
	req, _ := http.NewRequest("GET", "/api/auth/status", nil)
	req.Header.Set("CF-Access-Authenticated-User-Email", user.Email)
	w := httptest.NewRecorder()
	
	suite.router.ServeHTTP(w, req)
	
	// 驗證回應
	response := helpers.AssertSuccessResponse(suite.T(), w)
	data := response["data"].(map[string]interface{})
	
	assert.True(suite.T(), data["authenticated"].(bool))
	assert.NotNil(suite.T(), data["user"])
	
	userData := data["user"].(map[string]interface{})
	assert.Equal(suite.T(), user.Email, userData["email"])
	assert.Equal(suite.T(), user.Name, userData["name"])
}

// TestRegister_Success 測試成功註冊
func (suite *AuthTestSuite) TestRegister_Success() {
	// 準備註冊資料
	registerData := map[string]interface{}{
		"email":  "newuser@test.com",
		"name":   "New Test User",
		"reason": "想要使用系統管理教會檔案",
	}
	
	jsonData, _ := json.Marshal(registerData)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("CF-Access-Authenticated-User-Email", "newuser@test.com")
	
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)
	
	// 驗證回應
	response := helpers.AssertSuccessResponse(suite.T(), w)
	assert.Contains(suite.T(), response["message"], "註冊申請已提交")
	
	// 驗證資料庫記錄
	var registration models.Registration
	err := suite.db.Where("email = ?", "newuser@test.com").First(&registration).Error
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "pending", registration.Status)
}

// TestRegister_DuplicateEmail 測試重複註冊
func (suite *AuthTestSuite) TestRegister_DuplicateEmail() {
	// 先建立一個用戶
	existingUser := &models.User{
		Email:  "existing@test.com",
		Name:   "Existing User",
		Role:   "user",
		Status: "active",
	}
	suite.db.Create(existingUser)
	
	// 嘗試使用相同 email 註冊
	registerData := map[string]interface{}{
		"email":  "existing@test.com",
		"name":   "Duplicate User",
		"reason": "測試重複註冊",
	}
	
	jsonData, _ := json.Marshal(registerData)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("CF-Access-Authenticated-User-Email", "existing@test.com")
	
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)
	
	// 應該返回錯誤
	helpers.AssertErrorResponse(suite.T(), w, http.StatusBadRequest, "USER_EXISTS")
}

// TestRegister_InvalidData 測試無效註冊資料
func (suite *AuthTestSuite) TestRegister_InvalidData() {
	testCases := []struct {
		name         string
		data         map[string]interface{}
		expectedCode string
	}{
		{
			name: "缺少 email",
			data: map[string]interface{}{
				"name":   "Test User",
				"reason": "測試",
			},
			expectedCode: "VALIDATION_ERROR",
		},
		{
			name: "缺少 name",
			data: map[string]interface{}{
				"email":  "test@test.com",
				"reason": "測試",
			},
			expectedCode: "VALIDATION_ERROR",
		},
		{
			name: "無效 email 格式",
			data: map[string]interface{}{
				"email":  "invalid-email",
				"name":   "Test User",
				"reason": "測試",
			},
			expectedCode: "VALIDATION_ERROR",
		},
	}
	
	for _, tc := range testCases {
		suite.T().Run(tc.name, func(t *testing.T) {
			jsonData, _ := json.Marshal(tc.data)
			req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("CF-Access-Authenticated-User-Email", "test@test.com")
			
			w := httptest.NewRecorder()
			suite.router.ServeHTTP(w, req)
			
			helpers.AssertErrorResponse(t, w, http.StatusBadRequest, tc.expectedCode)
		})
	}
}

// TestGetCurrentUser_Success 測試取得當前用戶資訊
func (suite *AuthTestSuite) TestGetCurrentUser_Success() {
	// 建立測試用戶
	user := &models.User{
		Email:  "current@test.com",
		Name:   "Current User",
		Role:   "user",
		Status: "active",
	}
	suite.db.Create(user)
	
	// 發送請求
	w := helpers.MakeAuthenticatedRequest(suite.router, "GET", "/api/auth/me", nil, user)
	
	// 驗證回應
	response := helpers.AssertSuccessResponse(suite.T(), w)
	userData := response["data"].(map[string]interface{})
	
	assert.Equal(suite.T(), user.Email, userData["email"])
	assert.Equal(suite.T(), user.Name, userData["name"])
	assert.Equal(suite.T(), user.Role, userData["role"])
}

// TestGetCurrentUser_Unauthenticated 測試未認證用戶取得資訊
func (suite *AuthTestSuite) TestGetCurrentUser_Unauthenticated() {
	w := helpers.MakeAuthenticatedRequest(suite.router, "GET", "/api/auth/me", nil, nil)
	helpers.AssertErrorResponse(suite.T(), w, http.StatusUnauthorized, "UNAUTHORIZED")
}

// TestGetCurrentUser_SuspendedUser 測試停用用戶
func (suite *AuthTestSuite) TestGetCurrentUser_SuspendedUser() {
	// 建立停用的用戶
	user := &models.User{
		Email:  "suspended@test.com",
		Name:   "Suspended User",
		Role:   "user",
		Status: "suspended",
	}
	suite.db.Create(user)
	
	// 發送請求
	w := helpers.MakeAuthenticatedRequest(suite.router, "GET", "/api/auth/me", nil, user)
	
	// 應該返回禁止訪問
	helpers.AssertErrorResponse(suite.T(), w, http.StatusForbidden, "USER_SUSPENDED")
}

// TestAuthMiddleware_CloudflareHeaders 測試 Cloudflare 認證標頭
func (suite *AuthTestSuite) TestAuthMiddleware_CloudflareHeaders() {
	// 測試不同的 header 名稱
	headerNames := []string{
		"CF-Access-Authenticated-User-Email",
		"Cf-Access-Authenticated-User-Email",
		"cf-access-authenticated-user-email",
	}
	
	user := &models.User{
		Email:  "header-test@test.com",
		Name:   "Header Test User",
		Role:   "user",
		Status: "active",
	}
	suite.db.Create(user)
	
	for _, headerName := range headerNames {
		suite.T().Run(headerName, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "/api/auth/me", nil)
			req.Header.Set(headerName, user.Email)
			
			w := httptest.NewRecorder()
			suite.router.ServeHTTP(w, req)
			
			// 所有 header 變體都應該能成功認證
			response := helpers.AssertSuccessResponse(t, w)
			userData := response["data"].(map[string]interface{})
			assert.Equal(t, user.Email, userData["email"])
		})
	}
}

// TestSuite 執行測試套件
func TestAuthTestSuite(t *testing.T) {
	suite.Run(t, new(AuthTestSuite))
}