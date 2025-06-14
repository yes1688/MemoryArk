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
	
	// 為圖片檔案生成縮圖URL
	for i := range files {
		if files[i].MimeType != "" && strings.HasPrefix(files[i].MimeType, "image/") && !files[i].IsDirectory {
			files[i].ThumbnailURL = fmt.Sprintf("/api/files/%d/preview", files[i].ID)
		}
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
	
	// 為圖片檔案生成縮圖URL
	if file.MimeType != "" && strings.HasPrefix(file.MimeType, "image/") && !file.IsDirectory {
		file.ThumbnailURL = fmt.Sprintf("/api/files/%d/preview", file.ID)
	}
	
	api.Success(c, file)
}

// UploadFile 上傳檔案 - 重寫支援 SHA256 去重和純虛擬路徑
func (h *FileHandler) UploadFile(c *gin.Context) {
	// 調試：早期打印所有接收到的參數
	fmt.Printf("[DEBUG] UploadFile START: Request.Method=%s\n", c.Request.Method)
	fmt.Printf("[DEBUG] UploadFile START: Request.URL=%s\n", c.Request.URL.String())
	
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
	
	// 調試：打印所有接收到的 form 參數
	fmt.Printf("[DEBUG] UploadFile: Request.Form: %v\n", c.Request.Form)
	fmt.Printf("[DEBUG] UploadFile: Request.PostForm: %v\n", c.Request.PostForm)
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
		relativePath := c.PostForm("relative_path")
		
		// 調試：打印去重情況下的參數
		fmt.Printf("[DEBUG] UploadFile (duplicate): All PostForm keys: %v\n", c.Request.PostForm)
		fmt.Printf("[DEBUG] UploadFile (duplicate): parentIDStr=%s, categoryIDStr=%s, relativePath=%s\n", parentIDStr, categoryIDStr, relativePath)
		
		var parentIDPtr *uint
		if parentIDStr != "" {
			if parentID, err := strconv.ParseUint(parentIDStr, 10, 32); err == nil && parentID > 0 {
				id := uint(parentID)
				parentIDPtr = &id
			}
		}

		// 處理資料夾上傳：如果有 relative_path，自動建立資料夾結構
		if relativePath != "" {
			// 解析相對路徑並建立資料夾結構
			finalParentID, err := h.ensureFolderStructure(userID, parentIDPtr, relativePath)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error": gin.H{
						"code": "FOLDER_CREATION_ERROR",
						"message": "建立資料夾結構失敗: " + err.Error(),
					},
				})
				return
			}
			parentIDPtr = finalParentID
		}

		var categoryIDPtr *uint
		if categoryIDStr != "" {
			if categoryID, err := strconv.ParseUint(categoryIDStr, 10, 32); err == nil && categoryID > 0 {
				id := uint(categoryID)
				categoryIDPtr = &id
			}
		}

		// 檢查是否在相同位置已存在相同檔名的檔案
		if sameLocationFile, err := h.checkSameLocationAndName(file.Filename, parentIDPtr, userID); err == nil {
			// 相同位置 + 相同檔名 + 相同內容 = 跳過上傳
			if sameLocationFile.SHA256Hash == sha256Hash {
				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"skipped": true,
					"message": "檔案已存在，跳過上傳",
					"data": gin.H{
						"existingFileId": sameLocationFile.ID,
						"fileName": file.Filename,
						"reason": "檔案內容和位置完全相同",
					},
				})
				return
			}
		}

		// 建立虛擬路徑
		virtualPath := h.buildVirtualPath(parentIDPtr, file.Filename)

		// 創建新的檔案記錄（內容去重但不同檔名或位置）
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
			"deduplicated": true,
			"message": "檔案內容已存在，已建立新的檔案參照",
			"data": fileRecord,
			"deduplicationInfo": gin.H{
				"originalFile": existingFile.Name,
				"originalPath": existingFile.VirtualPath,
				"newFile": file.Filename,
				"newPath": virtualPath,
				"spaceSaved": file.Size,
				"reason": "檔案內容相同但檔名或位置不同",
			},
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
	relativePath := c.PostForm("relative_path")
	
	// 強制解析 multipart form 以確保能獲取所有參數
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		fmt.Printf("[ERROR] Failed to parse multipart form: %v\n", err)
	} else {
		fmt.Printf("[INFO] Successfully parsed multipart form\n")
	}
	
	// 調試：檢查所有可能的參數來源
	fmt.Printf("[DEBUG] PostForm relative_path: '%s'\n", c.PostForm("relative_path"))
	fmt.Printf("[DEBUG] FormValue relative_path: '%s'\n", c.Request.FormValue("relative_path"))
	fmt.Printf("[DEBUG] PostForm relativePath: '%s'\n", c.PostForm("relativePath"))
	fmt.Printf("[DEBUG] FormValue relativePath: '%s'\n", c.Request.FormValue("relativePath"))
	
	if c.Request.MultipartForm != nil {
		fmt.Printf("[DEBUG] MultipartForm values: %v\n", c.Request.MultipartForm.Value)
		
		// 檢查所有可能的參數名稱變體
		for _, key := range []string{"relative_path", "relativePath", "relativePathData"} {
			if values, exists := c.Request.MultipartForm.Value[key]; exists && len(values) > 0 {
				relativePath = values[0]
				fmt.Printf("[DEBUG] Found %s in MultipartForm: '%s'\n", key, relativePath)
				break
			}
		}
	} else {
		fmt.Printf("[ERROR] MultipartForm is nil\n")
	}
	
	var parentIDPtr *uint
	if parentIDStr != "" {
		if parentID, err := strconv.ParseUint(parentIDStr, 10, 32); err == nil && parentID > 0 {
			id := uint(parentID)
			parentIDPtr = &id
		}
	}

	// 處理資料夾上傳：如果有 relative_path，自動建立資料夾結構
	if relativePath != "" {
		fmt.Printf("[INFO] Processing relative_path: %s\n", relativePath)
		// 解析相對路徑並建立資料夾結構
		finalParentID, err := h.ensureFolderStructure(userID, parentIDPtr, relativePath)
		if err != nil {
			fmt.Printf("[ERROR] Failed to create folder structure: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code": "FOLDER_CREATION_ERROR",
					"message": "建立資料夾結構失敗: " + err.Error(),
				},
			})
			return
		}
		fmt.Printf("[INFO] Created folder structure, final parent ID: %v\n", finalParentID)
		parentIDPtr = finalParentID
	} else {
		fmt.Printf("[INFO] No relative_path provided, using root directory\n")
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

// ensureFolderStructure 根據相對路徑自動建立資料夾結構
func (h *FileHandler) ensureFolderStructure(userID uint, baseParentID *uint, relativePath string) (*uint, error) {
	fmt.Printf("[DEBUG] ensureFolderStructure: relativePath=%s, baseParentID=%v\n", relativePath, baseParentID)
	
	// 清理和驗證路徑
	relativePath = strings.TrimPrefix(relativePath, "/")
	relativePath = strings.TrimSuffix(relativePath, "/")
	
	if relativePath == "" {
		return baseParentID, nil
	}
	
	// 分割路徑為資料夾名稱
	pathParts := strings.Split(relativePath, "/")
	fmt.Printf("[DEBUG] pathParts before removing file: %v\n", pathParts)
	
	// 移除檔案名稱，只保留資料夾路徑
	if len(pathParts) > 0 {
		pathParts = pathParts[:len(pathParts)-1]
	}
	
	fmt.Printf("[DEBUG] pathParts after removing file: %v\n", pathParts)
	
	// 如果沒有資料夾需要建立，返回原始父ID
	if len(pathParts) == 0 {
		return baseParentID, nil
	}
	
	currentParentID := baseParentID
	
	// 逐層建立資料夾
	for _, folderName := range pathParts {
		// 清理資料夾名稱
		folderName = strings.TrimSpace(folderName)
		if folderName == "" || folderName == "." || folderName == ".." {
			continue
		}
		
		// 檢查資料夾是否已存在
		var existingFolder models.File
		query := h.db.Where("name = ? AND is_directory = ? AND is_deleted = ? AND uploaded_by = ?", 
			folderName, true, false, userID)
		
		if currentParentID != nil {
			query = query.Where("parent_id = ?", *currentParentID)
		} else {
			query = query.Where("parent_id IS NULL")
		}
		
		if err := query.First(&existingFolder).Error; err == nil {
			// 資料夾已存在，使用現有的
			currentParentID = &existingFolder.ID
		} else {
			// 建立新資料夾
			virtualPath := h.buildVirtualPath(currentParentID, folderName)
			
			newFolder := models.File{
				Name:         folderName,
				OriginalName: folderName,
				FilePath:     "", // 虛擬資料夾無實體路徑
				VirtualPath:  virtualPath,
				FileSize:     0,
				MimeType:     "",
				ParentID:     currentParentID,
				UploadedBy:   userID,
				IsDirectory:  true,
				IsDeleted:    false,
			}
			
			if err := h.db.Create(&newFolder).Error; err != nil {
				return nil, fmt.Errorf("建立資料夾 '%s' 失敗: %v", folderName, err)
			}
			
			currentParentID = &newFolder.ID
		}
	}
	
	return currentParentID, nil
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
	
	// MemoryArk 2.0+ 虛擬資料夾系統
	// 不再創建實體目錄，完全基於數據庫的虛擬路徑管理
	fmt.Printf("[CreateFolder] 創建虛擬資料夾: %s (父資料夾ID: %v)\n", req.Name, req.ParentID)
	
	// 建立虛擬路徑
	virtualPath := h.buildVirtualPath(req.ParentID, req.Name)

	// 創建虛擬資料夾記錄 (v2.0+ 設計)
	// 不設置 FilePath，因為虛擬資料夾不需要實體路徑
	// 匯出時使用串流 ZIP 技術動態建構資料夾結構
	folder := models.File{
		Name:         req.Name,
		OriginalName: req.Name,
		FilePath:     "", // 虛擬資料夾無實體路徑
		VirtualPath:  virtualPath,
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
				"message": "創建虛擬資料夾失敗",
			},
		})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "虛擬資料夾創建成功",
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

// deleteFileRecursive 遞迴刪除檔案/資料夾（內部函數）
func (h *FileHandler) deleteFileRecursive(fileID uint, userID uint, tx *gorm.DB) (int, error) {
	var file models.File
	if err := tx.First(&file, fileID).Error; err != nil {
		return 0, err
	}
	
	// 如果已經被刪除，跳過
	if file.IsDeleted {
		return 0, nil
	}
	
	deletedCount := 0
	
	// 如果是資料夾，先遞迴刪除子項目
	if file.IsDirectory {
		var children []models.File
		if err := tx.Where("parent_id = ? AND is_deleted = ?", fileID, false).Find(&children).Error; err != nil {
			return deletedCount, err
		}
		
		for _, child := range children {
			childCount, err := h.deleteFileRecursive(child.ID, userID, tx)
			if err != nil {
				return deletedCount, err
			}
			deletedCount += childCount
		}
	}
	
	// 軟刪除當前項目
	now := time.Now()
	file.IsDeleted = true
	file.DeletedAt = &now
	file.DeletedBy = &userID
	
	if err := tx.Save(&file).Error; err != nil {
		return deletedCount, err
	}
	
	deletedCount++
	return deletedCount, nil
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
	
	userIDVal, ok := userID.(uint)
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
	
	// 開始事務操作
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	
	if err := tx.Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "TRANSACTION_ERROR",
				"message": "事務開始失敗",
			},
		})
		return
	}
	
	// 遞迴刪除檔案/資料夾
	deletedCount, err := h.deleteFileRecursive(file.ID, userIDVal, tx)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "DELETE_FAILED",
				"message": "刪除檔案失敗",
			},
		})
		return
	}
	
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "COMMIT_FAILED",
				"message": "提交事務失敗",
			},
		})
		return
	}
	
	// 重新載入檔案資訊以返回給前端
	if err := h.db.First(&file, fileID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "RELOAD_FAILED",
				"message": "重新載入檔案失敗",
			},
		})
		return
	}
	
	message := "檔案已移至垃圾桶"
	if file.IsDirectory && deletedCount > 1 {
		message = fmt.Sprintf("資料夾及其 %d 個子項目已移至垃圾桶", deletedCount-1)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data": gin.H{
			"file": file,
			"deletedCount": deletedCount,
		},
	})
}

// restoreFileRecursive 遞迴還原檔案/資料夾（內部函數）
func (h *FileHandler) restoreFileRecursive(fileID uint, tx *gorm.DB) (int, error) {
	var file models.File
	if err := tx.First(&file, fileID).Error; err != nil {
		return 0, err
	}
	
	// 如果沒有被刪除，跳過
	if !file.IsDeleted {
		return 0, nil
	}
	
	restoredCount := 0
	
	// 還原當前項目
	file.IsDeleted = false
	file.DeletedAt = nil
	file.DeletedBy = nil
	
	if err := tx.Save(&file).Error; err != nil {
		return restoredCount, err
	}
	
	restoredCount++
	
	// 如果是資料夾，遞迴還原子項目
	if file.IsDirectory {
		var children []models.File
		if err := tx.Where("parent_id = ? AND is_deleted = ?", fileID, true).Find(&children).Error; err != nil {
			return restoredCount, err
		}
		
		for _, child := range children {
			childCount, err := h.restoreFileRecursive(child.ID, tx)
			if err != nil {
				return restoredCount, err
			}
			restoredCount += childCount
		}
	}
	
	return restoredCount, nil
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
	
	// 開始事務操作
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	
	if err := tx.Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "TRANSACTION_ERROR",
				"message": "事務開始失敗",
			},
		})
		return
	}
	
	// 遞迴還原檔案/資料夾
	restoredCount, err := h.restoreFileRecursive(file.ID, tx)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "RESTORE_FAILED",
				"message": "還原檔案失敗",
			},
		})
		return
	}
	
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "COMMIT_FAILED",
				"message": "提交事務失敗",
			},
		})
		return
	}
	
	// 重新載入檔案資訊以返回給前端
	if err := h.db.First(&file, fileID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code": "RELOAD_FAILED",
				"message": "重新載入檔案失敗",
			},
		})
		return
	}
	
	message := "檔案還原成功"
	if file.IsDirectory && restoredCount > 1 {
		message = fmt.Sprintf("資料夾及其 %d 個子項目還原成功", restoredCount-1)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data": gin.H{
			"file": file,
			"restoredCount": restoredCount,
		},
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
	
	// 如果是資料夾，需要遞歸刪除子項目
	if file.IsDirectory {
		if err := h.permanentDeleteFolderRecursive(file.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code": "DELETE_FAILED",
					"message": "永久刪除資料夾失敗: " + err.Error(),
				},
			})
			return
		}
	} else {
		// 刪除實體檔案
		if file.FilePath != "" {
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
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "檔案已永久刪除",
	})
}

// permanentDeleteFolderRecursive 遞歸永久刪除資料夾及其子項目
func (h *FileHandler) permanentDeleteFolderRecursive(folderID uint) error {
	// 查找所有子項目
	var children []models.File
	if err := h.db.Where("parent_id = ? AND is_deleted = ?", folderID, true).Find(&children).Error; err != nil {
		return err
	}
	
	// 遞歸刪除子項目
	for _, child := range children {
		if child.IsDirectory {
			// 遞歸刪除子資料夾
			if err := h.permanentDeleteFolderRecursive(child.ID); err != nil {
				return err
			}
		} else {
			// 刪除子檔案的實體檔案
			if child.FilePath != "" {
				if err := os.Remove(child.FilePath); err != nil {
					// 記錄錯誤但不中斷操作
					fmt.Printf("Failed to remove file %s: %v\n", child.FilePath, err)
				}
			}
		}
		
		// 刪除子項目的資料庫記錄
		if err := h.db.Delete(&child).Error; err != nil {
			return err
		}
	}
	
	// 最後刪除資料夾本身
	if err := h.db.Delete(&models.File{}, folderID).Error; err != nil {
		return err
	}
	
	return nil
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

// PreviewFile 預覽檔案（內聯顯示，不強制下載）
func (h *FileHandler) PreviewFile(c *gin.Context) {
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

	// 檢查檔案權限（如有需要）
	// TODO: 根據需求添加權限檢查邏輯

	// 檢查實體檔案是否存在
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
	
	// 設定回應標頭（內聯顯示）
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", fmt.Sprintf("%d", file.FileSize))
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", file.OriginalName))
	
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

// GetTrash 獲取垃圾桶檔案列表
func (h *FileHandler) GetTrash(c *gin.Context) {
	// 驗證用戶已登入
	_, exists := c.Get("user_id")
	if !exists {
		api.Unauthorized(c, "未授權訪問")
		return
	}
	
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	parentIDStr := c.DefaultQuery("parent_id", "")
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	
	offset := (page - 1) * limit
	
	var files []models.File
	var total int64
	
	// 檢查是否指定了 parent_id（垃圾桶階層瀏覽）
	if parentIDStr != "" {
		// 階層瀏覽模式：顯示指定已刪除資料夾的子項目
		parentID, err := strconv.ParseUint(parentIDStr, 10, 32)
		if err != nil {
			api.Error(c, http.StatusBadRequest, api.ErrInvalidRequest, "無效的父資料夾ID")
			return
		}
		
		// 確認父資料夾確實存在且已被刪除
		var parentFolder models.File
		if err := h.db.Where("id = ? AND is_deleted = ? AND is_directory = ?", parentID, true, true).First(&parentFolder).Error; err != nil {
			api.Error(c, http.StatusNotFound, api.ErrFileNotFound, "父資料夾不存在或未被刪除")
			return
		}
		
		// 獲取該已刪除資料夾的所有已刪除子項目
		query := h.db.Model(&models.File{}).Where("parent_id = ? AND is_deleted = ?", parentID, true)
		
		// 計算總數
		if err := query.Count(&total).Error; err != nil {
			api.Error(c, http.StatusInternalServerError, api.ErrDatabaseError, "查詢垃圾桶檔案失敗")
			return
		}
		
		// 獲取檔案列表
		if err := query.Preload("Uploader").Preload("DeletedByUser").Preload("Category").
			Order("is_directory DESC, name ASC").
			Offset(offset).Limit(limit).
			Find(&files).Error; err != nil {
			api.Error(c, http.StatusInternalServerError, api.ErrDatabaseError, "查詢垃圾桶檔案失敗")
			return
		}
	} else {
		// 頂級視圖模式：只顯示頂級已刪除項目
		// 方法：獲取所有已刪除的項目，然後篩選出父項目未被刪除的項目
		// 1. 獲取所有已刪除項目
		var allDeleted []models.File
		h.db.Where("is_deleted = ?", true).Find(&allDeleted)
	
		// 2. 篩選頂級項目（父項目未被刪除或為NULL）
		var topLevelDeleted []models.File
		for _, file := range allDeleted {
			if file.ParentID == nil {
				// 頂級項目（沒有父項目）
				topLevelDeleted = append(topLevelDeleted, file)
			} else {
				// 檢查父項目是否被刪除
				parentDeleted := false
				for _, parent := range allDeleted {
					if parent.ID == *file.ParentID {
						parentDeleted = true
						break
					}
				}
				if !parentDeleted {
					// 父項目沒有被刪除，這是一個頂級刪除項目
					topLevelDeleted = append(topLevelDeleted, file)
				}
			}
		}
	
		// 準備返回結果
		files = topLevelDeleted
		total = int64(len(topLevelDeleted))
	
		// 應用分頁
		if offset < len(files) {
			end := offset + limit
			if end > len(files) {
				end = len(files)
			}
			files = files[offset:end]
		} else {
			files = []models.File{}
		}
	}
	
	// 為圖片檔案生成縮圖URL
	for i := range files {
		if files[i].MimeType != "" && strings.HasPrefix(files[i].MimeType, "image/") && !files[i].IsDirectory {
			files[i].ThumbnailURL = fmt.Sprintf("/api/files/%d/preview", files[i].ID)
		}
	}
	
	api.SuccessWithPagination(c, gin.H{
		"files": files,
	}, page, limit, total)
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
		fmt.Printf("[DEBUG] 處理檔案 ID:%d, 名稱:%s, 路徑:%s, 是否目錄:%t\n", file.ID, file.Name, file.FilePath, file.IsDirectory)
		
		fileDeleted := true
		
		// 刪除實體檔案
		if !file.IsDirectory && file.FilePath != "" {
			// 檢查檔案路徑是否為絕對路徑，如果不是則加上 /app/ 前綴
			filePath := file.FilePath
			if !strings.HasPrefix(filePath, "/") {
				filePath = "/app/" + filePath
			}
			
			fmt.Printf("[DEBUG] 嘗試刪除實體檔案: %s\n", filePath)
			if err := os.Remove(filePath); err != nil {
				if os.IsNotExist(err) {
					fmt.Printf("[DEBUG] 檔案不存在，可能已被刪除: %s\n", filePath)
				} else {
					fmt.Printf("Failed to remove file %s: %v\n", filePath, err)
					fileDeleted = false
				}
			} else {
				fmt.Printf("[DEBUG] 成功刪除實體檔案: %s\n", filePath)
			}
		}
		
		// 如果實體檔案刪除成功或不存在，則刪除資料庫記錄
		if fileDeleted {
			fmt.Printf("[DEBUG] 嘗試刪除資料庫記錄 ID:%d\n", file.ID)
			if err := h.db.Delete(&file).Error; err != nil {
				fmt.Printf("Failed to delete file record %d: %v\n", file.ID, err)
				failedCount++
				continue
			}
			fmt.Printf("[DEBUG] 成功刪除檔案 ID:%d\n", file.ID)
			deletedCount++
		} else {
			failedCount++
		}
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

// checkSameLocationAndName 檢查指定位置是否已存在相同檔名的檔案
func (h *FileHandler) checkSameLocationAndName(fileName string, parentID *uint, userID uint) (*models.File, error) {
	var existingFile models.File
	query := h.db.Where("name = ? AND is_deleted = ? AND uploaded_by = ?", fileName, false, userID)
	
	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	
	if err := query.First(&existingFile).Error; err != nil {
		return nil, err // 檔案不存在
	}
	
	return &existingFile, nil
}
