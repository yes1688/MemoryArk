package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"memoryark/internal/config"
	"memoryark/internal/models"
)

// CloudflareAccessMiddleware Cloudflare Access 認證中間件
func CloudflareAccessMiddleware(cfg *config.Config, db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 檢查 Cloudflare Access 標頭 - 嘗試多種可能的格式
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
				// 用戶不存在，需要註冊
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
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

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
