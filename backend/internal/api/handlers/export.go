package handlers

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"memoryark/internal/config"
	"memoryark/internal/models"
)

// ExportHandler 匯出處理器
type ExportHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewExportHandler 建立匯出處理器
func NewExportHandler(db *gorm.DB, cfg *config.Config) *ExportHandler {
	return &ExportHandler{
		db:  db,
		cfg: cfg,
	}
}

// StreamExportRequest 串流匯出請求
type StreamExportRequest struct {
	CategoryIDs        []uint    `json:"category_ids"`
	DateFrom           string    `json:"date_from"`
	DateTo             string    `json:"date_to"`
	IncludeSubfolders  bool      `json:"include_subfolders"`
	Format             string    `json:"format"` // zip, tar
	FileTypes          []string  `json:"file_types"` // image, video, audio, document
}

// QuickExportRequest 快速匯出請求
type QuickExportRequest struct {
	Type string `json:"type"` // this-month, last-sabbath, all-photos
}

// StreamExport 串流匯出（動態生成ZIP）
func (h *ExportHandler) StreamExport(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED", 
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
				"code":    "INVALID_USER_ID",
				"message": "無效的用戶ID",
			},
		})
		return
	}

	var req StreamExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "請求格式錯誤",
				"details": err.Error(),
			},
		})
		return
	}

	// 建立匯出任務
	jobID := uuid.New().String()
	job := models.ExportJob{
		JobID:        jobID,
		UserID:       userID,
		Status:       "processing",
		Progress:     0,
		ExportFormat: req.Format,
		ExpiresAt:    timePtr(time.Now().Add(24 * time.Hour)), // 24小時後過期
	}

	if err := h.db.Create(&job).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CREATE_JOB_FAILED",
				"message": "建立匯出任務失敗",
			},
		})
		return
	}

	// 啟動背景匯出處理
	go h.processStreamExport(job, req, userID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"job_id":      jobID,
			"status":      "processing",
			"download_url": fmt.Sprintf("/api/export/download/%s", jobID),
		},
		"message": "匯出任務已啟動",
	})
}

// QuickStreamExport 快速串流匯出
func (h *ExportHandler) QuickStreamExport(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
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
				"code":    "INVALID_USER_ID",
				"message": "無效的用戶ID",
			},
		})
		return
	}

	exportType := c.Query("type")
	if exportType == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_TYPE",
				"message": "缺少匯出類型參數",
			},
		})
		return
	}

	// 根據類型構建匯出條件
	var files []models.File
	var exportName string

	switch exportType {
	case "this-month":
		now := time.Now()
		firstDay := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		
		h.db.Where("uploaded_by = ? AND is_deleted = ? AND created_at >= ?", 
			userID, false, firstDay).
			Preload("Category").
			Find(&files)
		exportName = fmt.Sprintf("本月檔案_%s", now.Format("2006-01"))

	case "last-sabbath":
		// 假設安息日聚會分類ID為1
		h.db.Where("uploaded_by = ? AND is_deleted = ? AND category_id = ?", 
			userID, false, 1).
			Preload("Category").
			Order("created_at DESC").
			Limit(100). // 限制最近100個檔案
			Find(&files)
		exportName = "最近安息日聚會"

	case "all-photos":
		h.db.Where("uploaded_by = ? AND is_deleted = ? AND mime_type LIKE ?", 
			userID, false, "image/%").
			Preload("Category").
			Find(&files)
		exportName = "所有照片"

	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_TYPE",
				"message": "無效的匯出類型",
			},
		})
		return
	}

	// 直接串流匯出
	h.streamZipResponse(c, files, exportName)
}

// streamZipResponse 串流 ZIP 回應
func (h *ExportHandler) streamZipResponse(c *gin.Context, files []models.File, exportName string) {
	// 設定回應標頭
	filename := fmt.Sprintf("%s_%s.zip", exportName, time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Transfer-Encoding", "chunked")

	// 建立 ZIP 寫入器
	zipWriter := zip.NewWriter(c.Writer)
	defer zipWriter.Close()

	// 處理每個檔案
	for _, file := range files {
		// 建立虛擬路徑結構
		var zipPath string
		if file.Category != nil {
			zipPath = filepath.Join(file.Category.Name, file.OriginalName)
		} else {
			zipPath = file.OriginalName
		}

		// 建立 ZIP 項目
		writer, err := zipWriter.Create(zipPath)
		if err != nil {
			continue
		}

		// 讀取實體檔案
		if !file.IsDirectory {
			sourceFile, err := os.Open(file.FilePath)
			if err != nil {
				continue
			}

			// 直接串流複製
			io.Copy(writer, sourceFile)
			sourceFile.Close()
		}
	}
}

// processStreamExport 背景處理串流匯出
func (h *ExportHandler) processStreamExport(job models.ExportJob, req StreamExportRequest, userID uint) {
	// 更新任務狀態
	h.db.Model(&job).Update("status", "processing")

	// 查詢符合條件的檔案
	query := h.db.Model(&models.File{}).
		Where("uploaded_by = ? AND is_deleted = ?", userID, false)

	// 應用篩選條件
	if len(req.CategoryIDs) > 0 {
		query = query.Where("category_id IN ?", req.CategoryIDs)
	}

	if req.DateFrom != "" {
		if dateFrom, err := time.Parse("2006-01-02", req.DateFrom); err == nil {
			query = query.Where("created_at >= ?", dateFrom)
		}
	}

	if req.DateTo != "" {
		if dateTo, err := time.Parse("2006-01-02", req.DateTo); err == nil {
			query = query.Where("created_at <= ?", dateTo.Add(24*time.Hour))
		}
	}

	if len(req.FileTypes) > 0 {
		var mimeConditions []string
		for _, fileType := range req.FileTypes {
			switch fileType {
			case "image":
				mimeConditions = append(mimeConditions, "mime_type LIKE 'image/%'")
			case "video":
				mimeConditions = append(mimeConditions, "mime_type LIKE 'video/%'")
			case "audio":
				mimeConditions = append(mimeConditions, "mime_type LIKE 'audio/%'")
			case "document":
				mimeConditions = append(mimeConditions, 
					"mime_type LIKE 'application/pdf' OR mime_type LIKE 'application/msword%' OR mime_type LIKE 'application/vnd.openxmlformats%'")
			}
		}
		if len(mimeConditions) > 0 {
			query = query.Where(strings.Join(mimeConditions, " OR "))
		}
	}

	var files []models.File
	if err := query.Preload("Category").Find(&files).Error; err != nil {
		h.db.Model(&job).Updates(gin.H{
			"status": "failed",
			"error":  "查詢檔案失敗: " + err.Error(),
		})
		return
	}

	// 更新檔案總數
	job.TotalFiles = len(files)
	h.db.Model(&job).Update("total_files", job.TotalFiles)

	// 建立匯出檔案
	exportDir := filepath.Join(h.cfg.Upload.UploadPath, "exports")
	os.MkdirAll(exportDir, 0755)
	
	exportPath := filepath.Join(exportDir, fmt.Sprintf("%s.zip", job.JobID))
	
	zipFile, err := os.Create(exportPath)
	if err != nil {
		h.db.Model(&job).Updates(gin.H{
			"status": "failed",
			"error":  "建立匯出檔案失敗: " + err.Error(),
		})
		return
	}
	defer zipFile.Close()

	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	// 處理檔案
	for i, file := range files {
		// 更新進度
		progress := int((float64(i+1) / float64(len(files))) * 100)
		h.db.Model(&job).Updates(gin.H{
			"progress":        progress,
			"processed_files": i + 1,
		})

		// 建立虛擬路徑
		var zipPath string
		if file.Category != nil {
			zipPath = filepath.Join(file.Category.Name, file.OriginalName)
		} else {
			zipPath = file.OriginalName
		}

		// 添加檔案到 ZIP
		if !file.IsDirectory {
			writer, err := zipWriter.Create(zipPath)
			if err != nil {
				continue
			}

			sourceFile, err := os.Open(file.FilePath)
			if err != nil {
				continue
			}

			io.Copy(writer, sourceFile)
			sourceFile.Close()
		}
	}

	// 完成匯出
	now := time.Now()
	h.db.Model(&job).Updates(gin.H{
		"status":        "completed",
		"progress":      100,
		"download_path": exportPath,
		"completed_at":  &now,
	})
}

// GetExportStatus 獲取匯出狀態
func (h *ExportHandler) GetExportStatus(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
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
				"code":    "INVALID_USER_ID",
				"message": "無效的用戶ID",
			},
		})
		return
	}

	jobID := c.Param("jobId")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_JOB_ID",
				"message": "缺少任務ID",
			},
		})
		return
	}

	var job models.ExportJob
	if err := h.db.Where("job_id = ? AND user_id = ?", jobID, userID).First(&job).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "JOB_NOT_FOUND",
					"message": "匯出任務不存在",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查詢匯出任務失敗",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"job": job,
		},
	})
}

// DownloadExport 下載匯出檔案
func (h *ExportHandler) DownloadExport(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
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
				"code":    "INVALID_USER_ID",
				"message": "無效的用戶ID",
			},
		})
		return
	}

	jobID := c.Param("jobId")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_JOB_ID",
				"message": "缺少任務ID",
			},
		})
		return
	}

	var job models.ExportJob
	if err := h.db.Where("job_id = ? AND user_id = ?", jobID, userID).First(&job).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "JOB_NOT_FOUND",
					"message": "匯出任務不存在",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查詢匯出任務失敗",
			},
		})
		return
	}

	// 檢查任務狀態
	if job.Status != "completed" {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "JOB_NOT_COMPLETED",
				"message": "匯出任務尚未完成",
				"details": gin.H{
					"status":   job.Status,
					"progress": job.Progress,
				},
			},
		})
		return
	}

	// 檢查檔案是否過期
	if job.ExpiresAt != nil && time.Now().After(*job.ExpiresAt) {
		c.JSON(http.StatusGone, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DOWNLOAD_EXPIRED",
				"message": "下載連結已過期",
			},
		})
		return
	}

	// 檢查檔案是否存在
	if _, err := os.Stat(job.DownloadPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FILE_NOT_FOUND",
				"message": "匯出檔案不存在",
			},
		})
		return
	}

	// 設定下載標頭
	filename := fmt.Sprintf("export_%s.zip", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	// 串流檔案
	c.File(job.DownloadPath)
}

// GetUserExports 獲取用戶的匯出記錄
func (h *ExportHandler) GetUserExports(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UNAUTHORIZED",
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
				"code":    "INVALID_USER_ID",
				"message": "無效的用戶ID",
			},
		})
		return
	}

	// 查詢參數
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var jobs []models.ExportJob
	var total int64

	// 查詢用戶的匯出記錄
	query := h.db.Model(&models.ExportJob{}).Where("user_id = ?", userID)

	// 計算總數
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查詢匯出記錄總數失敗",
			},
		})
		return
	}

	// 查詢記錄
	if err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&jobs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查詢匯出記錄失敗",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"exports":     jobs,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// 輔助函數
func timePtr(t time.Time) *time.Time {
	return &t
}