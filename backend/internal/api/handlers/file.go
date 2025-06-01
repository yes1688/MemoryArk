package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"memoryark/internal/config"
	"memoryark/internal/models"
	"memoryark/pkg/logger"
)

// FileHandler 文件處理器
type FileHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewFileHandler 創建文件處理器
func NewFileHandler(db *gorm.DB, cfg *config.Config) *FileHandler {
	return &FileHandler{
		db:  db,
		cfg: cfg,
	}
}

// UploadRequest 上傳請求結構
type UploadRequest struct {
	Category    string `json:"category" validate:"required"`
	Description string `json:"description"`
	Tags        string `json:"tags"`
}

// UploadFile 上傳文件
func (h *FileHandler) UploadFile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		logger.Error("User not authenticated for file upload")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用戶未認證",
		})
		return
	}

	userIDUint, ok := userID.(uint)
	if !ok {
		logger.Error("Invalid user ID type in file upload")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的用戶ID",
		})
		return
	}

	// 解析多部分表單
	err := c.Request.ParseMultipartForm(32 << 20) // 32MB
	if err != nil {
		logger.Error("Failed to parse multipart form", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "解析表單失敗",
		})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		logger.Error("Failed to get file from form", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "獲取文件失敗",
		})
		return
	}
	defer file.Close()

	// 檢查文件大小
	if header.Size > 100<<20 { // 100MB
		logger.Warn("File too large", "size", header.Size, "filename", header.Filename)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "文件過大，最大允許100MB",
		})
		return
	}

	// 檢查文件類型
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := []string{".jpg", ".jpeg", ".png", ".gif", ".mp3", ".wav", ".mp4", ".avi", ".pdf", ".doc", ".docx"}
	if !contains(allowedExts, ext) {
		logger.Warn("File type not allowed", "extension", ext, "filename", header.Filename)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "不支持的文件類型",
		})
		return
	}

	// 生成唯一文件名
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("%d_%s", timestamp, header.Filename)
	
	// 創建上傳目錄
	uploadDir := filepath.Join("uploads", time.Now().Format("2006/01"))
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		logger.Error("Failed to create upload directory", "error", err, "dir", uploadDir)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "創建上傳目錄失敗",
		})
		return
	}

	// 保存文件
	filePath := filepath.Join(uploadDir, filename)
	dst, err := os.Create(filePath)
	if err != nil {
		logger.Error("Failed to create file", "error", err, "path", filePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "創建文件失敗",
		})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		logger.Error("Failed to copy file content", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "保存文件失敗",
		})
		return
	}

	// 獲取表單數據
	category := c.PostForm("category")
	description := c.PostForm("description")
	tags := c.PostForm("tags")

	// 創建文件記錄
	fileRecord := models.File{
		OriginalName: header.Filename,
		Name:         filename,
		Path:         filePath,
		Size:         header.Size,
		MimeType:     header.Header.Get("Content-Type"),
		Category:     category,
		Description:  description,
		Tags:         tags,
		UploadedBy:   userIDUint,
		IsPublic:     false,
	}

	if err := h.db.Create(&fileRecord).Error; err != nil {
		logger.Error("Failed to save file record", "error", err)
		// 清理已上傳的文件
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "保存文件記錄失敗",
		})
		return
	}

	logger.Info("File uploaded successfully", "file_id", fileRecord.ID, "user_id", userIDUint, "filename", header.Filename)
	c.JSON(http.StatusCreated, gin.H{
		"message": "文件上傳成功",
		"file":    fileRecord,
	})
}

// GetFiles 獲取文件列表
func (h *FileHandler) GetFiles(c *gin.Context) {
	// 分頁參數
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	category := c.Query("category")
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	query := h.db.Model(&models.File{}).Where("status = ?", "active")

	// 分類過濾
	if category != "" {
		query = query.Where("category = ?", category)
	}

	// 搜索過濾
	if search != "" {
		query = query.Where("original_name ILIKE ? OR description ILIKE ? OR tags ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		logger.Error("Failed to count files", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取文件數量失敗",
		})
		return
	}

	var files []models.File
	if err := query.Preload("Uploader").Offset(offset).Limit(limit).
		Order("created_at DESC").Find(&files).Error; err != nil {
		logger.Error("Failed to fetch files", "error", err)
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

// GetFile 獲取單個文件信息
func (h *FileHandler) GetFile(c *gin.Context) {
	fileID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		logger.Warn("Invalid file ID", "id", c.Param("id"))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的文件ID",
		})
		return
	}

	var file models.File
	if err := h.db.Preload("Uploader").First(&file, uint(fileID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("File not found", "file_id", fileID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "文件不存在",
			})
			return
		}
		logger.Error("Database error when fetching file", "error", err, "file_id", fileID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取文件信息失敗",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"file": file,
	})
}

// DownloadFile 下載文件
func (h *FileHandler) DownloadFile(c *gin.Context) {
	fileID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		logger.Warn("Invalid file ID for download", "id", c.Param("id"))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的文件ID",
		})
		return
	}

	var file models.File
	if err := h.db.First(&file, uint(fileID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("File not found for download", "file_id", fileID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "文件不存在",
			})
			return
		}
		logger.Error("Database error when fetching file for download", "error", err, "file_id", fileID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取文件信息失敗",
		})
		return
	}

	// 檢查文件是否存在
	if _, err := os.Stat(file.Path); os.IsNotExist(err) {
		logger.Error("File not found on disk", "path", file.Path, "file_id", fileID)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "文件不存在",
		})
		return
	}

	// 更新下載次數
	if err := h.db.Model(&file).Update("download_count", gorm.Expr("download_count + 1")).Error; err != nil {
		logger.Warn("Failed to update download count", "error", err, "file_id", fileID)
	}

	logger.Info("File downloaded", "file_id", fileID, "filename", file.OriginalName)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.OriginalName))
	c.Header("Content-Type", file.MimeType)
	c.File(file.Path)
}

// DeleteFile 刪除文件
func (h *FileHandler) DeleteFile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		logger.Error("User not authenticated for file deletion")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用戶未認證",
		})
		return
	}

	userIDUint, ok := userID.(uint)
	if !ok {
		logger.Error("Invalid user ID type in file deletion")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的用戶ID",
		})
		return
	}

	fileID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		logger.Warn("Invalid file ID for deletion", "id", c.Param("id"))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無效的文件ID",
		})
		return
	}

	var file models.File
	if err := h.db.First(&file, uint(fileID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("File not found for deletion", "file_id", fileID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "文件不存在",
			})
			return
		}
		logger.Error("Database error when fetching file for deletion", "error", err, "file_id", fileID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取文件信息失敗",
		})
		return
	}

	// 檢查權限（只有上傳者或管理員可以刪除）
	userRole, _ := c.Get("user_role")
	if file.UploadedBy != userIDUint && userRole != "admin" {
		logger.Warn("Unauthorized file deletion attempt", "user_id", userIDUint, "file_id", fileID, "owner_id", file.UploadedBy)
		c.JSON(http.StatusForbidden, gin.H{
			"error": "沒有權限刪除此文件",
		})
		return
	}

	// 軟刪除（更新狀態）
	if err := h.db.Model(&file).Update("status", "deleted").Error; err != nil {
		logger.Error("Failed to mark file as deleted", "error", err, "file_id", fileID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "刪除文件失敗",
		})
		return
	}

	logger.Info("File marked as deleted", "file_id", fileID, "user_id", userIDUint)
	c.JSON(http.StatusOK, gin.H{
		"message": "文件刪除成功",
	})
}

// 輔助函數：檢查字符串切片是否包含指定元素
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
