package handlers

import (
	"fmt"
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
	
	// 檢查是否為根管理員郵箱
	role := "user"
	if registration.Email == h.cfg.Admin.RootEmail {
		role = "admin"
	}
	
	user := models.User{
		Email:       registration.Email,
		Name:        registration.Name,
		Phone:       registration.Phone,
		Role:        role,
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
		StorageCapacity   int64 `json:"storage_capacity"`
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
	stats.StorageCapacity = h.cfg.Storage.TotalCapacity
	
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

// GetAllFiles 獲取所有檔案列表（管理員專用）
func (h *AdminHandler) GetAllFiles(c *gin.Context) {
	fmt.Printf("🚀 GetAllFiles 被呼叫\n")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	fileType := c.Query("type")
	
	fmt.Printf("📋 查詢參數: page=%d, limit=%d, search=%s, type=%s\n", page, limit, search, fileType)
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	offset := (page - 1) * limit
	
	var files []models.File
	var total int64
	
	query := h.db.Model(&models.File{}).Where("is_deleted = ?", false)
	
	// 搜尋條件
	if search != "" {
		query = query.Where("name LIKE ? OR original_name LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	
	if fileType != "" {
		query = query.Where("mime_type LIKE ?", fileType+"%")
	}
	
	// 計算總數
	if err := query.Count(&total).Error; err != nil {
		fmt.Printf("❌ 查詢檔案總數失敗: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "查詢檔案總數失敗",
			},
		})
		return
	}
	
	fmt.Printf("📊 找到總檔案數: %d\n", total)
	
	// 獲取檔案列表
	if err := query.Preload("Uploader").Offset(offset).Limit(limit).Order("created_at DESC").Find(&files).Error; err != nil {
		fmt.Printf("❌ 查詢檔案列表失敗: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "查詢檔案列表失敗",
			},
		})
		return
	}
	
	fmt.Printf("📋 獲取到 %d 個檔案\n", len(files))
	
	// 轉換為前端需要的格式
	var fileInfos []gin.H
	for _, file := range files {
		fileInfo := gin.H{
			"id":             file.ID,
			"name":           file.Name,
			"originalName":   file.OriginalName,
			"size":           file.FileSize,
			"mimeType":       file.MimeType,
			"isDirectory":    file.IsDirectory,
			"parentId":       file.ParentID,
			"path":           file.FilePath,
			"uploaderId":     file.UploadedBy,
			"uploaderName":   file.Uploader.Name,
			"downloadCount":  0, // TODO: 實作下載計數功能
			"isDeleted":      file.IsDeleted,
			"deletedAt":      file.DeletedAt,
			"deletedBy":      file.DeletedBy,
			"createdAt":      file.CreatedAt,
			"updatedAt":      file.UpdatedAt,
		}
		// 調試日誌
		fmt.Printf("🔍 檔案資料: ID=%d, Name=%s, Size=%d, UploaderName=%s, CreatedAt=%s\n", 
			file.ID, file.Name, file.FileSize, file.Uploader.Name, file.CreatedAt)
		fileInfos = append(fileInfos, fileInfo)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"files": fileInfos,
			"total": total,
			"page":  page,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// DeleteFile 刪除檔案（管理員專用）
func (h *AdminHandler) DeleteFile(c *gin.Context) {
	fileID := c.Param("id")
	adminUserID, _ := c.Get("user_id")

	var file models.File
	if err := h.db.First(&file, fileID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code": "FILE_NOT_FOUND",
				"message": "檔案不存在",
			},
		})
		return
	}

	// 標記為已刪除
	now := time.Now()
	file.IsDeleted = true
	file.DeletedAt = &now
	file.DeletedBy = adminUserID.(*uint)

	if err := h.db.Save(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DELETE_FAILED",
				"message": "刪除檔案失敗",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "檔案已刪除",
	})
}

// DownloadFile 下載檔案（管理員專用）
func (h *AdminHandler) DownloadFile(c *gin.Context) {
	fileID := c.Param("id")

	var file models.File
	if err := h.db.First(&file, fileID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code": "FILE_NOT_FOUND",
				"message": "檔案不存在",
			},
		})
		return
	}

	if file.IsDeleted {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code": "FILE_DELETED",
				"message": "檔案已被刪除",
			},
		})
		return
	}

	// 增加下載計數
	file.DownloadCount++
	if err := h.db.Save(&file).Error; err != nil {
		// 記錄錯誤但不中斷下載
		fmt.Printf("Failed to update download count for file %d: %v\n", file.ID, err)
	}
	
	// 設置下載回應標頭
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", "attachment; filename=\""+file.OriginalName+"\"")
	c.Header("Content-Type", file.MimeType)
	c.File(file.FilePath)
}