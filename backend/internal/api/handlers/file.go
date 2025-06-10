package handlers

import (
	"crypto/md5"
	"crypto/sha256"
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
	"memoryark/pkg/api"
	"memoryark/pkg/utils"
)

// FileHandler 檔案處理器
type FileHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

// 允許的檔案擴展名白名單 (教會數位資產管理系統適用)
var allowedExtensions = map[string]bool{
	// 影像檔案
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".bmp":  true,
	".webp": true,
	".svg":  true,
	".tiff": true,
	".ico":  true,
	
	// 影片檔案
	".mp4":  true,
	".avi":  true,
	".mov":  true,
	".wmv":  true,
	".flv":  true,
	".mkv":  true,
	".m4v":  true,
	".3gp":  true,
	".webm": true,
	
	// 音訊檔案
	".mp3":  true,
	".wav":  true,
	".flac": true,
	".aac":  true,
	".ogg":  true,
	".wma":  true,
	".m4a":  true,
	
	// 文件檔案
	".pdf":  true,
	".doc":  true,
	".docx": true,
	".xls":  true,
	".xlsx": true,
	".ppt":  true,
	".pptx": true,
	".txt":  true,
	".rtf":  true,
	".odt":  true,
	".ods":  true,
	".odp":  true,
	
	// 壓縮檔案
	".zip":  true,
	".rar":  true,
	".7z":   true,
	".tar":  true,
	".gz":   true,
	
	// 其他常見檔案
	".json": true,
	".xml":  true,
	".csv":  true,
	".bin":  true,
	".dat":  true,
}

// 危險檔案擴展名黑名單
var dangerousExtensions = map[string]bool{
	// 可執行檔案
	".exe": true,
	".bat": true,
	".cmd": true,
	".com": true,
	".scr": true,
	".msi": true,
	".dll": true,
	
	// 腳本檔案
	".php": true,
	".asp": true,
	".jsp": true,
	".js":  true,
	".vbs": true,
	".ps1": true,
	".sh":  true,
	
	// 系統檔案
	".sys": true,
	".reg": true,
	".inf": true,
}

// isValidFileExtension 檢查檔案擴展名是否被允許
func isValidFileExtension(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	
	// 檢查是否在危險名單中
	if dangerousExtensions[ext] {
		return false
	}
	
	// 檢查是否在允許名單中
	return allowedExtensions[ext]
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
	// 驗證用戶已登入（但不限制檔案查看權限，實現共享）
	_, exists := c.Get("user_id")
	if !exists {
		api.Unauthorized(c, "未授權訪問")
		return
	}
	
	parentID := c.DefaultQuery("parent_id", "")
	categoryID := c.DefaultQuery("category_id", "")
	virtualPath := c.DefaultQuery("virtual_path", "")
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
	
	// 教會檔案共享模式：所有用戶都能看到彼此上傳的檔案
	// 不再限制 uploaded_by，實現檔案共享
	
	// 篩選條件
	if virtualPath != "" {
		// 使用虛擬路徑查詢
		query = query.Where("virtual_path LIKE ?", virtualPath+"%")
	} else if parentID == "" {
		query = query.Where("parent_id IS NULL")
	} else {
		query = query.Where("parent_id = ?", parentID)
	}

	// 分類篩選
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
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
		api.Error(c, http.StatusInternalServerError, api.ErrDatabaseError, "查詢檔案失敗")
		return
	}
	
	// 獲取檔案列表
	if err := query.Preload("Uploader").Preload("DeletedByUser").Preload("Category").
		Order("is_directory DESC, name ASC").
		Offset(offset).Limit(limit).
		Find(&files).Error; err != nil {
		api.Error(c, http.StatusInternalServerError, api.ErrDatabaseError, "查詢檔案失敗")
		return
	}
	
	// 使用統一的響應格式
	api.SuccessWithPagination(c, gin.H{
		"files": files,
	}, page, limit, total)
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
	
	api.Success(c, file)
}

// UploadFile 上傳檔案 - 重寫支援 SHA256 去重和純虛擬路徑
func (h *FileHandler) UploadFile(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		api.Unauthorized(c, "未授權訪問")
		return
	}

	userID, ok := userIDValue.(uint)
	if !ok {
		api.Error(c, http.StatusInternalServerError, api.ErrInvalidUserID, "無效的用戶ID")
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
	
	// 檢查檔案類型安全性
	if !isValidFileExtension(file.Filename) {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "INVALID_FILE_TYPE",
				"message": fmt.Sprintf("不允許上傳 '%s' 類型的檔案，基於安全考量", ext),
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

	// 開啟上傳的檔案以計算 SHA256
	uploadedFile, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "FILE_READ_ERROR",
				"message": "無法讀取上傳檔案",
			},
		})
		return
	}
	defer uploadedFile.Close()

	// 計算 SHA256 雜湊值
	hash := sha256.New()
	if _, err := io.Copy(hash, uploadedFile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "HASH_CALCULATION_ERROR",
				"message": "計算檔案雜湊值失敗",
			},
		})
		return
	}
	sha256Hash := fmt.Sprintf("%x", hash.Sum(nil))

	// 檢查是否已存在相同雜湊值的檔案（去重機制）
	var existingFile models.File
	if err := h.db.Where("sha256_hash = ? AND is_deleted = ?", sha256Hash, false).First(&existingFile).Error; err == nil {
		// 檔案已存在，創建新的檔案記錄但指向相同的實體檔案
		
		// 處理父資料夾和虛擬路徑
		parentIDStr := c.PostForm("parent_id")
		categoryIDStr := c.PostForm("category_id")
		
		var parentIDPtr *uint
		if parentIDStr != "" {
			if parentID, err := strconv.ParseUint(parentIDStr, 10, 32); err == nil && parentID > 0 {
				id := uint(parentID)
				parentIDPtr = &id
			}
		}

		var categoryIDPtr *uint
		if categoryIDStr != "" {
			if categoryID, err := strconv.ParseUint(categoryIDStr, 10, 32); err == nil && categoryID > 0 {
				id := uint(categoryID)
				categoryIDPtr = &id
			}
		}

		// 建立虛擬路徑
		virtualPath := h.buildVirtualPath(parentIDPtr, file.Filename)

		// 創建新的檔案記錄（去重但允許不同虛擬位置）
		fileRecord := models.File{
			Name:         file.Filename,
			OriginalName: file.Filename,
			FilePath:     existingFile.FilePath, // 使用相同的實體檔案路徑
			VirtualPath:  virtualPath,
			SHA256Hash:   sha256Hash,
			FileSize:     file.Size,
			MimeType:     file.Header.Get("Content-Type"),
			ParentID:     parentIDPtr,
			CategoryID:   categoryIDPtr,
			UploadedBy:   userID,
			IsDirectory:  false,
			IsDeleted:    false,
		}

		if err := h.db.Create(&fileRecord).Error; err != nil {
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
			"message": "檔案上傳成功（已去重）",
			"data": fileRecord,
		})
		return
	}

	// 檔案不存在，需要儲存新檔案
	// 使用 UUID 作為實體檔案名稱（無副檔名，純 UUID）
	fileUUID := uuid.New().String()
	
	// 創建基於 hash 前2位的子目錄結構（提升檔案系統效能）
	hashPrefix := sha256Hash[:2]
	uploadDir := filepath.Join(h.cfg.Upload.UploadPath, "files", hashPrefix)
	
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
	
	// 儲存檔案到實體路徑（使用純 UUID 檔名）
	physicalPath := filepath.Join(uploadDir, fileUUID)
	if err := c.SaveUploadedFile(file, physicalPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "SAVE_FAILED",
				"message": "儲存檔案失敗",
			},
		})
		return
	}

	// 處理父資料夾和分類ID
	parentIDStr := c.PostForm("parent_id")
	categoryIDStr := c.PostForm("category_id")
	
	var parentIDPtr *uint
	if parentIDStr != "" {
		if parentID, err := strconv.ParseUint(parentIDStr, 10, 32); err == nil && parentID > 0 {
			id := uint(parentID)
			parentIDPtr = &id
		}
	}

	var categoryIDPtr *uint
	if categoryIDStr != "" {
		if categoryID, err := strconv.ParseUint(categoryIDStr, 10, 32); err == nil && categoryID > 0 {
			id := uint(categoryID)
			categoryIDPtr = &id
		}
	}

	// 建立虛擬路徑
	virtualPath := h.buildVirtualPath(parentIDPtr, file.Filename)
	
	// 創建檔案記錄
	fileRecord := models.File{
		Name:         file.Filename,
		OriginalName: file.Filename,
		FilePath:     physicalPath,
		VirtualPath:  virtualPath,
		SHA256Hash:   sha256Hash,
		FileSize:     file.Size,
		MimeType:     file.Header.Get("Content-Type"),
		ParentID:     parentIDPtr,
		CategoryID:   categoryIDPtr,
		UploadedBy:   userID,
		IsDirectory:  false,
		IsDeleted:    false,
	}
	
	if err := h.db.Create(&fileRecord).Error; err != nil {
		// 刪除已儲存的檔案
		os.Remove(physicalPath)
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

// buildVirtualPath 建立虛擬路徑
func (h *FileHandler) buildVirtualPath(parentID *uint, filename string) string {
	if parentID == nil {
		return "/" + filename
	}

	// 遞歸建立完整虛擬路徑
	var parentFolder models.File
	if err := h.db.First(&parentFolder, *parentID).Error; err != nil {
		return "/" + filename
	}

	if parentFolder.VirtualPath != "" {
		return parentFolder.VirtualPath + "/" + filename
	}

	// 如果父資料夾沒有虛擬路徑，遞歸建立
	parentPath := h.buildVirtualPath(parentFolder.ParentID, parentFolder.Name)
	return parentPath + "/" + filename
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
	
	// 正規化基礎上傳路徑
	basePath := utils.NormalizePath(h.cfg.Upload.UploadPath)
	
	// 確保 files 目錄存在
	filesDir := filepath.Join(basePath, "files")
	if err := utils.EnsureDir(filesDir); err != nil {
		fmt.Printf("[CreateFolder] 創建files目錄失敗: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "BASE_DIR_ERROR",
				"message": fmt.Sprintf("創建基礎目錄失敗: %v", err),
			},
		})
		return
	}
	
	// 建立實體資料夾路徑
	var folderPath string
	
	// 如果有父資料夾，獲取父資料夾路徑
	if req.ParentID != nil {
		var parentFolder models.File
		if err := h.db.First(&parentFolder, *req.ParentID).Error; err == nil && parentFolder.IsDirectory {
			if parentFolder.FilePath != "" {
				folderPath = filepath.Join(parentFolder.FilePath, req.Name)
			} else {
				// 如果父資料夾沒有路徑，使用父資料夾名稱建立路徑
				folderPath = filepath.Join(filesDir, parentFolder.Name, req.Name)
			}
		}
	} else {
		// 根級資料夾直接在 files 目錄下創建
		folderPath = filepath.Join(filesDir, req.Name)
	}
	
	// 記錄路徑信息用於調試
	fmt.Printf("[CreateFolder] 配置路徑: %s, 計算路徑: %s\n", h.cfg.Upload.UploadPath, folderPath)
	
	// 在檔案系統中創建實體目錄
	if err := os.MkdirAll(folderPath, 0755); err != nil {
		// 記錄詳細錯誤信息
		fmt.Printf("[CreateFolder] 創建目錄失敗: %s, 錯誤: %v\n", folderPath, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "FILESYSTEM_ERROR",
				"message": fmt.Sprintf("創建實體資料夾失敗: %v", err),
			},
		})
		return
	}
	
	// 驗證目錄是否真的創建成功
	if _, err := os.Stat(folderPath); os.IsNotExist(err) {
		fmt.Printf("[CreateFolder] 資料夾創建驗證失敗: %s\n", folderPath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "FILESYSTEM_VERIFICATION_FAILED",
				"message": "資料夾創建驗證失敗",
			},
		})
		return
	}
	
	fmt.Printf("[CreateFolder] 資料夾創建成功: %s\n", folderPath)
	
	// 建立虛擬路徑
	virtualPath := h.buildVirtualPath(req.ParentID, req.Name)

	// 創建資料夾記錄
	folder := models.File{
		Name:         req.Name,
		OriginalName: req.Name,
		FilePath:     folderPath,
		VirtualPath:  virtualPath,
		FileSize:     0,
		MimeType:     "folder",
		ParentID:     req.ParentID,
		UploadedBy:   userID.(uint),
		IsDirectory:  true,
		IsDeleted:    false,
	}
	
	if err := h.db.Create(&folder).Error; err != nil {
		// 如果資料庫創建失敗，刪除已創建的實體目錄
		os.RemoveAll(folderPath)
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
	// 檢查管理員權限
	userID, exists := c.Get("user_id")
	if !exists {
		api.Unauthorized(c, "未授權訪問")
		return
	}
	
	userIDVal, ok := userID.(uint)
	if !ok {
		api.Error(c, http.StatusInternalServerError, api.ErrInvalidUserID, "無效的用戶ID")
		return
	}
	
	// 檢查用戶是否為管理員
	var user models.User
	if err := h.db.First(&user, userIDVal).Error; err != nil {
		api.Error(c, http.StatusInternalServerError, api.ErrDatabaseError, "查詢用戶失敗")
		return
	}
	
	if user.Role != "admin" {
		api.Forbidden(c, "只有管理員可以永久刪除檔案")
		return
	}
	
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

// GetStorageStats 獲取儲存空間統計（供前端使用）
func (h *FileHandler) GetStorageStats(c *gin.Context) {
	// 計算已使用空間
	var totalSize struct {
		Total int64
	}
	h.db.Model(&models.File{}).
		Where("is_deleted = ? AND is_directory = ?", false, false).
		Select("COALESCE(SUM(file_size), 0) as total").
		Scan(&totalSize)
	
	stats := struct {
		UsedSpace    int64 `json:"used_space"`
		TotalSpace   int64 `json:"total_space"`
		FreeSpace    int64 `json:"free_space"`
		UsagePercent float64 `json:"usage_percent"`
	}{
		UsedSpace:  totalSize.Total,
		TotalSpace: h.cfg.Storage.TotalCapacity,
		FreeSpace:  h.cfg.Storage.TotalCapacity - totalSize.Total,
	}
	
	// 計算使用率百分比
	if stats.TotalSpace > 0 {
		stats.UsagePercent = (float64(stats.UsedSpace) / float64(stats.TotalSpace)) * 100
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": stats,
	})
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

// EmptyTrash 清空垃圾桶（僅限管理員）
func (h *FileHandler) EmptyTrash(c *gin.Context) {
	// 檢查管理員權限
	userID, exists := c.Get("user_id")
	if !exists {
		api.Unauthorized(c, "未授權訪問")
		return
	}
	
	userIDVal, ok := userID.(uint)
	if !ok {
		api.Error(c, http.StatusInternalServerError, api.ErrInvalidUserID, "無效的用戶ID")
		return
	}
	
	// 檢查用戶是否為管理員
	var user models.User
	if err := h.db.First(&user, userIDVal).Error; err != nil {
		api.Error(c, http.StatusInternalServerError, api.ErrDatabaseError, "查詢用戶失敗")
		return
	}
	
	if user.Role != "admin" {
		api.Forbidden(c, "只有管理員可以清空垃圾桶")
		return
	}
	
	// 獲取所有垃圾桶中的檔案
	var deletedFiles []models.File
	if err := h.db.Where("is_deleted = ?", true).Find(&deletedFiles).Error; err != nil {
		api.Error(c, http.StatusInternalServerError, api.ErrDatabaseError, "查詢垃圾桶檔案失敗")
		return
	}
	
	deletedCount := 0
	failedCount := 0
	
	// 逐一永久刪除每個檔案
	for _, file := range deletedFiles {
		// 刪除實體檔案
		if !file.IsDirectory && file.FilePath != "" {
			if err := os.Remove(file.FilePath); err != nil {
				fmt.Printf("Failed to remove file %s: %v\n", file.FilePath, err)
				failedCount++
				continue
			}
		}
		
		// 刪除資料庫記錄
		if err := h.db.Delete(&file).Error; err != nil {
			fmt.Printf("Failed to delete file record %d: %v\n", file.ID, err)
			failedCount++
			continue
		}
		
		deletedCount++
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("垃圾桶清空完成，成功刪除 %d 個檔案", deletedCount),
		"data": gin.H{
			"deletedCount": deletedCount,
			"failedCount":  failedCount,
			"totalCount":   len(deletedFiles),
		},
	})
}
