package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"memoryark/internal/config"
)

// APITokenMiddleware API Token 認證中間件
// 用於驗證服務間通信的 API Token (如 LINE Service 呼叫 MemoryArk API)
func APITokenMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 開發模式：跳過 API Token 檢查但仍設置必要的上下文
		if cfg.Development.Enabled && cfg.Development.BypassAuth {
			fmt.Printf("🔧 API Token DEBUG: 開發模式跳過 API Token 驗證 - %s %s\n", 
				c.Request.Method, c.Request.URL.Path)
			// 即使在開發模式下也要設置服務身份，確保 file upload 能正常工作
			c.Set("api_client", "line_service")
			c.Set("auth_type", "api_token_dev")
			c.Set("user_id", uint(0)) // 設置系統服務用戶 ID
			c.Next()
			return
		}

		// 生產模式：檢查 API Token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Missing Authorization header",
				"code":    "MISSING_API_TOKEN",
			})
			return
		}

		// 檢查 Bearer Token 格式
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Invalid Authorization header format. Expected: Bearer <token>",
				"code":    "INVALID_TOKEN_FORMAT",
			})
			return
		}

		// 提取 Token
		apiToken := strings.TrimPrefix(authHeader, "Bearer ")
		if apiToken == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Empty API token",
				"code":    "EMPTY_API_TOKEN",
			})
			return
		}

		// 驗證 API Token
		if !validateAPIToken(apiToken, cfg) {
			fmt.Printf("🚨 API Token 驗證失敗: %s from %s\n", apiToken[:8]+"...", c.ClientIP())
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Invalid API token",
				"code":    "INVALID_API_TOKEN",
			})
			return
		}

		// 驗證成功，設置服務身份
		c.Set("api_client", "line_service")
		c.Set("auth_type", "api_token")
		// 為 API 服務設置一個特殊的 service user ID (使用 0 表示系統服務)
		c.Set("user_id", uint(0))
		
		fmt.Printf("✅ API Token 驗證成功: %s from %s\n", apiToken[:8]+"...", c.ClientIP())
		c.Next()
	}
}

// validateAPIToken 驗證 API Token 是否有效
func validateAPIToken(token string, cfg *config.Config) bool {
	// 從環境變數或配置中取得有效的 API Token 列表
	validTokens := getValidAPITokens(cfg)
	
	for _, validToken := range validTokens {
		if token == validToken {
			return true
		}
	}
	
	return false
}

// getValidAPITokens 取得有效的 API Token 列表
func getValidAPITokens(cfg *config.Config) []string {
	// 這裡可以從多個來源取得有效 Token：
	// 1. 環境變數
	// 2. 資料庫
	// 3. 配置文件
	// 4. 外部服務
	
	var tokens []string
	
	// 1. 從環境變數取得 LINE Service Token
	if lineToken := cfg.API.LineServiceToken; lineToken != "" {
		tokens = append(tokens, lineToken)
	}
	
	// 2. 未來可以擴展其他服務的 Token
	// if otherServiceToken := cfg.API.OtherServiceToken; otherServiceToken != "" {
	//     tokens = append(tokens, otherServiceToken)
	// }
	
	return tokens
}