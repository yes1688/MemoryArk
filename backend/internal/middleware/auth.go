package middleware

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"memoryark/internal/config"
	"memoryark/internal/models"
)

// CloudflareAccessMiddleware Cloudflare Access 認證中間件
func CloudflareAccessMiddleware(cfg *config.Config, db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 調試信息 - 確保中間件被調用
		fmt.Printf("[DEBUG] 🔧 CloudflareAccessMiddleware: %s %s | Enabled=%v | Bypass=%v\n", 
			c.Request.Method, c.Request.URL.Path, cfg.Development.Enabled, cfg.Development.BypassAuth)
		
		// 開發者模式：直接給予管理員權限，跳過所有檢查
		if cfg.Development.Enabled && cfg.Development.BypassAuth {
			// DEBUG: 添加日誌來確認開發模式
			fmt.Printf("🔧 DEBUG: 開發模式繞過認證 - %s %s\n", c.Request.Method, c.Request.URL.Path)
			devEmail := cfg.Development.AutoLoginEmail
			if devEmail == "" {
				devEmail = cfg.Admin.RootEmail
			}
			fmt.Printf("🔧 DEBUG: 使用開發者郵箱: %s\n", devEmail)
			
			// 查詢資料庫中對應的用戶ID
			var user models.User
			if err := db.Where("email = ?", devEmail).First(&user).Error; err == nil {
				// 找到對應用戶，使用真實的用戶資料
				fmt.Printf("🔧 DEBUG: 找到用戶 ID=%d, Email=%s\n", user.ID, user.Email)
				c.Set("user_id", user.ID)
				c.Set("user_email", user.Email)
				c.Set("user_role", user.Role)
				c.Set("user", user)
			} else {
				// 找不到對應用戶，使用預設管理員 (ID=1)
				fmt.Printf("🔧 DEBUG: 用戶不存在 (%v)，使用預設管理員\n", err)
				c.Set("user_id", uint(1))
				c.Set("user_email", devEmail)
				c.Set("user_role", "admin")
				c.Set("user", models.User{
					ID:     1,
					Email:  devEmail,
					Name:   cfg.Admin.RootName,
					Role:   "admin",
					Status: "approved",
				})
			}
			fmt.Printf("🔧 DEBUG: 設置完畢，呼叫 c.Next()\n")
			c.Next()
			fmt.Printf("🔧 DEBUG: c.Next() 完成\n")
			return
		}

		// 正常模式：檢查 Cloudflare Access 標頭
		cfAccessEmail := c.GetHeader("CF-Access-Authenticated-User-Email")
		if cfAccessEmail == "" {
			cfAccessEmail = c.GetHeader("Cf-Access-Authenticated-User-Email")
		}
		if cfAccessEmail == "" {
			cfAccessEmail = c.GetHeader("cf-access-authenticated-user-email")
		}
		if cfAccessEmail == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": "CF_ACCESS_HEADER_MISSING",
				"message": "Cloudflare Access authentication required",
			})
			c.Abort()
			return
		}

		// 查找用戶
		var user models.User
		if err := db.Where("email = ?", cfAccessEmail).First(&user).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"error": "USER_NOT_REGISTERED",
					"message": "User needs to complete registration process",
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error": "DATABASE_ERROR",
					"message": "Failed to query user",
				})
			}
			c.Abort()
			return
		}

		// 檢查用戶狀態
		if user.Status != "approved" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": "USER_NOT_APPROVED",
				"message": "User registration is pending approval",
			})
			c.Abort()
			return
		}

		// 將用戶信息存儲到上下文
		c.Set("user_id", user.ID)
		c.Set("user_email", user.Email)
		c.Set("user_role", user.Role)
		c.Set("user", user)
		
		c.Next()
	}
}

// RequireRole 角色檢查中間件
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": "UNAUTHORIZED",
				"message": "User not authenticated",
			})
			c.Abort()
			return
		}

		role := userRole.(string)
		for _, requiredRole := range roles {
			if role == requiredRole {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": "INSUFFICIENT_PERMISSIONS",
			"message": "User does not have required permissions",
		})
		c.Abort()
	}
}

// AdminMiddleware 管理員權限中間件
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin access required",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// CORSMiddleware CORS 中間件
func CORSMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg.Development.Enabled && cfg.Development.CORSEnabled {
			// 開發模式：寬鬆的 CORS 設定
			c.Header("Access-Control-Allow-Origin", "*")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
			c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		} else {
			// 正常模式：標準 CORS 設定
			c.Header("Access-Control-Allow-Origin", "*")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
			c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// LoggerMiddleware 自定義日誌中間件
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 可以在這裡添加自定義日誌邏輯
		c.Next()
	}
}
