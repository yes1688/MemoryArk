package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	
	"memoryark/internal/auth"
	"memoryark/internal/config"
	"memoryark/internal/models"
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

// RegisterRequest 註冊請求結構
type RegisterRequest struct {
	Email  string `json:"email" binding:"required,email"`
	Name   string `json:"name" binding:"required"`
	Reason string `json:"reason"`
}

// LoginRequest 登錄請求結構
type LoginRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// RefreshTokenRequest 刷新令牌請求結構
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// Register 用戶註冊申請
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}
	
	// 檢查是否已經註冊
	var existingUser models.User
	if err := h.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "User already exists",
		})
		return
	}
	
	// 檢查是否已有待審核的申請
	var existingRequest models.UserRegistrationRequest
	if err := h.db.Where("email = ? AND status = ?", req.Email, "pending").First(&existingRequest).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Registration request already pending",
		})
		return
	}
	
	// 創建註冊申請
	registrationRequest := models.UserRegistrationRequest{
		Email:  req.Email,
		Name:   req.Name,
		Reason: req.Reason,
		Status: "pending",
	}
	
	if err := h.db.Create(&registrationRequest).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create registration request",
		})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration request submitted successfully",
		"id":      registrationRequest.ID,
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
