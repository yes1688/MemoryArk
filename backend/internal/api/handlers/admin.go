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

// GetPendingRequests 獲取待審核的註冊請求
func (h *AdminHandler) GetPendingRequests(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	var total int64
	if err := h.db.Model(&models.UserRegistrationRequest{}).
		Where("status = ?", "pending").Count(&total).Error; err != nil {
		logger.Error("Failed to count pending requests", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取請求數量失敗",
		})
		return
	}

	var requests []models.UserRegistrationRequest
	if err := h.db.Where("status = ?", "pending").
		Offset(offset).Limit(limit).
		Order("created_at DESC").Find(&requests).Error; err != nil {
		logger.Error("Failed to fetch pending requests", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取待審核請求失敗",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"requests": requests,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// ApprovalRequest 審核請求結構
type ApprovalRequest struct {
	RequestID uint   `json:"request_id" validate:"required"`
	Action    string `json:"action" validate:"required,oneof=approve reject"`
	Comment   string `json:"comment"`
}

// ApproveRequest 審核註冊請求
func (h *AdminHandler) ApproveRequest(c *gin.Context) {
	adminID, exists := c.Get("user_id")
	if !exists {
		logger.Error("Admin not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "管理員未認證",
		})
		return
	}

	adminIDUint, ok := adminID.(uint)
	if !ok {
		logger.Error("Invalid admin ID type")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的管理員ID",
		})
		return
	}

	var req ApprovalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("Invalid approval request format", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	// 開始事務
	tx := h.db.Begin()
	if tx.Error != nil {
		logger.Error("Failed to start transaction", "error", tx.Error)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "處理請求失敗",
		})
		return
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 獲取註冊請求
	var regRequest models.UserRegistrationRequest
	if err := tx.Where("id = ? AND status = ?", req.RequestID, "pending").
		First(&regRequest).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			logger.Warn("Registration request not found or already processed", "request_id", req.RequestID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "註冊請求不存在或已處理",
			})
			return
		}
		logger.Error("Failed to fetch registration request", "error", err, "request_id", req.RequestID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取註冊請求失敗",
		})
		return
	}

	if req.Action == "approve" {
		// 創建用戶
		user := models.User{
			Email:  regRequest.Email,
			Name:   regRequest.Name,
			Role:   "user",
			Status: "active",
		}

		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			logger.Error("Failed to create user", "error", err, "email", regRequest.Email)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "創建用戶失敗",
			})
			return
		}

		// 更新註冊請求狀態
		if err := tx.Model(&regRequest).Updates(map[string]interface{}{
			"status":       "approved",
			"approved_by":  adminIDUint,
			"admin_comment": req.Comment,
		}).Error; err != nil {
			tx.Rollback()
			logger.Error("Failed to update request status", "error", err, "request_id", req.RequestID)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "更新請求狀態失敗",
			})
			return
		}

		logger.Info("User registration approved", "request_id", req.RequestID, "user_id", user.ID, "admin_id", adminIDUint)
	} else {
		// 拒絕請求
		if err := tx.Model(&regRequest).Updates(map[string]interface{}{
			"status":       "rejected",
			"approved_by":  adminIDUint,
			"admin_comment": req.Comment,
		}).Error; err != nil {
			tx.Rollback()
			logger.Error("Failed to reject request", "error", err, "request_id", req.RequestID)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "拒絕請求失敗",
			})
			return
		}

		logger.Info("User registration rejected", "request_id", req.RequestID, "admin_id", adminIDUint)
	}

	if err := tx.Commit().Error; err != nil {
		logger.Error("Failed to commit transaction", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "處理請求失敗",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "審核完成",
		"action":  req.Action,
	})
}

// GetSystemStats 獲取系統統計信息
func (h *AdminHandler) GetSystemStats(c *gin.Context) {
	var stats struct {
		TotalUsers         int64 `json:"total_users"`
		ActiveUsers        int64 `json:"active_users"`
		TotalFiles         int64 `json:"total_files"`
		TotalFileSize      int64 `json:"total_file_size"`
		PendingRequests    int64 `json:"pending_requests"`
		MediaTasksPending  int64 `json:"media_tasks_pending"`
		MediaTasksComplete int64 `json:"media_tasks_complete"`
	}

	// 獲取用戶統計
	if err := h.db.Model(&models.User{}).Count(&stats.TotalUsers).Error; err != nil {
		logger.Error("Failed to count total users", "error", err)
	}

	if err := h.db.Model(&models.User{}).Where("status = ?", "active").Count(&stats.ActiveUsers).Error; err != nil {
		logger.Error("Failed to count active users", "error", err)
	}

	// 獲取文件統計
	if err := h.db.Model(&models.File{}).Where("status = ?", "active").Count(&stats.TotalFiles).Error; err != nil {
		logger.Error("Failed to count files", "error", err)
	}

	// 獲取文件總大小
	var fileSizeResult struct {
		TotalSize int64
	}
	if err := h.db.Model(&models.File{}).Where("status = ?", "active").
		Select("COALESCE(SUM(file_size), 0) as total_size").Scan(&fileSizeResult).Error; err != nil {
		logger.Error("Failed to calculate total file size", "error", err)
	} else {
		stats.TotalFileSize = fileSizeResult.TotalSize
	}

	// 獲取待審核請求數量
	if err := h.db.Model(&models.UserRegistrationRequest{}).
		Where("status = ?", "pending").Count(&stats.PendingRequests).Error; err != nil {
		logger.Error("Failed to count pending requests", "error", err)
	}

	// 獲取媒體任務統計
	if err := h.db.Model(&models.MediaTask{}).Where("status = ?", "pending").Count(&stats.MediaTasksPending).Error; err != nil {
		logger.Error("Failed to count pending media tasks", "error", err)
	}

	if err := h.db.Model(&models.MediaTask{}).Where("status = ?", "completed").Count(&stats.MediaTasksComplete).Error; err != nil {
		logger.Error("Failed to count completed media tasks", "error", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
	})
}

// UserUpdateRequest 用戶更新請求結構
type UserUpdateRequest struct {
	Name   string `json:"name"`
	Role   string `json:"role" validate:"oneof=user admin"`
	Status string `json:"status" validate:"oneof=active inactive suspended"`
}

// UpdateUser 更新用戶信息（管理員功能）
func (h *AdminHandler) UpdateUser(c *gin.Context) {
	adminID, exists := c.Get("user_id")
	if !exists {
		logger.Error("Admin not authenticated for user update")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "管理員未認證",
		})
		return
	}

	adminIDUint, ok := adminID.(uint)
	if !ok {
		logger.Error("Invalid admin ID type in user update")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的管理員ID",
		})
		return
	}

	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		logger.Warn("Invalid user ID for update", "id", c.Param("id"))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的用戶ID",
		})
		return
	}

	var req UserUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("Invalid user update request format", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	var user models.User
	if err := h.db.First(&user, uint(userID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("User not found for admin update", "user_id", userID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "用戶不存在",
			})
			return
		}
		logger.Error("Database error when fetching user for admin update", "error", err, "user_id", userID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取用戶信息失敗",
		})
		return
	}

	// 防止管理員修改自己的角色
	if user.ID == adminIDUint && req.Role != "" && req.Role != user.Role {
		logger.Warn("Admin attempted to change own role", "admin_id", adminIDUint)
		c.JSON(http.StatusForbidden, gin.H{
			"error": "不能修改自己的角色",
		})
		return
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Role != "" {
		updates["role"] = req.Role
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "沒有要更新的字段",
		})
		return
	}

	if err := h.db.Model(&user).Updates(updates).Error; err != nil {
		logger.Error("Failed to update user", "error", err, "user_id", userID, "admin_id", adminIDUint)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "更新用戶信息失敗",
		})
		return
	}

	logger.Info("User updated by admin", "user_id", userID, "admin_id", adminIDUint, "updates", updates)
	c.JSON(http.StatusOK, gin.H{
		"message": "用戶信息更新成功",
		"user":    user,
	})
}

// GetUser 獲取單個用戶信息（管理員功能）
func (h *AdminHandler) GetUser(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		logger.Warn("Invalid user ID in get user", "id", c.Param("id"))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的用戶ID",
		})
		return
	}

	var user models.User
	if err := h.db.First(&user, uint(userID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("User not found for admin get", "user_id", userID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "用戶不存在",
			})
			return
		}
		logger.Error("Database error when fetching user for admin", "error", err, "user_id", userID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取用戶信息失敗",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

// DeleteUser 刪除用戶（管理員功能）
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	adminID, exists := c.Get("user_id")
	if !exists {
		logger.Error("Admin not authenticated for user deletion")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "管理員未認證",
		})
		return
	}

	adminIDUint, ok := adminID.(uint)
	if !ok {
		logger.Error("Invalid admin ID type in user deletion")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的管理員ID",
		})
		return
	}

	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		logger.Warn("Invalid user ID for deletion", "id", c.Param("id"))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的用戶ID",
		})
		return
	}

	var user models.User
	if err := h.db.First(&user, uint(userID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("User not found for deletion", "user_id", userID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "用戶不存在",
			})
			return
		}
		logger.Error("Database error when fetching user for deletion", "error", err, "user_id", userID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取用戶信息失敗",
		})
		return
	}

	// 防止管理員刪除自己
	if user.ID == adminIDUint {
		logger.Warn("Admin attempted to delete own account", "admin_id", adminIDUint)
		c.JSON(http.StatusForbidden, gin.H{
			"error": "不能刪除自己的帳號",
		})
		return
	}

	// 軟刪除用戶
	if err := h.db.Delete(&user).Error; err != nil {
		logger.Error("Failed to delete user", "error", err, "user_id", userID, "admin_id", adminIDUint)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "刪除用戶失敗",
		})
		return
	}

	logger.Info("User deleted by admin", "user_id", userID, "admin_id", adminIDUint)
	c.JSON(http.StatusOK, gin.H{
		"message": "用戶刪除成功",
	})
}

// ListRegistrationRequests 獲取註冊申請列表
func (h *AdminHandler) ListRegistrationRequests(c *gin.Context) {
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

	// 構建查詢
	query := h.db.Model(&models.UserRegistrationRequest{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		logger.Error("Failed to count registration requests", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取申請數量失敗",
		})
		return
	}

	var requests []models.UserRegistrationRequest
	if err := query.Offset(offset).Limit(limit).
		Order("created_at DESC").Find(&requests).Error; err != nil {
		logger.Error("Failed to fetch registration requests", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取註冊申請列表失敗",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"requests": requests,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// RegistrationActionRequest 註冊審核請求結構
type RegistrationActionRequest struct {
	Action  string `json:"action" validate:"required,oneof=approve reject"`
	Comment string `json:"comment"`
}

// ApproveRegistration 批准註冊申請
func (h *AdminHandler) ApproveRegistration(c *gin.Context) {
	adminID, exists := c.Get("user_id")
	if !exists {
		logger.Error("Admin not authenticated for registration approval")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "管理員未認證",
		})
		return
	}

	adminIDUint, ok := adminID.(uint)
	if !ok {
		logger.Error("Invalid admin ID type in registration approval")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的管理員ID",
		})
		return
	}

	requestID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		logger.Warn("Invalid request ID for approval", "id", c.Param("id"))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的申請ID",
		})
		return
	}

	var req RegistrationActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("Invalid registration action request format", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	// 開始事務
	tx := h.db.Begin()
	if tx.Error != nil {
		logger.Error("Failed to start transaction for registration approval", "error", tx.Error)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "處理申請失敗",
		})
		return
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 獲取註冊申請
	var regRequest models.UserRegistrationRequest
	if err := tx.Where("id = ? AND status = ?", uint(requestID), "pending").
		First(&regRequest).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			logger.Warn("Registration request not found or already processed", "request_id", requestID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "註冊申請不存在或已處理",
			})
			return
		}
		logger.Error("Failed to fetch registration request for approval", "error", err, "request_id", requestID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取註冊申請失敗",
		})
		return
	}

	// 創建用戶
	user := models.User{
		Email:  regRequest.Email,
		Name:   regRequest.Name,
		Role:   "user",
		Status: "active",
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		logger.Error("Failed to create user during approval", "error", err, "email", regRequest.Email)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "創建用戶失敗",
		})
		return
	}

	// 更新註冊申請狀態
	updates := map[string]interface{}{
		"status":      "approved",
		"reviewed_by": adminIDUint,
		"review_note": req.Comment,
	}

	if err := tx.Model(&regRequest).Updates(updates).Error; err != nil {
		tx.Rollback()
		logger.Error("Failed to update request status to approved", "error", err, "request_id", requestID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "更新申請狀態失敗",
		})
		return
	}

	if err := tx.Commit().Error; err != nil {
		logger.Error("Failed to commit registration approval transaction", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "處理申請失敗",
		})
		return
	}

	logger.Info("Registration approved", "request_id", requestID, "user_id", user.ID, "admin_id", adminIDUint)
	c.JSON(http.StatusOK, gin.H{
		"message": "註冊申請已批准",
		"user":    user,
	})
}

// RejectRegistration 拒絕註冊申請
func (h *AdminHandler) RejectRegistration(c *gin.Context) {
	adminID, exists := c.Get("user_id")
	if !exists {
		logger.Error("Admin not authenticated for registration rejection")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "管理員未認證",
		})
		return
	}

	adminIDUint, ok := adminID.(uint)
	if !ok {
		logger.Error("Invalid admin ID type in registration rejection")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的管理員ID",
		})
		return
	}

	requestID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		logger.Warn("Invalid request ID for rejection", "id", c.Param("id"))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的申請ID",
		})
		return
	}

	var req RegistrationActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("Invalid registration rejection request format", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	// 獲取註冊申請
	var regRequest models.UserRegistrationRequest
	if err := h.db.Where("id = ? AND status = ?", uint(requestID), "pending").
		First(&regRequest).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("Registration request not found or already processed for rejection", "request_id", requestID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "註冊申請不存在或已處理",
			})
			return
		}
		logger.Error("Failed to fetch registration request for rejection", "error", err, "request_id", requestID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取註冊申請失敗",
		})
		return
	}

	// 更新申請狀態為拒絕
	updates := map[string]interface{}{
		"status":      "rejected",
		"reviewed_by": adminIDUint,
		"review_note": req.Comment,
	}

	if err := h.db.Model(&regRequest).Updates(updates).Error; err != nil {
		logger.Error("Failed to reject registration request", "error", err, "request_id", requestID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "拒絕申請失敗",
		})
		return
	}

	logger.Info("Registration rejected", "request_id", requestID, "admin_id", adminIDUint)
	c.JSON(http.StatusOK, gin.H{
		"message": "註冊申請已拒絕",
	})
}

// ListAllFiles 獲取所有文件列表（管理員功能）
func (h *AdminHandler) ListAllFiles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.DefaultQuery("status", "")
	userID := c.DefaultQuery("user_id", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// 構建查詢
	query := h.db.Model(&models.File{}).Preload("User")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		logger.Error("Failed to count files for admin", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取文件數量失敗",
		})
		return
	}

	var files []models.File
	if err := query.Offset(offset).Limit(limit).
		Order("created_at DESC").Find(&files).Error; err != nil {
		logger.Error("Failed to fetch files for admin", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取文件列表失敗",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"files": files,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// DeleteFile 刪除文件（管理員功能）
func (h *AdminHandler) DeleteFile(c *gin.Context) {
	adminID, exists := c.Get("user_id")
	if !exists {
		logger.Error("Admin not authenticated for file deletion")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "管理員未認證",
		})
		return
	}

	adminIDUint, ok := adminID.(uint)
	if !ok {
		logger.Error("Invalid admin ID type in file deletion")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的管理員ID",
		})
		return
	}

	fileID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		logger.Warn("Invalid file ID for admin deletion", "id", c.Param("id"))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的文件ID",
		})
		return
	}

	var file models.File
	if err := h.db.First(&file, uint(fileID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("File not found for admin deletion", "file_id", fileID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "文件不存在",
			})
			return
		}
		logger.Error("Database error when fetching file for admin deletion", "error", err, "file_id", fileID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取文件信息失敗",
		})
		return
	}

	// 軟刪除或硬刪除（根據查詢參數決定）
	permanent := c.DefaultQuery("permanent", "false")
	if permanent == "true" {
		// 硬刪除
		if err := h.db.Unscoped().Delete(&file).Error; err != nil {
			logger.Error("Failed to permanently delete file", "error", err, "file_id", fileID, "admin_id", adminIDUint)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "永久刪除文件失敗",
			})
			return
		}
		logger.Info("File permanently deleted by admin", "file_id", fileID, "admin_id", adminIDUint)
		c.JSON(http.StatusOK, gin.H{
			"message": "文件已永久刪除",
		})
	} else {
		// 軟刪除（移到垃圾桶）
		if err := h.db.Model(&file).Update("status", "deleted").Error; err != nil {
			logger.Error("Failed to move file to trash", "error", err, "file_id", fileID, "admin_id", adminIDUint)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "移動文件到垃圾桶失敗",
			})
			return
		}
		logger.Info("File moved to trash by admin", "file_id", fileID, "admin_id", adminIDUint)
		c.JSON(http.StatusOK, gin.H{
			"message": "文件已移到垃圾桶",
		})
	}
}

// GetActivityLogs 獲取活動日誌
func (h *AdminHandler) GetActivityLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	action := c.DefaultQuery("action", "")
	resource := c.DefaultQuery("resource", "")
	userID := c.DefaultQuery("user_id", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	offset := (page - 1) * limit

	// 構建查詢
	query := h.db.Model(&models.ActivityLog{}).Preload("User")
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if resource != "" {
		query = query.Where("resource = ?", resource)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		logger.Error("Failed to count activity logs", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取日誌數量失敗",
		})
		return
	}

	var logs []models.ActivityLog
	if err := query.Offset(offset).Limit(limit).
		Order("created_at DESC").Find(&logs).Error; err != nil {
		logger.Error("Failed to fetch activity logs", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取活動日誌失敗",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs": logs,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}
