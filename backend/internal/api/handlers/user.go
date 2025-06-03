package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	
	"memoryark/internal/config"
	"memoryark/internal/models"
	"memoryark/pkg/logger"
)

// UserHandler 用戶處理器
type UserHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewUserHandler 創建用戶處理器
func NewUserHandler(db *gorm.DB, cfg *config.Config) *UserHandler {
	return &UserHandler{
		db:  db,
		cfg: cfg,
	}
}

// UpdateProfileRequest 更新資料請求結構
type UpdateProfileRequest struct {
	Name   string `json:"name" validate:"required,min=2,max=50"`
	Avatar string `json:"avatar" validate:"url"`
}

// GetProfile 獲取用戶資料
func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		logger.Error("User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用戶未認證",
		})
		return
	}
	
	// 確保 userID 是正確的類型
	userIDUint, ok := userID.(uint)
	if !ok {
		logger.Error("Invalid user ID type")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的用戶ID",
		})
		return
	}
	
	var user models.User
	if err := h.db.First(&user, userIDUint).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("User not found", "user_id", userIDUint)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "用戶不存在",
			})
			return
		}
		logger.Error("Database error when fetching user", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取用戶資料失敗",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

// UpdateProfile 更新用戶資料
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		logger.Error("User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用戶未認證",
		})
		return
	}
	
	userIDUint, ok := userID.(uint)
	if !ok {
		logger.Error("Invalid user ID type")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的用戶ID",
		})
		return
	}
	
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("Invalid request format", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}
	
	var user models.User
	if err := h.db.First(&user, userIDUint).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("User not found for update", "user_id", userIDUint)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "用戶不存在",
			})
			return
		}
		logger.Error("Database error when fetching user for update", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取用戶資料失敗",
		})
		return
	}
	
	// 更新允許的字段
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Avatar != "" {
		user.AvatarURL = req.Avatar
	}
	
	if err := h.db.Save(&user).Error; err != nil {
		logger.Error("Failed to update user profile", "error", err, "user_id", userIDUint)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "更新資料失敗",
		})
		return
	}
	
	logger.Info("User profile updated successfully", "user_id", userIDUint)
	c.JSON(http.StatusOK, gin.H{
		"message": "資料更新成功",
		"user":    user,
	})
}

// GetAllUsers 獲取所有用戶列表（管理員功能）
func (h *UserHandler) GetAllUsers(c *gin.Context) {
	// 檢查分頁參數
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	
	offset := (page - 1) * limit
	
	var users []models.User
	var total int64
	
	// 獲取總數
	if err := h.db.Model(&models.User{}).Count(&total).Error; err != nil {
		logger.Error("Failed to count users", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取用戶數量失敗",
		})
		return
	}
	
	// 獲取用戶列表
	if err := h.db.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		logger.Error("Failed to fetch users", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取用戶列表失敗",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}
