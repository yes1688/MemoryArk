package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"memoryark/internal/config"
	"memoryark/internal/models"
)

// AdminHandler 管理員處理器
type AdminHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewAdminHandler 創建管理員處理器
func NewAdminHandler(db *gorm.DB, cfg *config.Config) *AdminHandler {
	return &AdminHandler{
		db:  db,
		cfg: cfg,
	}
}

// GetUsers 獲取用戶列表
func (h *AdminHandler) GetUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	offset := (page - 1) * limit
	
	var users []models.User
	var total int64
	
	// 計算總數
	if err := h.db.Model(&models.User{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "查詢用戶失敗",
			},
		})
		return
	}
	
	// 獲取用戶列表
	if err := h.db.Preload("Approver").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "查詢用戶失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"users": users,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
			},
		},
	})
}

// UpdateUserRole 修改用戶角色
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	userID := c.Param("id")
	
	var req struct {
		Role string `json:"role" binding:"required,oneof=admin user"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "INVALID_REQUEST",
				"message": "請求格式不正確",
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
	
	user.Role = req.Role
	user.UpdatedAt = time.Now()
	
	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "UPDATE_FAILED",
				"message": "更新用戶角色失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用戶角色更新成功",
		"data": user,
	})
}

// UpdateUserStatus 修改用戶狀態
func (h *AdminHandler) UpdateUserStatus(c *gin.Context) {
	userID := c.Param("id")
	
	var req struct {
		Status string `json:"status" binding:"required,oneof=approved rejected suspended"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "INVALID_REQUEST",
				"message": "請求格式不正確",
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
	
	user.Status = req.Status
	user.UpdatedAt = time.Now()
	
	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "UPDATE_FAILED",
				"message": "更新用戶狀態失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用戶狀態更新成功",
		"data": user,
	})
}

// GetRegistrations 獲取註冊申請列表
func (h *AdminHandler) GetRegistrations(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.DefaultQuery("status", "")
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	offset := (page - 1) * limit
	
	var registrations []models.UserRegistrationRequest
	var total int64
	
	query := h.db.Model(&models.UserRegistrationRequest{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	
	// 計算總數
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "查詢註冊申請失敗",
			},
		})
		return
	}
	
	// 獲取註冊申請列表
	if err := query.Preload("ProcessedByUser").
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&registrations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "查詢註冊申請失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"registrations": registrations,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
			},
		},
	})
}

// ApproveRegistration 批准註冊申請
func (h *AdminHandler) ApproveRegistration(c *gin.Context) {
	registrationID := c.Param("id")
	adminUserID, _ := c.Get("user_id")
	
	var registration models.UserRegistrationRequest
	if err := h.db.First(&registration, registrationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code": "REGISTRATION_NOT_FOUND",
				"message": "註冊申請不存在",
			},
		})
		return
	}
	
	if registration.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "INVALID_STATUS",
				"message": "只能審核待處理的申請",
			},
		})
		return
	}
	
	// 開始事務
	tx := h.db.Begin()
	
	// 創建用戶
	now := time.Now()
	user := models.User{
		Email:       registration.Email,
		Name:        registration.Name,
		Phone:       registration.Phone,
		Role:        "user",
		Status:      "approved",
		ApprovedBy:  adminUserID.(*uint),
		ApprovedAt:  &now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "USER_CREATION_FAILED",
				"message": "創建用戶失敗",
			},
		})
		return
	}
	
	// 更新註冊申請狀態
	registration.Status = "approved"
	registration.ProcessedAt = &now
	registration.ProcessedBy = adminUserID.(*uint)
	
	if err := tx.Save(&registration).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "REGISTRATION_UPDATE_FAILED",
				"message": "更新註冊申請狀態失敗",
			},
		})
		return
	}
	
	tx.Commit()
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "註冊申請已批准",
		"data": gin.H{
			"registration": registration,
			"user": user,
		},
	})
}

// RejectRegistration 拒絕註冊申請
func (h *AdminHandler) RejectRegistration(c *gin.Context) {
	registrationID := c.Param("id")
	adminUserID, _ := c.Get("user_id")
	
	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)
	
	var registration models.UserRegistrationRequest
	if err := h.db.First(&registration, registrationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code": "REGISTRATION_NOT_FOUND",
				"message": "註冊申請不存在",
			},
		})
		return
	}
	
	if registration.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "INVALID_STATUS",
				"message": "只能審核待處理的申請",
			},
		})
		return
	}
	
	// 更新註冊申請狀態
	now := time.Now()
	registration.Status = "rejected"
	registration.ProcessedAt = &now
	registration.ProcessedBy = adminUserID.(*uint)
	registration.RejectionReason = req.Reason
	
	if err := h.db.Save(&registration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "REGISTRATION_UPDATE_FAILED",
				"message": "更新註冊申請狀態失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "註冊申請已拒絕",
		"data": registration,
	})
}

// GetSystemStats 獲取系統統計資訊
func (h *AdminHandler) GetSystemStats(c *gin.Context) {
	var stats struct {
		TotalUsers        int64 `json:"total_users"`
		ActiveUsers       int64 `json:"active_users"`
		PendingRequests   int64 `json:"pending_requests"`
		TotalFiles        int64 `json:"total_files"`
		TotalStorage      int64 `json:"total_storage"`
		DeletedFiles      int64 `json:"deleted_files"`
	}
	
	// 用戶統計
	h.db.Model(&models.User{}).Count(&stats.TotalUsers)
	h.db.Model(&models.User{}).Where("status = ?", "approved").Count(&stats.ActiveUsers)
	h.db.Model(&models.UserRegistrationRequest{}).Where("status = ?", "pending").Count(&stats.PendingRequests)
	
	// 檔案統計
	h.db.Model(&models.File{}).Where("is_deleted = ?", false).Count(&stats.TotalFiles)
	h.db.Model(&models.File{}).Where("is_deleted = ?", true).Count(&stats.DeletedFiles)
	
	// 儲存空間統計
	var totalSize struct {
		Total int64
	}
	h.db.Model(&models.File{}).
		Where("is_deleted = ? AND is_directory = ?", false, false).
		Select("COALESCE(SUM(file_size), 0) as total").
		Scan(&totalSize)
	stats.TotalStorage = totalSize.Total
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": stats,
	})
}

// GetActivityLogs 獲取操作記錄
func (h *AdminHandler) GetActivityLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	
	offset := (page - 1) * limit
	
	var logs []models.ActivityLog
	var total int64
	
	// 計算總數
	if err := h.db.Model(&models.ActivityLog{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "查詢操作記錄失敗",
			},
		})
		return
	}
	
	// 獲取操作記錄
	if err := h.db.Preload("User").
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "查詢操作記錄失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"logs": logs,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
			},
		},
	})
}