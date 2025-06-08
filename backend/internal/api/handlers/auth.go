package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	
	"memoryark/internal/config"
	"memoryark/internal/models"
	"memoryark/internal/auth"
)

// AuthHandler 認證處理器
type AuthHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewAuthHandler 創建認證處理器
func NewAuthHandler(db *gorm.DB, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		db:  db,
		cfg: cfg,
	}
}

// RegisterRequest 註冊請求結構 - 按照規格書定義
type RegisterRequest struct {
	Name  string `json:"name" binding:"required"`
	Phone string `json:"phone" binding:"required"`
}

// LoginRequest 登錄請求結構
type LoginRequest struct {
	Email string `json:"email" binding:"required"`
}

// RefreshTokenRequest 刷新令牌請求結構
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// AuthStatusResponse 認證狀態回應結構
type AuthStatusResponse struct {
	Authenticated      bool         `json:"authenticated"`
	NeedsRegistration  bool         `json:"needsRegistration,omitempty"`
	PendingApproval    bool         `json:"pendingApproval,omitempty"`
	User              *models.User  `json:"user,omitempty"`
}

// GetAuthStatus 檢查當前用戶狀態 - 根據規格書定義
func (h *AuthHandler) GetAuthStatus(c *gin.Context) {
	var email string
	
	// 開發者模式：直接使用配置的管理員郵箱
	if h.cfg.Development.Enabled && h.cfg.Development.BypassAuth {
		email = h.cfg.Development.AutoLoginEmail
		if email == "" {
			email = h.cfg.Admin.RootEmail
		}
	} else {
		// 正常模式：從 Cloudflare Access 標頭獲取用戶郵箱
		email = c.GetHeader("CF-Access-Authenticated-User-Email")
		if email == "" {
			email = c.GetHeader("Cf-Access-Authenticated-User-Email")
		}
		if email == "" {
			email = c.GetHeader("cf-access-authenticated-user-email")
		}
	}
	
	if email == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": AuthStatusResponse{
				Authenticated: false,
			},
		})
		return
	}

	// 檢查用戶是否已在系統中註冊
	var user models.User
	result := h.db.Where("email = ?", email).First(&user)
	
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": AuthStatusResponse{
					Authenticated:     true,
					NeedsRegistration: true,
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "資料庫查詢失敗",
			},
		})
		return
	}

	// 根據用戶狀態返回相應的回應
	response := AuthStatusResponse{
		Authenticated: true,
		User:         &user,
	}
	
	if user.Status == "pending" {
		response.PendingApproval = true
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GetCurrentUser 獲取當前用戶資訊
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code": "UNAUTHORIZED",
				"message": "未授權訪問",
			},
		})
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code": "USER_NOT_FOUND",
				"message": "用戶不存在",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": user,
	})
}

// Register 用戶註冊申請 - 按照規格書實現
func (h *AuthHandler) Register(c *gin.Context) {
	// 從 Cloudflare Access 標頭獲取用戶郵箱 - 嘗試多種可能的格式
	email := c.GetHeader("CF-Access-Authenticated-User-Email")
	if email == "" {
		email = c.GetHeader("Cf-Access-Authenticated-User-Email")
	}
	if email == "" {
		email = c.GetHeader("cf-access-authenticated-user-email")
	}
	if email == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code": "NO_CLOUDFLARE_AUTH",
				"message": "未通過 Cloudflare 認證",
			},
		})
		return
	}

	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "INVALID_REQUEST",
				"message": "請求格式不正確",
				"details": err.Error(),
			},
		})
		return
	}

	// 檢查是否已經有註冊申請
	var existingRequest models.UserRegistrationRequest
	if err := h.db.Where("email = ?", email).First(&existingRequest).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code": "REGISTRATION_EXISTS",
				"message": "註冊申請已存在",
			},
		})
		return
	}

	// 檢查是否已經是註冊用戶
	var existingUser models.User
	if err := h.db.Where("email = ?", email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code": "USER_EXISTS",
				"message": "用戶已存在",
			},
		})
		return
	}

	// 創建註冊申請
	registrationRequest := models.UserRegistrationRequest{
		Email: email,
		Name:  req.Name,
		Phone: req.Phone,
		Status: "pending",
	}

	if err := h.db.Create(&registrationRequest).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "註冊申請提交失敗",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "註冊申請已提交，請等待管理員審核",
		"data": registrationRequest,
	})
}

// Login 用戶登錄
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}
	
	// 查找用戶
	var user models.User
	if err := h.db.Where("email = ? AND status = ?", req.Email, "approved").First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not found or not approved",
		})
		return
	}
	
	// 生成 JWT 令牌
	tokenPair, err := auth.GenerateTokenPair(
		user.ID,
		user.Email,
		user.Role,
		h.cfg.Auth.JWTSecret,
		h.cfg.Auth.TokenExpiry,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate token",
		})
		return
	}
	
	// 更新最後登錄時間
	now := time.Now()
	user.LastLoginAt = &now
	h.db.Save(&user)
	
	c.JSON(http.StatusOK, gin.H{
		"user":         user,
		"access_token": tokenPair.AccessToken,
		"refresh_token": tokenPair.RefreshToken,
		"expires_in":   tokenPair.ExpiresIn,
	})
}

// RefreshToken 刷新令牌
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}
	
	// 刷新令牌
	tokenPair, err := auth.RefreshToken(
		req.RefreshToken,
		h.cfg.Auth.JWTSecret,
		h.cfg.Auth.TokenExpiry,
	)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid refresh token",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"access_token":  tokenPair.AccessToken,
		"refresh_token": tokenPair.RefreshToken,
		"expires_in":    tokenPair.ExpiresIn,
	})
}

// Logout 用戶登出
func (h *AuthHandler) Logout(c *gin.Context) {
	// 在實際應用中，這裡可以實現令牌黑名單機制
	c.JSON(http.StatusOK, gin.H{
		"message": "Logout successful",
	})
}
