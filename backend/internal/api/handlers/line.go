package handlers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"memoryark/internal/models"
	"memoryark/pkg/api"
	"memoryark/pkg/logger"
)

// LineHandler LINE 功能處理器
type LineHandler struct {
	db *gorm.DB
}

// NewLineHandler 創建 LINE 處理器
func NewLineHandler(db *gorm.DB) *LineHandler {
	return &LineHandler{db: db}
}

// GetUploadRecords 獲取上傳記錄列表
func (h *LineHandler) GetUploadRecords(c *gin.Context) {
	// 分頁參數
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// 篩選參數
	lineUserID := c.Query("line_user_id")
	lineGroupID := c.Query("line_group_id")
	messageType := c.Query("message_type")
	downloadStatus := c.Query("download_status")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// 構建查詢
	query := h.db.Model(&models.LineUploadRecord{}).Preload("File").Preload("LineUser")

	if lineUserID != "" {
		query = query.Where("line_user_id = ?", lineUserID)
	}
	if lineGroupID != "" {
		query = query.Where("line_group_id = ?", lineGroupID)
	}
	if messageType != "" {
		query = query.Where("message_type = ?", messageType)
	}
	if downloadStatus != "" {
		query = query.Where("download_status = ?", downloadStatus)
	}
	if startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("created_at <= ?", endDate)
	}

	// 獲取總數
	var total int64
	query.Count(&total)

	// 分頁查詢
	var records []models.LineUploadRecord
	offset := (page - 1) * pageSize
	result := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&records)

	if result.Error != nil {
		logger.Error("Failed to get upload records", "error", result.Error)
		api.InternalServerError(c, "獲取上傳記錄失敗")
		return
	}

	api.Success(c, gin.H{
		"records":   records,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"pages":     (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// GetUploadRecord 獲取單個上傳記錄
func (h *LineHandler) GetUploadRecord(c *gin.Context) {
	id := c.Param("id")

	var record models.LineUploadRecord
	result := h.db.Preload("File").Preload("LineUser").Where("id = ?", id).First(&record)

	if result.Error == gorm.ErrRecordNotFound {
		api.NotFound(c, "上傳記錄")
		return
	}
	if result.Error != nil {
		logger.Error("Failed to get upload record", "id", id, "error", result.Error)
		api.InternalServerError(c, "獲取上傳記錄失敗")
		return
	}

	api.Success(c, record)
}

// DeleteUploadRecord 刪除上傳記錄
func (h *LineHandler) DeleteUploadRecord(c *gin.Context) {
	id := c.Param("id")

	result := h.db.Where("id = ?", id).Delete(&models.LineUploadRecord{})
	if result.Error != nil {
		logger.Error("Failed to delete upload record", "id", id, "error", result.Error)
		api.InternalServerError(c, "刪除上傳記錄失敗")
		return
	}

	if result.RowsAffected == 0 {
		api.NotFound(c, "上傳記錄")
		return
	}

	api.Success(c, gin.H{"message": "上傳記錄已刪除"})
}

// GetUsers 獲取 LINE 用戶列表
func (h *LineHandler) GetUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// 篩選參數
	displayName := c.Query("display_name")
	isBlocked := c.Query("is_blocked")
	isActive := c.Query("is_active")

	// 構建查詢
	query := h.db.Model(&models.LineUser{})

	if displayName != "" {
		query = query.Where("display_name LIKE ?", "%"+displayName+"%")
	}
	if isBlocked != "" {
		query = query.Where("is_blocked = ?", isBlocked == "true")
	}
	if isActive != "" {
		query = query.Where("is_active = ?", isActive == "true")
	}

	// 獲取總數
	var total int64
	query.Count(&total)

	// 分頁查詢
	var users []models.LineUser
	offset := (page - 1) * pageSize
	result := query.Offset(offset).Limit(pageSize).Order("last_interaction_at DESC").Find(&users)

	if result.Error != nil {
		logger.Error("Failed to get line users", "error", result.Error)
		api.InternalServerError(c, "獲取用戶列表失敗")
		return
	}

	api.Success(c, gin.H{
		"users":     users,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"pages":     (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// GetUser 獲取單個 LINE 用戶
func (h *LineHandler) GetUser(c *gin.Context) {
	lineUserID := c.Param("line_user_id")

	var user models.LineUser
	result := h.db.Where("line_user_id = ?", lineUserID).First(&user)

	if result.Error == gorm.ErrRecordNotFound {
		api.NotFound(c, "用戶")
		return
	}
	if result.Error != nil {
		logger.Error("Failed to get line user", "line_user_id", lineUserID, "error", result.Error)
		api.InternalServerError(c, "獲取用戶失敗")
		return
	}

	api.Success(c, user)
}

// UpdateUserStatus 更新用戶狀態
func (h *LineHandler) UpdateUserStatus(c *gin.Context) {
	lineUserID := c.Param("line_user_id")

	var req struct {
		IsBlocked *bool `json:"is_blocked"`
		IsActive  *bool `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api.BadRequest(c, "請求參數錯誤: "+err.Error())
		return
	}

	updates := make(map[string]interface{})
	if req.IsBlocked != nil {
		updates["is_blocked"] = *req.IsBlocked
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) == 0 {
		api.BadRequest(c, "沒有提供要更新的字段")
		return
	}

	result := h.db.Model(&models.LineUser{}).Where("line_user_id = ?", lineUserID).Updates(updates)
	if result.Error != nil {
		logger.Error("Failed to update user status", "line_user_id", lineUserID, "error", result.Error)
		api.InternalServerError(c, "更新用戶狀態失敗")
		return
	}

	if result.RowsAffected == 0 {
		api.NotFound(c, "用戶")
		return
	}

	api.Success(c, gin.H{"message": "用戶狀態已更新"})
}

// GetGroups 獲取 LINE 群組列表
func (h *LineHandler) GetGroups(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// 篩選參數
	groupName := c.Query("group_name")
	isActive := c.Query("is_active")

	// 構建查詢
	query := h.db.Model(&models.LineGroup{})

	if groupName != "" {
		query = query.Where("group_name LIKE ?", "%"+groupName+"%")
	}
	if isActive != "" {
		query = query.Where("is_active = ?", isActive == "true")
	}

	// 獲取總數
	var total int64
	query.Count(&total)

	// 分頁查詢
	var groups []models.LineGroup
	offset := (page - 1) * pageSize
	result := query.Offset(offset).Limit(pageSize).Order("last_interaction_at DESC").Find(&groups)

	if result.Error != nil {
		logger.Error("Failed to get line groups", "error", result.Error)
		api.InternalServerError(c, "獲取群組列表失敗")
		return
	}

	api.Success(c, gin.H{
		"groups":    groups,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"pages":     (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// GetWebhookLogs 獲取 Webhook 日誌
func (h *LineHandler) GetWebhookLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// 篩選參數
	webhookType := c.Query("webhook_type")
	processingStatus := c.Query("processing_status")
	lineUserID := c.Query("line_user_id")

	// 構建查詢
	query := h.db.Model(&models.LineWebhookLog{})

	if webhookType != "" {
		query = query.Where("webhook_type = ?", webhookType)
	}
	if processingStatus != "" {
		query = query.Where("processing_status = ?", processingStatus)
	}
	if lineUserID != "" {
		query = query.Where("line_user_id = ?", lineUserID)
	}

	// 獲取總數
	var total int64
	query.Count(&total)

	// 分頁查詢
	var logs []models.LineWebhookLog
	offset := (page - 1) * pageSize
	result := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&logs)

	if result.Error != nil {
		logger.Error("Failed to get webhook logs", "error", result.Error)
		api.InternalServerError(c, "獲取日誌失敗")
		return
	}

	api.Success(c, gin.H{
		"logs":      logs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"pages":     (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// GetSettings 獲取 LINE 設定
func (h *LineHandler) GetSettings(c *gin.Context) {
	var settings []models.LineSetting
	result := h.db.Where("is_active = ?", true).Order("setting_key").Find(&settings)

	if result.Error != nil {
		logger.Error("Failed to get line settings", "error", result.Error)
		api.InternalServerError(c, "獲取設定失敗")
		return
	}

	api.Success(c, settings)
}

// UpdateSetting 更新設定
func (h *LineHandler) UpdateSetting(c *gin.Context) {
	settingKey := c.Param("setting_key")

	var req struct {
		SettingValue string `json:"setting_value" binding:"required"`
		Description  string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api.BadRequest(c, "請求參數錯誤: "+err.Error())
		return
	}

	updates := map[string]interface{}{
		"setting_value": req.SettingValue,
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}

	result := h.db.Model(&models.LineSetting{}).Where("setting_key = ?", settingKey).Updates(updates)
	if result.Error != nil {
		logger.Error("Failed to update setting", "setting_key", settingKey, "error", result.Error)
		api.InternalServerError(c, "更新設定失敗")
		return
	}

	if result.RowsAffected == 0 {
		api.NotFound(c, "設定")
		return
	}

	api.Success(c, gin.H{"message": "設定已更新"})
}

// GetStatistics 獲取統計數據
func (h *LineHandler) GetStatistics(c *gin.Context) {
	// 獲取時間範圍參數
	startDate := c.DefaultQuery("start_date", time.Now().AddDate(0, 0, -30).Format("2006-01-02"))
	endDate := c.DefaultQuery("end_date", time.Now().Format("2006-01-02"))
	statType := c.DefaultQuery("stat_type", "daily")

	// 基礎統計
	var stats struct {
		TotalUploads     int64 `json:"total_uploads"`
		TotalUsers       int64 `json:"total_users"`
		TotalGroups      int64 `json:"total_groups"`
		ActiveUsers      int64 `json:"active_users"`
		TodayUploads     int64 `json:"today_uploads"`
		WeeklyUploads    int64 `json:"weekly_uploads"`
		MonthlyUploads   int64 `json:"monthly_uploads"`
		FailedDownloads  int64 `json:"failed_downloads"`
		PendingDownloads int64 `json:"pending_downloads"`
	}

	// 總上傳數
	h.db.Model(&models.LineUploadRecord{}).Count(&stats.TotalUploads)

	// 總用戶數
	h.db.Model(&models.LineUser{}).Count(&stats.TotalUsers)

	// 總群組數
	h.db.Model(&models.LineGroup{}).Count(&stats.TotalGroups)

	// 活躍用戶數（30天內有互動）
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	h.db.Model(&models.LineUser{}).Where("last_interaction_at > ?", thirtyDaysAgo).Count(&stats.ActiveUsers)

	// 今日上傳數
	today := time.Now().Format("2006-01-02")
	h.db.Model(&models.LineUploadRecord{}).Where("DATE(created_at) = ?", today).Count(&stats.TodayUploads)

	// 週上傳數
	weekAgo := time.Now().AddDate(0, 0, -7)
	h.db.Model(&models.LineUploadRecord{}).Where("created_at > ?", weekAgo).Count(&stats.WeeklyUploads)

	// 月上傳數
	monthAgo := time.Now().AddDate(0, -1, 0)
	h.db.Model(&models.LineUploadRecord{}).Where("created_at > ?", monthAgo).Count(&stats.MonthlyUploads)

	// 失敗下載數
	h.db.Model(&models.LineUploadRecord{}).Where("download_status = ?", "failed").Count(&stats.FailedDownloads)

	// 待處理下載數
	h.db.Model(&models.LineUploadRecord{}).Where("download_status IN ?", []string{"pending", "downloading"}).Count(&stats.PendingDownloads)

	// 獲取時間序列統計數據
	var timeSeriesStats []models.LineUploadStat
	h.db.Where("stat_date BETWEEN ? AND ? AND stat_type = ?", startDate, endDate, statType).
		Order("stat_date").Find(&timeSeriesStats)

	// 獲取前10活躍用戶
	var topUsers []models.LineUser
	h.db.Order("total_uploads DESC").Limit(10).Find(&topUsers)

	// 獲取前10活躍群組
	var topGroups []models.LineGroup
	h.db.Order("total_uploads DESC").Limit(10).Find(&topGroups)

	api.Success(c, gin.H{
		"basic_stats":        stats,
		"time_series_stats":  timeSeriesStats,
		"top_users":          topUsers,
		"top_groups":         topGroups,
	})
}

// BatchDeleteUploadRecords 批量刪除上傳記錄
func (h *LineHandler) BatchDeleteUploadRecords(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api.BadRequest(c, "請求參數錯誤: "+err.Error())
		return
	}

	if len(req.IDs) == 0 {
		api.BadRequest(c, "沒有提供要刪除的記錄 ID")
		return
	}

	result := h.db.Where("id IN ?", req.IDs).Delete(&models.LineUploadRecord{})
	if result.Error != nil {
		logger.Error("Failed to batch delete upload records", "ids", req.IDs, "error", result.Error)
		api.InternalServerError(c, "批量刪除失敗")
		return
	}

	api.Success(c, gin.H{
		"message":       "批量刪除完成",
		"deleted_count": result.RowsAffected,
	})
}

// SaveLineUser 保存或更新 LINE 用戶資訊
func (h *LineHandler) SaveLineUser(c *gin.Context) {
	var req struct {
		LineUserID    string `json:"lineUserId" binding:"required"`
		DisplayName   string `json:"displayName" binding:"required"`
		PictureURL    string `json:"pictureUrl"`
		StatusMessage string `json:"statusMessage"`
		Language      string `json:"language"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api.BadRequest(c, "請求參數錯誤: "+err.Error())
		return
	}

	var lineUser models.LineUser

	// 查找現有用戶
	result := h.db.Where("line_user_id = ?", req.LineUserID).First(&lineUser)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// 創建新用戶
			now := time.Now()
			lineUser = models.LineUser{
				LineUserID:          req.LineUserID,
				DisplayName:         req.DisplayName,
				PictureURL:          &req.PictureURL,
				StatusMessage:       &req.StatusMessage,
				Language:            &req.Language,
				IsBlocked:           false,
				IsActive:            true,
				FirstInteractionAt:  &now,
				LastInteractionAt:   &now,
			}

			if err := h.db.Create(&lineUser).Error; err != nil {
				logger.Error("Failed to create LINE user", "lineUserId", req.LineUserID, "error", err)
				api.InternalServerError(c, "創建用戶失敗")
				return
			}

			api.Success(c, gin.H{
				"message": "用戶創建成功",
				"user":    lineUser,
				"created": true,
			})
		} else {
			logger.Error("Failed to query LINE user", "lineUserId", req.LineUserID, "error", result.Error)
			api.InternalServerError(c, "查詢用戶失敗")
			return
		}
	} else {
		// 更新現有用戶
		now := time.Now()
		updates := map[string]interface{}{
			"display_name":         req.DisplayName,
			"picture_url":          &req.PictureURL,
			"status_message":       &req.StatusMessage,
			"language":             &req.Language,
			"last_interaction_at":  &now,
		}

		if err := h.db.Model(&lineUser).Updates(updates).Error; err != nil {
			logger.Error("Failed to update LINE user", "lineUserId", req.LineUserID, "error", err)
			api.InternalServerError(c, "更新用戶失敗")
			return
		}

		api.Success(c, gin.H{
			"message": "用戶更新成功",
			"user":    lineUser,
			"created": false,
		})
	}
}

// CreateUploadRecord 創建上傳記錄
func (h *LineHandler) CreateUploadRecord(c *gin.Context) {
	var req struct {
		FileID         uint                   `json:"fileId" binding:"required"`
		LineUserID     string                 `json:"lineUserId" binding:"required"`
		LineMessageID  string                 `json:"lineMessageId" binding:"required"`
		LineGroupID    string                 `json:"lineGroupId"`
		MessageType    string                 `json:"messageType"`
		OriginalURL    string                 `json:"originalUrl"`
		Metadata       map[string]interface{} `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api.BadRequest(c, "請求參數錯誤: "+err.Error())
		return
	}

	// 檢查檔案是否存在
	var file models.File
	if err := h.db.First(&file, req.FileID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			api.BadRequest(c, "檔案不存在")
		} else {
			logger.Error("Failed to check file existence", "fileId", req.FileID, "error", err)
			api.InternalServerError(c, "檢查檔案失敗")
		}
		return
	}

	// 檢查是否已有相同的上傳記錄
	var existingRecord models.LineUploadRecord
	result := h.db.Where("line_message_id = ?", req.LineMessageID).First(&existingRecord)
	if result.Error == nil {
		api.Success(c, gin.H{
			"message": "記錄已存在",
			"record":  existingRecord,
		})
		return
	}

	// 創建上傳記錄
	uploadRecord := models.LineUploadRecord{
		FileID:         req.FileID,
		LineUserID:     req.LineUserID,
		LineUserName:   "Unknown", // 暫時設定，後續可以從 metadata 取得
		LineMessageID:  req.LineMessageID,
		LineGroupID:    &req.LineGroupID,
		MessageType:    req.MessageType,
		OriginalURL:    &req.OriginalURL,
		DownloadStatus: "completed",
	}

	if err := h.db.Create(&uploadRecord).Error; err != nil {
		logger.Error("Failed to create upload record", "lineMessageId", req.LineMessageID, "error", err)
		api.InternalServerError(c, "創建上傳記錄失敗")
		return
	}

	// 更新用戶的總上傳數
	h.db.Model(&models.LineUser{}).Where("line_user_id = ?", req.LineUserID).
		Update("total_uploads", gorm.Expr("total_uploads + 1"))

	api.Success(c, gin.H{
		"message": "上傳記錄創建成功",
		"record":  uploadRecord,
	})
}