package handlers

import (
	"crypto/md5"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"memoryark/internal/config"
	"memoryark/internal/models"
)

// FileHandler 檔案處理器
type FileHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewFileHandler 創建檔案處理器
func NewFileHandler(db *gorm.DB, cfg *config.Config) *FileHandler {
	return &FileHandler{
		db:  db,
		cfg: cfg,
	}
}

// GetFiles 獲取檔案列表
func (h *FileHandler) GetFiles(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
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
	
	userID, ok := userIDValue.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "INVALID_USER_ID",
				"message": "無效的用戶ID",
			},
		})
		return
	}
	
	parentID := c.DefaultQuery("parent_id", "")
	showDeleted := c.DefaultQuery("show_deleted", "false")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	
	offset := (page - 1) * limit
	
	query := h.db.Model(&models.File{})
	
	// 權限控制：只顯示用戶有權訪問的檔案
	query = query.Where("uploaded_by = ?", userID)
	
	// 篩選條件
	if parentID == "" {
		query = query.Where("parent_id IS NULL")
	} else {
		query = query.Where("parent_id = ?", parentID)
	}
	
	if showDeleted == "true" {
		query = query.Where("is_deleted = ?", true)
	} else {
		query = query.Where("is_deleted = ?", false)
	}
	
	var files []models.File
	var total int64
	
	// 計算總數
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "查詢檔案失敗",
			},
		})
		return
	}
	
	// 獲取檔案列表
	if err := query.Preload("Uploader").Preload("DeletedByUser").
		Order("is_directory DESC, name ASC").
		Offset(offset).Limit(limit).
		Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "查詢檔案失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"files": files,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
			},
		},
	})
}

// GetFileDetails 獲取檔案詳情
func (h *FileHandler) GetFileDetails(c *gin.Context) {
	fileID := c.Param("id")
	
	var file models.File
	if err := h.db.Preload("Uploader").Preload("DeletedByUser").
		First(&file, fileID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code": "FILE_NOT_FOUND",
				"message": "檔案不存在",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": file,
	})
}

// UploadFile 上傳檔案
func (h *FileHandler) UploadFile(c *gin.Context) {
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
	
	// 獲取上傳的檔案
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "NO_FILE",
				"message": "沒有選擇檔案",
			},
		})
		return
	}
	
	// 檢查檔案大小
	maxSize := int64(100 * 1024 * 1024) // 100MB
	if file.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "FILE_TOO_LARGE",
				"message": "檔案大小超過限制",
			},
		})
		return
	}
	
	// 生成檔案名
	ext := filepath.Ext(file.Filename)
	timestamp := time.Now().Unix()
	hasher := md5.New()
	hasher.Write([]byte(fmt.Sprintf("%s%d", file.Filename, timestamp)))
	filename := fmt.Sprintf("%x%s", hasher.Sum(nil), ext)
	
	// 創建儲存目錄
	uploadDir := filepath.Join(h.cfg.Upload.UploadPath, "files")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "STORAGE_ERROR",
				"message": "創建儲存目錄失敗",
			},
		})
		return
	}
	
	// 儲存檔案
	filePath := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "SAVE_FAILED",
				"message": "儲存檔案失敗",
			},
		})
		return
	}
	
	// 創建檔案記錄
	parentID, _ := strconv.ParseUint(c.PostForm("parent_id"), 10, 32)
	var parentIDPtr *uint
	if parentID > 0 {
		id := uint(parentID)
		parentIDPtr = &id
	}
	
	fileRecord := models.File{
		Name:         filename,
		OriginalName: file.Filename,
		FilePath:     filePath,
		FileSize:     file.Size,
		MimeType:     file.Header.Get("Content-Type"),
		ParentID:     parentIDPtr,
		UploadedBy:   userID.(uint),
		IsDirectory:  false,
		IsDeleted:    false,
	}
	
	if err := h.db.Create(&fileRecord).Error; err != nil {
		// 刪除已儲存的檔案
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "創建檔案記錄失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "檔案上傳成功",
		"data": fileRecord,
	})
}

// CreateFolder 創建資料夾
func (h *FileHandler) CreateFolder(c *gin.Context) {
	userID, _ := c.Get("user_id")
	
	var req struct {
		Name     string `json:"name" binding:"required"`
		ParentID *uint  `json:"parent_id"`
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
	
	// 檢查同名資料夾
	var existing models.File
	query := h.db.Where("name = ? AND is_directory = ? AND is_deleted = ?", 
		req.Name, true, false)
	
	if req.ParentID != nil {
		query = query.Where("parent_id = ?", *req.ParentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	
	if err := query.First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code": "FOLDER_EXISTS",
				"message": "同名資料夾已存在",
			},
		})
		return
	}
	
	// 創建資料夾記錄
	folder := models.File{
		Name:         req.Name,
		OriginalName: req.Name,
		FilePath:     "",
		FileSize:     0,
		MimeType:     "folder",
		ParentID:     req.ParentID,
		UploadedBy:   userID.(uint),
		IsDirectory:  true,
		IsDeleted:    false,
	}
	
	if err := h.db.Create(&folder).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DATABASE_ERROR",
				"message": "創建資料夾失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "資料夾創建成功",
		"data": folder,
	})
}

// UpdateFile 更新檔案資訊
func (h *FileHandler) UpdateFile(c *gin.Context) {
	fileID := c.Param("id")
	
	var req struct {
		Name string `json:"name"`
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
	
	if req.Name != "" {
		file.Name = req.Name
	}
	file.UpdatedAt = time.Now()
	
	if err := h.db.Save(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "UPDATE_FAILED",
				"message": "更新檔案失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "檔案更新成功",
		"data": file,
	})
}

// DeleteFile 刪除檔案（移至垃圾桶）
func (h *FileHandler) DeleteFile(c *gin.Context) {
	fileID := c.Param("id")
	userID, _ := c.Get("user_id")
	
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
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "ALREADY_DELETED",
				"message": "檔案已在垃圾桶中",
			},
		})
		return
	}
	
	// 軟刪除
	now := time.Now()
	file.IsDeleted = true
	file.DeletedAt = &now
	
	if userIDVal, ok := userID.(uint); ok {
		file.DeletedBy = &userIDVal
	}
	
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
		"message": "檔案已移至垃圾桶",
		"data": file,
	})
}

// RestoreFile 還原檔案
func (h *FileHandler) RestoreFile(c *gin.Context) {
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
	
	if !file.IsDeleted {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "NOT_DELETED",
				"message": "檔案未在垃圾桶中",
			},
		})
		return
	}
	
	// 還原檔案
	file.IsDeleted = false
	file.DeletedAt = nil
	file.DeletedBy = nil
	
	if err := h.db.Save(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "RESTORE_FAILED",
				"message": "還原檔案失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "檔案還原成功",
		"data": file,
	})
}

// PermanentDeleteFile 永久刪除檔案
func (h *FileHandler) PermanentDeleteFile(c *gin.Context) {
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
	
	if !file.IsDeleted {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "NOT_IN_TRASH",
				"message": "只能永久刪除垃圾桶中的檔案",
			},
		})
		return
	}
	
	// 刪除實體檔案
	if !file.IsDirectory && file.FilePath != "" {
		if err := os.Remove(file.FilePath); err != nil {
			// 記錄錯誤但不中斷操作
			fmt.Printf("Failed to remove file %s: %v\n", file.FilePath, err)
		}
	}
	
	// 刪除資料庫記錄
	if err := h.db.Delete(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DELETE_FAILED",
				"message": "永久刪除檔案失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "檔案已永久刪除",
	})
}

// DownloadFile 下載檔案
func (h *FileHandler) DownloadFile(c *gin.Context) {
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
	
	if file.IsDirectory {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "IS_DIRECTORY",
				"message": "無法下載資料夾",
			},
		})
		return
	}
	
	if file.IsDeleted {
		c.JSON(http.StatusGone, gin.H{
			"success": false,
			"error": gin.H{
				"code": "FILE_DELETED",
				"message": "檔案已被刪除",
			},
		})
		return
	}
	
	// 檢查檔案是否存在
	if _, err := os.Stat(file.FilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code": "PHYSICAL_FILE_NOT_FOUND",
				"message": "實體檔案不存在",
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
	
	// 設定回應標頭
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.OriginalName))
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", fmt.Sprintf("%d", file.FileSize))
	
	c.File(file.FilePath)
}

// CreateShareLink 創建分享連結
func (h *FileHandler) CreateShareLink(c *gin.Context) {
	fileID := c.Param("id")
	userID, _ := c.Get("user_id")
	
	var req struct {
		ExpiresAt    *time.Time `json:"expires_at"`
		MaxDownloads *int       `json:"max_downloads"`
	}
	c.ShouldBindJSON(&req)
	
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
	
	// 生成分享令牌
	hasher := md5.New()
	hasher.Write([]byte(fmt.Sprintf("%d_%d_%d", file.ID, userID, time.Now().Unix())))
	shareToken := fmt.Sprintf("%x", hasher.Sum(nil))
	
	// 創建分享記錄
	fileShare := models.FileShare{
		FileID:       file.ID,
		SharedBy:     userID.(uint),
		ShareToken:   shareToken,
		ExpiresAt:    req.ExpiresAt,
		MaxDownloads: req.MaxDownloads,
	}
	
	if err := h.db.Create(&fileShare).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "CREATE_SHARE_FAILED",
				"message": "創建分享連結失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "分享連結創建成功",
		"data": fileShare,
	})
}

// MoveFile 移動檔案/資料夾
func (h *FileHandler) MoveFile(c *gin.Context) {
	fileID := c.Param("id")
	
	var req struct {
		ParentID *uint `json:"parent_id"`
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
	
	file.ParentID = req.ParentID
	file.UpdatedAt = time.Now()
	
	if err := h.db.Save(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "MOVE_FAILED",
				"message": "移動檔案失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "檔案移動成功",
		"data": file,
	})
}

// RenameFile 重命名檔案/資料夾
func (h *FileHandler) RenameFile(c *gin.Context) {
	fileID := c.Param("id")
	
	var req struct {
		Name string `json:"name" binding:"required"`
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
	
	file.Name = req.Name
	file.UpdatedAt = time.Now()
	
	if err := h.db.Save(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "RENAME_FAILED",
				"message": "重命名檔案失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "檔案重命名成功",
		"data": file,
	})
}
