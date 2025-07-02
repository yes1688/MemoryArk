package handlers

import (
	"crypto/md5"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
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
	wsHandler interface{} // WebSocket 處理器接口
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
	".tif":  true,
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
	".wmz":  true,
	
	// 設計軟體檔案
	".psd":  true,  // Adobe Photoshop
	".ai":   true,  // Adobe Illustrator
	".cdr":  true,  // CorelDRAW
	".indd": true,  // Adobe InDesign
	".idlk": true,  // InDesign 鎖定檔案
	
	// 其他檔案類型
	".msg":  true,  // Outlook 郵件檔案
	".shs":  true,  // Windows Shell Scrap Object
	
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
	
	// 如果沒有副檔名，拒絕上傳（要求所有檔案都必須有副檔名）
	if ext == "" {
		return false
	}
	
	// 檢查是否在允許名單中
	return allowedExtensions[ext]
}

// NewFileHandler 創建檔案處理器
func NewFileHandler(db *gorm.DB, cfg *config.Config) *FileHandler {
	return &FileHandler{
		db:        db,
		cfg:       cfg,
		wsHandler: nil, // 將在路由器中設置
	}
}

// SetWebSocketHandler 設置 WebSocket 處理器
func (h *FileHandler) SetWebSocketHandler(wsHandler interface{}) {
	h.wsHandler = wsHandler
}

// broadcastFileEvent 廣播檔案系統事件
func (h *FileHandler) broadcastFileEvent(eventType string, folderId *int, message string, data interface{}) {
	if h.wsHandler != nil {
		// 使用類型斷言來調用 BroadcastFileEvent 方法
		if handler, ok := h.wsHandler.(interface {
			BroadcastFileEvent(eventType string, folderId *int, message string, data interface{})
		}); ok {
			handler.BroadcastFileEvent(eventType, folderId, message, data)
		}
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
	fromLine := c.DefaultQuery("from_line", "")       // 只顯示 LINE 上傳的檔案
	lineGroupID := c.DefaultQuery("line_group_id", "") // 按 LINE 群組篩選
	sortBy := c.DefaultQuery("sort_by", "name")        // 排序欄位：name, created_at, file_size
	sortOrder := c.DefaultQuery("sort_order", "asc")   // 排序方向：asc, desc
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
	
	// LINE 篩選
	if fromLine == "true" {
		// 只顯示有 LINE 上傳記錄的檔案
		query = query.Joins("INNER JOIN line_upload_records ON files.id = line_upload_records.file_id")
	}
	
	if lineGroupID != "" {
		// 按 LINE 群組篩選
		query = query.Joins("INNER JOIN line_upload_records ON files.id = line_upload_records.file_id").
			Where("line_upload_records.line_group_id = ?", lineGroupID)
	}
	
	var files []models.File
	var total int64
	
	// 計算總數
	if err := query.Count(&total).Error; err != nil {
		api.Error(c, http.StatusInternalServerError, api.ErrDatabaseError, "查詢檔案失敗")
		return
	}
	
	// 構建排序條件 - 修復欄位名稱對應
	var orderClause string
	fmt.Printf("📝 排序參數: sortBy=%s, sortOrder=%s\n", sortBy, sortOrder)
	
	switch sortBy {
	case "created_at":
		// 使用資料庫欄位名稱
		orderClause = fmt.Sprintf("is_directory DESC, created_at %s", strings.ToUpper(sortOrder))
	case "file_size":
		// 使用資料庫欄位名稱
		orderClause = fmt.Sprintf("is_directory DESC, file_size %s", strings.ToUpper(sortOrder))
	case "name":
		fallthrough
	default:
		orderClause = fmt.Sprintf("is_directory DESC, name %s", strings.ToUpper(sortOrder))
	}
	
	fmt.Printf("📝 排序 SQL: %s\n", orderClause)
	
	// 獲取檔案列表 (包含 LINE 上傳記錄)
	if err := query.Preload("Uploader").Preload("DeletedByUser").Preload("Category").
		Preload("LineUploadRecord").Preload("LineUploadRecord.LineUser").
		Order(orderClause).
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


// SearchFiles 全域搜尋檔案
func (h *FileHandler) SearchFiles(c *gin.Context) {
	// 驗證用戶已登入
	_, exists := c.Get("user_id")
	if !exists {
		api.Unauthorized(c, "未授權訪問")
		return
	}
	
	// 取得搜尋參數
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		api.Error(c, http.StatusBadRequest, "MISSING_QUERY", "搜尋關鍵字不能為空")
		return
	}
	
	// 搜尋範圍參數
	folderID := c.Query("folder_id")
	recursive := c.DefaultQuery("recursive", "true") == "true"
	
	// 篩選參數
	fileTypes := c.Query("file_types")     // image,video,document,audio,other
	minSizeStr := c.Query("min_size")     // 最小檔案大小（bytes）
	maxSizeStr := c.Query("max_size")     // 最大檔案大小（bytes）
	fromLine := c.Query("from_line")      // 只搜尋 LINE 上傳的檔案
	lineGroupID := c.Query("line_group_id") // 指定 LINE 群組
	
	// 分頁和排序參數
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	sortBy := c.DefaultQuery("sort_by", "name")
	sortOrder := c.DefaultQuery("sort_order", "asc")
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	
	offset := (page - 1) * limit
	
	// 構建基礎查詢
	baseQuery := h.db.Model(&models.File{}).Where("is_deleted = ?", false)
	
	// 全文搜尋檔案名稱
	baseQuery = baseQuery.Where("name LIKE ? OR original_name LIKE ?", 
		"%"+query+"%", "%"+query+"%")
	
	// 搜尋範圍限制
	if folderID != "" {
		if recursive {
			// 遞迴搜尋：使用虛擬路徑前綴匹配
			var folder models.File
			if err := h.db.First(&folder, folderID).Error; err == nil && folder.IsDirectory {
				// 搜尋該資料夾及其所有子資料夾
				virtualPathPrefix := folder.VirtualPath
				if virtualPathPrefix != "" && !strings.HasSuffix(virtualPathPrefix, "/") {
					virtualPathPrefix += "/"
				}
				baseQuery = baseQuery.Where("virtual_path LIKE ?", virtualPathPrefix+"%")
			}
		} else {
			// 只搜尋直接子檔案
			baseQuery = baseQuery.Where("parent_id = ?", folderID)
		}
	}
	
	// 檔案類型篩選
	if fileTypes != "" {
		types := strings.Split(fileTypes, ",")
		conditions := []string{}
		args := []interface{}{}
		
		for _, fileType := range types {
			switch strings.TrimSpace(fileType) {
			case "image":
				conditions = append(conditions, "mime_type LIKE ?")
				args = append(args, "image/%")
			case "video":
				conditions = append(conditions, "mime_type LIKE ?")
				args = append(args, "video/%")
			case "audio":
				conditions = append(conditions, "mime_type LIKE ?")
				args = append(args, "audio/%")
			case "document":
				conditions = append(conditions, "(mime_type LIKE ? OR mime_type LIKE ? OR mime_type LIKE ? OR mime_type LIKE ?)")
				args = append(args, "application/pdf", "application/msword", "application/vnd.ms-%", "text/%")
			case "other":
				conditions = append(conditions, "(mime_type NOT LIKE ? AND mime_type NOT LIKE ? AND mime_type NOT LIKE ? AND mime_type NOT LIKE ? AND mime_type NOT LIKE ? AND mime_type NOT LIKE ?)")
				args = append(args, "image/%", "video/%", "audio/%", "application/pdf", "application/msword", "application/vnd.ms-%")
			}
		}
		
		if len(conditions) > 0 {
			baseQuery = baseQuery.Where("("+strings.Join(conditions, " OR ")+")", args...)
		}
	}
	
	// 檔案大小篩選
	if minSizeStr != "" {
		if minSize, err := strconv.ParseInt(minSizeStr, 10, 64); err == nil {
			baseQuery = baseQuery.Where("file_size >= ?", minSize)
		}
	}
	if maxSizeStr != "" {
		if maxSize, err := strconv.ParseInt(maxSizeStr, 10, 64); err == nil {
			baseQuery = baseQuery.Where("file_size <= ?", maxSize)
		}
	}
	
	// LINE 篩選
	if fromLine == "true" {
		baseQuery = baseQuery.Joins("INNER JOIN line_upload_records ON files.id = line_upload_records.file_id")
	}
	if lineGroupID != "" {
		baseQuery = baseQuery.Joins("INNER JOIN line_upload_records ON files.id = line_upload_records.file_id").
			Where("line_upload_records.line_group_id = ?", lineGroupID)
	}
	
	// 計算總數
	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		api.Error(c, http.StatusInternalServerError, api.ErrDatabaseError, "搜尋失敗")
		return
	}
	
	// 構建排序條件
	var orderClause string
	switch sortBy {
	case "created_at":
		orderClause = fmt.Sprintf("is_directory DESC, created_at %s", strings.ToUpper(sortOrder))
	case "file_size":
		orderClause = fmt.Sprintf("is_directory DESC, file_size %s", strings.ToUpper(sortOrder))
	case "name":
		fallthrough
	default:
		orderClause = fmt.Sprintf("is_directory DESC, name %s", strings.ToUpper(sortOrder))
	}
	
	// 查詢結果
	var files []models.File
	if err := baseQuery.Preload("Uploader").Preload("DeletedByUser").Preload("Category").
		Preload("LineUploadRecord").Preload("LineUploadRecord.LineUser").
		Order(orderClause).
		Offset(offset).Limit(limit).
		Find(&files).Error; err != nil {
		api.Error(c, http.StatusInternalServerError, api.ErrDatabaseError, "搜尋失敗")
		return
	}
	
	// 為圖片檔案生成縮圖URL
	for i := range files {
		if files[i].MimeType != "" && strings.HasPrefix(files[i].MimeType, "image/") && !files[i].IsDirectory {
			files[i].ThumbnailURL = fmt.Sprintf("/api/files/%d/preview", files[i].ID)
		}
	}
	
	// 構建搜尋範圍描述
	searchScope := "全部檔案"
	if folderID != "" {
		var folder models.File
		if err := h.db.First(&folder, folderID).Error; err == nil {
			if recursive {
				searchScope = fmt.Sprintf("資料夾 '%s' 及其子資料夾", folder.Name)
			} else {
				searchScope = fmt.Sprintf("資料夾 '%s'", folder.Name)
			}
		}
	}
	
	// 返回搜尋結果
	api.SuccessWithPagination(c, gin.H{
		"files": files,
		"search_query": query,
		"search_scope": searchScope,
	}, page, limit, total)
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
	
	// 檢查是否為系統檔案
	if strings.EqualFold(file.Filename, "Thumbs.db") ||
		strings.EqualFold(file.Filename, ".DS_Store") ||
		strings.HasPrefix(file.Filename, "~") ||
		strings.HasSuffix(file.Filename, ".tmp") {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code": "SYSTEM_FILE",
				"message": fmt.Sprintf("系統檔案 '%s' 不需要上傳", file.Filename),
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

		// 廣播檔案去重上傳事件
		var broadcastParentID *int
		if parentIDPtr != nil {
			id := int(*parentIDPtr)
			broadcastParentID = &id
		}
		h.broadcastFileEvent("upload", broadcastParentID, fmt.Sprintf("檔案 '%s' 去重上傳成功", file.Filename), gin.H{
			"fileId": fileRecord.ID,
			"fileName": fileRecord.Name,
			"uploadedBy": fileRecord.UploadedBy,
			"deduplicated": true,
		})

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
	
	// 廣播檔案上傳事件
	var broadcastParentID *int
	if parentIDPtr != nil {
		id := int(*parentIDPtr)
		broadcastParentID = &id
	}
	h.broadcastFileEvent("upload", broadcastParentID, fmt.Sprintf("檔案 '%s' 上傳成功", file.Filename), gin.H{
		"fileId": fileRecord.ID,
		"fileName": fileRecord.Name,
		"fileSize": fileRecord.FileSize,
		"uploadedBy": fileRecord.UploadedBy,
	})

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
	fmt.Printf("[DEBUG] pathParts (folder structure): %v\n", pathParts)
	
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
	
	// 廣播資料夾創建事件
	var broadcastParentID *int
	if req.ParentID != nil {
		id := int(*req.ParentID)
		broadcastParentID = &id
	}
	h.broadcastFileEvent("create", broadcastParentID, fmt.Sprintf("資料夾 '%s' 創建成功", req.Name), gin.H{
		"folderId": folder.ID,
		"folderName": folder.Name,
		"createdBy": folder.UploadedBy,
	})

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
	
	// 廣播檔案刪除事件
	var broadcastParentID *int
	if file.ParentID != nil {
		id := int(*file.ParentID)
		broadcastParentID = &id
	}
	h.broadcastFileEvent("delete", broadcastParentID, fmt.Sprintf("檔案 '%s' 已移至垃圾桶", file.Name), gin.H{
		"fileId": file.ID,
		"fileName": file.Name,
		"deletedCount": deletedCount,
		"isDirectory": file.IsDirectory,
	})
	
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

// BatchUploadResult 批量上傳結果
type BatchUploadResult struct {
	Success      bool                   `json:"success"`
	TotalFiles   int                    `json:"total_files"`
	UploadedCount int                   `json:"uploaded_count"`
	SkippedCount int                    `json:"skipped_count"`
	FailedCount  int                    `json:"failed_count"`
	UploadedFiles []models.File         `json:"uploaded_files"`
	SkippedFiles []SkippedFileInfo     `json:"skipped_files"`
	FailedFiles  []FailedFileInfo      `json:"failed_files"`
}

// SkippedFileInfo 跳過的檔案資訊
type SkippedFileInfo struct {
	Filename string `json:"filename"`
	Reason   string `json:"reason"`
	Size     int64  `json:"size"`
}

// FailedFileInfo 失敗的檔案資訊
type FailedFileInfo struct {
	Filename string `json:"filename"`
	Reason   string `json:"reason"`
	Size     int64  `json:"size"`
}

// BatchUploadFile 批量上傳檔案
func (h *FileHandler) BatchUploadFile(c *gin.Context) {
	fmt.Printf("[DEBUG] BatchUploadFile START\n")
	
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

	// 解析 multipart form
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		fmt.Printf("[ERROR] Failed to parse multipart form: %v\n", err)
		api.Error(c, http.StatusBadRequest, api.ErrInvalidRequest, "無法解析上傳表單")
		return
	}

	// 獲取所有上傳的檔案
	form := c.Request.MultipartForm
	files := form.File["files"]
	
	if len(files) == 0 {
		api.Error(c, http.StatusBadRequest, api.ErrInvalidRequest, "沒有選擇檔案")
		return
	}

	// 獲取其他參數
	parentIDStr := c.PostForm("parent_id")
	var parentID *uint
	if parentIDStr != "" {
		if pid, err := strconv.ParseUint(parentIDStr, 10, 32); err == nil {
			parentIDVal := uint(pid)
			parentID = &parentIDVal
		}
	}

	// 初始化結果
	result := BatchUploadResult{
		Success:       true,
		TotalFiles:    len(files),
		UploadedFiles: make([]models.File, 0),
		SkippedFiles:  make([]SkippedFileInfo, 0),
		FailedFiles:   make([]FailedFileInfo, 0),
	}

	// 處理每個檔案
	for _, fileHeader := range files {
		fmt.Printf("[DEBUG] Processing file: %s (size: %d)\n", fileHeader.Filename, fileHeader.Size)
		
		// 檢查檔案是否應該跳過
		if shouldSkipFile(fileHeader.Filename, fileHeader.Size) {
			reason := getSkipReason(fileHeader.Filename, fileHeader.Size)
			result.SkippedFiles = append(result.SkippedFiles, SkippedFileInfo{
				Filename: fileHeader.Filename,
				Reason:   reason,
				Size:     fileHeader.Size,
			})
			result.SkippedCount++
			fmt.Printf("[INFO] Skipped file: %s (%s)\n", fileHeader.Filename, reason)
			continue
		}

		// 嘗試上傳檔案
		uploadedFile, err := h.processSingleFile(fileHeader, userID, parentID)
		if err != nil {
			result.FailedFiles = append(result.FailedFiles, FailedFileInfo{
				Filename: fileHeader.Filename,
				Reason:   err.Error(),
				Size:     fileHeader.Size,
			})
			result.FailedCount++
			fmt.Printf("[ERROR] Failed to upload file %s: %v\n", fileHeader.Filename, err)
			continue
		}

		result.UploadedFiles = append(result.UploadedFiles, *uploadedFile)
		result.UploadedCount++
		fmt.Printf("[SUCCESS] Uploaded file: %s\n", fileHeader.Filename)
	}

	// 回傳結果
	c.JSON(http.StatusOK, result)
}

// shouldSkipFile 判斷是否應該跳過檔案
func shouldSkipFile(filename string, size int64) bool {
	// 檢查檔案大小
	maxSize := int64(100 * 1024 * 1024) // 100MB
	if size > maxSize {
		return true
	}

	// 檢查系統檔案
	if strings.EqualFold(filename, "Thumbs.db") ||
		strings.EqualFold(filename, ".DS_Store") ||
		strings.HasPrefix(filename, "~") ||
		strings.HasSuffix(filename, ".tmp") {
		return true
	}

	// 檢查檔案類型
	if !isValidFileExtension(filename) {
		return true
	}

	return false
}

// getSkipReason 取得跳過檔案的原因
func getSkipReason(filename string, size int64) string {
	maxSize := int64(100 * 1024 * 1024) // 100MB
	if size > maxSize {
		return fmt.Sprintf("檔案過大 (%.1fMB > 100MB)", float64(size)/(1024*1024))
	}

	if strings.EqualFold(filename, "Thumbs.db") || strings.EqualFold(filename, ".DS_Store") {
		return "系統暫存檔案"
	}

	if strings.HasPrefix(filename, "~") {
		return "暫存檔案"
	}

	if strings.HasSuffix(filename, ".tmp") {
		return "臨時檔案"
	}

	if !isValidFileExtension(filename) {
		ext := strings.ToLower(filepath.Ext(filename))
		return fmt.Sprintf("不支援的檔案類型: %s", ext)
	}

	return "未知原因"
}

// processSingleFile 處理單個檔案上傳
func (h *FileHandler) processSingleFile(fileHeader *multipart.FileHeader, userID uint, parentID *uint) (*models.File, error) {
	// 檢查檔案類型
	if !isValidFileExtension(fileHeader.Filename) {
		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		return nil, fmt.Errorf("不允許上傳 '%s' 類型的檔案", ext)
	}

	// 檢查檔案大小
	maxSize := int64(100 * 1024 * 1024) // 100MB
	if fileHeader.Size > maxSize {
		return nil, fmt.Errorf("檔案大小超過限制")
	}

	// 開啟檔案
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("無法讀取上傳檔案: %v", err)
	}
	defer file.Close()

	// 讀取檔案內容
	content, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("無法讀取檔案內容: %v", err)
	}

	// 計算 SHA256
	sha256Hash := sha256.Sum256(content)
	sha256Hex := fmt.Sprintf("%x", sha256Hash)

	// 檢查去重 (暫時停用，因為配置中沒有此欄位)
	// TODO: 添加配置支援後再啟用去重功能

	// 生成唯一檔案名
	ext := filepath.Ext(fileHeader.Filename)
	uniqueFilename := uuid.New().String() + ext
	
	// 確保上傳目錄存在
	uploadDir := "./uploads" // 使用固定路徑
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("建立上傳目錄失敗: %v", err)
	}

	// 儲存檔案
	filePath := filepath.Join(uploadDir, uniqueFilename)
	if err := os.WriteFile(filePath, content, 0644); err != nil {
		return nil, fmt.Errorf("儲存檔案失敗: %v", err)
	}

	// 計算 MD5 (暫時不需要)
	// md5Hash := md5.Sum(content)
	// md5Hex := fmt.Sprintf("%x", md5Hash)

	// 建立檔案記錄
	fileRecord := models.File{
		Name:         fileHeader.Filename,
		OriginalName: fileHeader.Filename,
		FilePath:     filePath,
		FileSize:     fileHeader.Size,
		MimeType:     http.DetectContentType(content),
		SHA256Hash:   sha256Hex,
		VirtualPath:  h.buildVirtualPath(parentID, fileHeader.Filename),
		ParentID:     parentID,
		UploadedBy:   userID,
		IsDirectory:  false,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := h.db.Create(&fileRecord).Error; err != nil {
		// 刪除已儲存的檔案
		os.Remove(filePath)
		return nil, fmt.Errorf("建立檔案記錄失敗: %v", err)
	}

	return &fileRecord, nil
}

// ChunkUploadInit 初始化分塊上傳會話
func (h *FileHandler) ChunkUploadInit(c *gin.Context) {
	// 調試：檢查所有可用的上下文 keys
	fmt.Printf("[DEBUG] 🔧 ChunkUploadInit - 檢查所有 Context Keys:\n")
	fmt.Printf("user_id: %v\n", c.GetString("user_id"))
	fmt.Printf("userID: %v\n", c.GetString("userID"))
	if user, exists := c.Get("user"); exists {
		fmt.Printf("user: %v\n", user)
	}
	fmt.Printf("user_email: %v\n", c.GetString("user_email"))
	fmt.Printf("===============================\n")
	
	userID, exists := c.Get("user_id")
	if !exists {
		fmt.Printf("[DEBUG] 🔧 ChunkUploadInit - user_id NOT EXISTS\n")
		api.ErrorResponse(c, http.StatusUnauthorized, "未認證")
		return
	}
	fmt.Printf("[DEBUG] 🔧 ChunkUploadInit - user_id EXISTS: %v\n", userID)

	var req struct {
		FileName       string   `json:"fileName" binding:"required"`
		FileSize       int64    `json:"fileSize" binding:"required"`
		FileHash       string   `json:"fileHash" binding:"required"`
		TotalChunks    int      `json:"totalChunks" binding:"required"`
		ChunkSize      int      `json:"chunkSize" binding:"required"`
		RelativePath   string   `json:"relativePath"`
		CompletedChunks []string `json:"completedChunks"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api.ErrorResponse(c, http.StatusBadRequest, "請求參數錯誤: "+err.Error())
		return
	}

	// 檢查檔案大小限制 (100MB)
	if req.FileSize > 100*1024*1024 {
		api.ErrorResponse(c, http.StatusBadRequest, "檔案大小超過限制 (100MB)")
		return
	}

	// 檢查檔案類型
	ext := strings.ToLower(filepath.Ext(req.FileName))
	if !allowedExtensions[ext] {
		api.ErrorResponse(c, http.StatusBadRequest, "不支援的檔案類型: "+ext)
		return
	}

	// 檢查是否已存在相同檔案 (透過 hash)
	var existingFile models.File
	if err := h.db.Where("sha256_hash = ? AND uploaded_by = ?", req.FileHash, userID).First(&existingFile).Error; err == nil {
		// 檔案已存在，直接返回
		api.SuccessResponse(c, gin.H{
			"existing": true,
			"file": existingFile,
			"message": "檔案已存在，跳過上傳",
		})
		return
	}

	// 生成會話ID
	sessionID := uuid.New().String()

	// 處理相對路徑，確定父資料夾
	var parentID *uint
	if req.RelativePath != "" {
		var err error
		parentID, err = h.ensureFolderStructure(userID.(uint), nil, filepath.Dir(req.RelativePath))
		if err != nil {
			api.ErrorResponse(c, http.StatusInternalServerError, "建立資料夾結構失敗: "+err.Error())
			return
		}
	}

	// 建立分塊會話
	session := models.ChunkSession{
		ID:             sessionID,
		UserID:         userID.(uint),
		FileName:       req.FileName,
		FileSize:       req.FileSize,
		FileHash:       req.FileHash,
		TotalChunks:    req.TotalChunks,
		ChunkSize:      req.ChunkSize,
		UploadedChunks: "[]", // 初始為空陣列
		RelativePath:   req.RelativePath,
		ParentID:       parentID,
		Status:         "active",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		ExpiresAt:      time.Now().Add(24 * time.Hour), // 24小時過期
	}

	if err := h.db.Create(&session).Error; err != nil {
		api.ErrorResponse(c, http.StatusInternalServerError, "建立上傳會話失敗: "+err.Error())
		return
	}

	// 建立臨時目錄
	tempDir := filepath.Join(h.cfg.Upload.UploadPath, "chunks", sessionID)
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		api.ErrorResponse(c, http.StatusInternalServerError, "建立臨時目錄失敗: "+err.Error())
		return
	}

	api.SuccessResponse(c, gin.H{
		"id": sessionID,
		"sessionId": sessionID,
		"chunkSize": req.ChunkSize,
		"totalChunks": req.TotalChunks,
		"existing": false,
	})
}

// ChunkUpload 上傳檔案分塊
func (h *FileHandler) ChunkUpload(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		api.ErrorResponse(c, http.StatusUnauthorized, "未認證")
		return
	}

	sessionID := c.PostForm("sessionId")
	chunkIndexStr := c.PostForm("chunkIndex")
	chunkHash := c.PostForm("chunkHash")

	if sessionID == "" || chunkIndexStr == "" || chunkHash == "" {
		api.ErrorResponse(c, http.StatusBadRequest, "缺少必要參數")
		return
	}

	chunkIndex, err := strconv.Atoi(chunkIndexStr)
	if err != nil {
		api.ErrorResponse(c, http.StatusBadRequest, "分塊索引格式錯誤")
		return
	}

	// 查找會話
	var session models.ChunkSession
	if err := h.db.Where("id = ? AND user_id = ? AND status = ?", sessionID, userID, "active").First(&session).Error; err != nil {
		api.ErrorResponse(c, http.StatusNotFound, "上傳會話不存在或已過期")
		return
	}

	// 檢查會話是否過期
	if time.Now().After(session.ExpiresAt) {
		h.db.Model(&session).Update("status", "expired")
		api.ErrorResponse(c, http.StatusBadRequest, "上傳會話已過期")
		return
	}

	// 取得上傳的分塊檔案
	fileHeader, err := c.FormFile("chunkData")
	if err != nil {
		api.ErrorResponse(c, http.StatusBadRequest, "無法取得分塊資料: "+err.Error())
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		api.ErrorResponse(c, http.StatusBadRequest, "無法開啟分塊檔案: "+err.Error())
		return
	}
	defer file.Close()

	// 讀取分塊內容
	content, err := io.ReadAll(file)
	if err != nil {
		api.ErrorResponse(c, http.StatusInternalServerError, "讀取分塊內容失敗: "+err.Error())
		return
	}

	// 驗證分塊 hash
	actualHash := fmt.Sprintf("%x", sha256.Sum256(content))
	if actualHash != chunkHash {
		api.ErrorResponse(c, http.StatusBadRequest, "分塊 hash 驗證失敗")
		return
	}

	// 儲存分塊到臨時目錄
	chunkDir := filepath.Join(h.cfg.Upload.UploadPath, "chunks", sessionID)
	chunkPath := filepath.Join(chunkDir, fmt.Sprintf("chunk_%d", chunkIndex))
	
	if err := os.WriteFile(chunkPath, content, 0644); err != nil {
		api.ErrorResponse(c, http.StatusInternalServerError, "儲存分塊失敗: "+err.Error())
		return
	}

	// 更新已上傳分塊列表
	var uploadedChunks []int
	if err := json.Unmarshal([]byte(session.UploadedChunks), &uploadedChunks); err != nil {
		uploadedChunks = []int{}
	}

	// 檢查分塊是否已存在
	chunkExists := false
	for _, idx := range uploadedChunks {
		if idx == chunkIndex {
			chunkExists = true
			break
		}
	}

	if !chunkExists {
		uploadedChunks = append(uploadedChunks, chunkIndex)
		uploadedChunksJSON, _ := json.Marshal(uploadedChunks)
		
		if err := h.db.Model(&session).Update("uploaded_chunks", string(uploadedChunksJSON)).Error; err != nil {
			api.ErrorResponse(c, http.StatusInternalServerError, "更新上傳進度失敗: "+err.Error())
			return
		}
	}

	// 檢查是否所有分塊都已上傳完成
	completed := len(uploadedChunks) >= session.TotalChunks

	api.SuccessResponse(c, gin.H{
		"success": true,
		"chunkIndex": chunkIndex,
		"uploadedChunks": uploadedChunks,
		"completed": completed,
		"progress": float64(len(uploadedChunks)) / float64(session.TotalChunks) * 100,
	})
}

// ChunkUploadFinalize 完成分塊上傳，合併檔案
func (h *FileHandler) ChunkUploadFinalize(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		api.ErrorResponse(c, http.StatusUnauthorized, "未認證")
		return
	}

	var req struct {
		SessionID string `json:"sessionId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api.ErrorResponse(c, http.StatusBadRequest, "請求參數錯誤: "+err.Error())
		return
	}

	// 查找會話
	var session models.ChunkSession
	if err := h.db.Where("id = ? AND user_id = ? AND status = ?", req.SessionID, userID, "active").First(&session).Error; err != nil {
		api.ErrorResponse(c, http.StatusNotFound, "上傳會話不存在或已過期")
		return
	}

	// 檢查所有分塊是否都已上傳
	var uploadedChunks []int
	if err := json.Unmarshal([]byte(session.UploadedChunks), &uploadedChunks); err != nil {
		api.ErrorResponse(c, http.StatusInternalServerError, "解析上傳進度失敗")
		return
	}

	if len(uploadedChunks) < session.TotalChunks {
		api.ErrorResponse(c, http.StatusBadRequest, fmt.Sprintf("分塊上傳未完成: %d/%d", len(uploadedChunks), session.TotalChunks))
		return
	}

	// 合併分塊檔案
	chunkDir := filepath.Join(h.cfg.Upload.UploadPath, "chunks", req.SessionID)
	
	// 建立最終檔案
	uploadDir := h.cfg.Upload.UploadPath
	uniqueFilename := uuid.New().String() + filepath.Ext(session.FileName)
	finalPath := filepath.Join(uploadDir, uniqueFilename)

	finalFile, err := os.Create(finalPath)
	if err != nil {
		api.ErrorResponse(c, http.StatusInternalServerError, "建立最終檔案失敗: "+err.Error())
		return
	}
	defer finalFile.Close()

	// 按順序合併分塊
	var totalSize int64
	for i := 0; i < session.TotalChunks; i++ {
		chunkPath := filepath.Join(chunkDir, fmt.Sprintf("chunk_%d", i))
		chunkData, err := os.ReadFile(chunkPath)
		if err != nil {
			os.Remove(finalPath) // 清理已建立的檔案
			api.ErrorResponse(c, http.StatusInternalServerError, fmt.Sprintf("讀取分塊 %d 失敗: %v", i, err))
			return
		}

		if _, err := finalFile.Write(chunkData); err != nil {
			os.Remove(finalPath) // 清理已建立的檔案
			api.ErrorResponse(c, http.StatusInternalServerError, fmt.Sprintf("寫入分塊 %d 失敗: %v", i, err))
			return
		}

		totalSize += int64(len(chunkData))
	}

	// 驗證檔案大小
	if totalSize != session.FileSize {
		os.Remove(finalPath) // 清理已建立的檔案
		api.ErrorResponse(c, http.StatusBadRequest, fmt.Sprintf("檔案大小不匹配: 期望 %d，實際 %d", session.FileSize, totalSize))
		return
	}

	// 重新計算檔案 hash 進行驗證
	finalFile.Seek(0, 0)
	hash := sha256.New()
	if _, err := io.Copy(hash, finalFile); err != nil {
		os.Remove(finalPath) // 清理已建立的檔案
		api.ErrorResponse(c, http.StatusInternalServerError, "計算檔案 hash 失敗: "+err.Error())
		return
	}

	actualHash := fmt.Sprintf("%x", hash.Sum(nil))
	if actualHash != session.FileHash {
		os.Remove(finalPath) // 清理已建立的檔案
		api.ErrorResponse(c, http.StatusBadRequest, "檔案 hash 驗證失敗")
		return
	}

	// 讀取檔案內容以取得 MIME type
	fileContent, err := os.ReadFile(finalPath)
	if err != nil {
		os.Remove(finalPath)
		api.ErrorResponse(c, http.StatusInternalServerError, "讀取檔案內容失敗: "+err.Error())
		return
	}

	// 建立檔案記錄
	fileRecord := models.File{
		Name:         session.FileName,
		OriginalName: session.FileName,
		FilePath:     finalPath,
		FileSize:     session.FileSize,
		MimeType:     http.DetectContentType(fileContent),
		SHA256Hash:   session.FileHash,
		VirtualPath:  h.buildVirtualPath(session.ParentID, session.FileName),
		ParentID:     session.ParentID,
		UploadedBy:   session.UserID,
		IsDirectory:  false,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := h.db.Create(&fileRecord).Error; err != nil {
		os.Remove(finalPath) // 清理已建立的檔案
		api.ErrorResponse(c, http.StatusInternalServerError, "建立檔案記錄失敗: "+err.Error())
		return
	}

	// 標記會話為已完成
	now := time.Now()
	if err := h.db.Model(&session).Updates(map[string]interface{}{
		"status": "completed",
		"completed_at": &now,
	}).Error; err != nil {
		// 這不是致命錯誤，記錄日誌即可
		fmt.Printf("更新會話狀態失敗: %v\n", err)
	}

	// 清理臨時分塊檔案
	go func() {
		time.Sleep(5 * time.Minute) // 延遲5分鐘清理，確保操作完成
		os.RemoveAll(chunkDir)
	}()

	api.SuccessResponse(c, gin.H{
		"file": fileRecord,
		"message": "檔案上傳完成",
	})
}

// GetChunkUploadStatus 取得分塊上傳狀態
func (h *FileHandler) GetChunkUploadStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		api.ErrorResponse(c, http.StatusUnauthorized, "未認證")
		return
	}

	sessionID := c.Param("sessionId")
	if sessionID == "" {
		api.ErrorResponse(c, http.StatusBadRequest, "缺少會話ID")
		return
	}

	// 查找會話
	var session models.ChunkSession
	if err := h.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		api.ErrorResponse(c, http.StatusNotFound, "上傳會話不存在")
		return
	}

	// 解析已上傳分塊
	var uploadedChunks []int
	if err := json.Unmarshal([]byte(session.UploadedChunks), &uploadedChunks); err != nil {
		uploadedChunks = []int{}
	}

	api.SuccessResponse(c, gin.H{
		"sessionId": session.ID,
		"fileName": session.FileName,
		"fileSize": session.FileSize,
		"totalChunks": session.TotalChunks,
		"uploadedChunks": uploadedChunks,
		"completed": len(uploadedChunks) >= session.TotalChunks,
		"progress": float64(len(uploadedChunks)) / float64(session.TotalChunks) * 100,
		"status": session.Status,
		"createdAt": session.CreatedAt,
		"expiresAt": session.ExpiresAt,
	})
}

// FileOperationRequest 檔案操作請求結構
type FileOperationRequest struct {
	FileIDs        []uint `json:"file_ids" binding:"required"`        // 要操作的檔案ID陣列
	TargetFolderID *uint  `json:"target_folder_id"`                   // 目標資料夾ID（null表示根目錄）
	OperationType  string `json:"operation_type" binding:"required"`  // "copy" 或 "move"
}

// FileOperationResponse 檔案操作回應結構
type FileOperationResponse struct {
	SuccessCount  int                  `json:"success_count"`  // 成功操作的檔案數量
	FailedCount   int                  `json:"failed_count"`   // 失敗操作的檔案數量
	SuccessFiles  []FileOperationResult `json:"success_files"`  // 成功操作的檔案列表
	FailedFiles   []FileOperationResult `json:"failed_files"`   // 失敗操作的檔案列表
	TotalCount    int                  `json:"total_count"`    // 總檔案數量
}

// FileOperationResult 單個檔案操作結果
type FileOperationResult struct {
	OriginalID   uint   `json:"original_id"`   // 原始檔案ID
	NewID        *uint  `json:"new_id"`        // 新檔案ID（僅複製時有值）
	FileName     string `json:"file_name"`     // 檔案名稱
	Error        string `json:"error"`         // 錯誤訊息（如果有）
	VirtualPath  string `json:"virtual_path"`  // 新的虛擬路徑
}

// CopyFiles 複製檔案
func (h *FileHandler) CopyFiles(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		api.ErrorResponse(c, http.StatusUnauthorized, "未認證")
		return
	}

	var req FileOperationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		api.ErrorResponse(c, http.StatusBadRequest, "請求參數錯誤: "+err.Error())
		return
	}

	// 驗證操作類型
	if req.OperationType != "copy" {
		api.ErrorResponse(c, http.StatusBadRequest, "操作類型必須為 'copy'")
		return
	}

	// 驗證目標資料夾（如果指定）
	if req.TargetFolderID != nil {
		var targetFolder models.File
		if err := h.db.Where("id = ? AND is_directory = ? AND is_deleted = ?", 
			*req.TargetFolderID, true, false).First(&targetFolder).Error; err != nil {
			api.ErrorResponse(c, http.StatusBadRequest, "目標資料夾不存在或無效")
			return
		}
	}

	// 開始事務
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	response := FileOperationResponse{
		SuccessFiles: []FileOperationResult{},
		FailedFiles:  []FileOperationResult{},
	}

	// 逐一處理每個檔案
	for _, fileID := range req.FileIDs {
		result := h.copyFileRecursive(fileID, req.TargetFolderID, userID.(uint), tx)
		
		if result.Error != "" {
			response.FailedFiles = append(response.FailedFiles, result)
			response.FailedCount++
		} else {
			response.SuccessFiles = append(response.SuccessFiles, result)
			response.SuccessCount++
		}
	}

	response.TotalCount = len(req.FileIDs)

	// 如果有任何成功操作，提交事務
	if response.SuccessCount > 0 {
		if err := tx.Commit().Error; err != nil {
			api.ErrorResponse(c, http.StatusInternalServerError, "提交事務失敗: "+err.Error())
			return
		}

		// 廣播檔案系統事件
		// 廣播檔案系統事件
		var targetFolderID *int
		if req.TargetFolderID != nil {
			val := int(*req.TargetFolderID)
			targetFolderID = &val
		}
		h.broadcastFileEvent("files_copied", targetFolderID,
			fmt.Sprintf("成功複製 %d 個檔案", response.SuccessCount), response)
	} else {
		tx.Rollback()
	}

	api.SuccessResponse(c, response)
}

// MoveFiles 移動檔案
func (h *FileHandler) MoveFiles(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		api.ErrorResponse(c, http.StatusUnauthorized, "未認證")
		return
	}

	var req FileOperationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		api.ErrorResponse(c, http.StatusBadRequest, "請求參數錯誤: "+err.Error())
		return
	}

	// 驗證操作類型
	if req.OperationType != "move" {
		api.ErrorResponse(c, http.StatusBadRequest, "操作類型必須為 'move'")
		return
	}

	// 驗證目標資料夾（如果指定）
	if req.TargetFolderID != nil {
		var targetFolder models.File
		if err := h.db.Where("id = ? AND is_directory = ? AND is_deleted = ?", 
			*req.TargetFolderID, true, false).First(&targetFolder).Error; err != nil {
			api.ErrorResponse(c, http.StatusBadRequest, "目標資料夾不存在或無效")
			return
		}
	}

	// 檢查循環依賴（防止將資料夾移動到自己的子目錄）
	if err := h.checkCircularDependency(req.FileIDs, req.TargetFolderID); err != nil {
		api.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// 開始事務
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	response := FileOperationResponse{
		SuccessFiles: []FileOperationResult{},
		FailedFiles:  []FileOperationResult{},
	}

	// 逐一處理每個檔案
	for _, fileID := range req.FileIDs {
		result := h.moveFileRecursive(fileID, req.TargetFolderID, userID.(uint), tx)
		
		if result.Error != "" {
			response.FailedFiles = append(response.FailedFiles, result)
			response.FailedCount++
		} else {
			response.SuccessFiles = append(response.SuccessFiles, result)
			response.SuccessCount++
		}
	}

	response.TotalCount = len(req.FileIDs)

	// 如果有任何成功操作，提交事務
	if response.SuccessCount > 0 {
		if err := tx.Commit().Error; err != nil {
			api.ErrorResponse(c, http.StatusInternalServerError, "提交事務失敗: "+err.Error())
			return
		}

		// 廣播檔案系統事件
		var targetFolderID *int
		if req.TargetFolderID != nil {
			val := int(*req.TargetFolderID)
			targetFolderID = &val
		}
		h.broadcastFileEvent("files_moved", targetFolderID,
			fmt.Sprintf("成功移動 %d 個檔案", response.SuccessCount), response)
	} else {
		tx.Rollback()
	}

	api.SuccessResponse(c, response)
}

// copyFileRecursive 遞迴複製檔案或資料夾
func (h *FileHandler) copyFileRecursive(fileID uint, targetFolderID *uint, userID uint, tx *gorm.DB) FileOperationResult {
	var file models.File
	if err := tx.Where("id = ? AND is_deleted = ?", fileID, false).First(&file).Error; err != nil {
		return FileOperationResult{
			OriginalID:  fileID,
			Error:       "檔案不存在或已刪除",
		}
	}

	// 檢查權限（只允許複製自己上傳的檔案，或管理員可複製所有檔案）
	// 這裡簡化為允許所有用戶複製，實際可根據需求調整
	
	// 處理名稱衝突
	newName := h.resolveNameConflict(file.Name, targetFolderID, tx)
	newVirtualPath := h.buildVirtualPath(targetFolderID, newName)

	var newFile models.File
	if file.IsDirectory {
		// 複製資料夾
		newFile = models.File{
			Name:         newName,
			OriginalName: file.OriginalName,
			FilePath:     "", // 資料夾沒有實體路徑
			VirtualPath:  newVirtualPath,
			SHA256Hash:   "",
			FileSize:     0,
			MimeType:     "application/x-directory",
			ParentID:     targetFolderID,
			CategoryID:   file.CategoryID,
			UploadedBy:   userID,
			IsDirectory:  true,
			Description:  file.Description,
			Tags:         file.Tags,
			ContentType:  file.ContentType,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := tx.Create(&newFile).Error; err != nil {
			return FileOperationResult{
				OriginalID: fileID,
				FileName:   file.Name,
				Error:      "建立資料夾複本失敗: " + err.Error(),
			}
		}

		// 遞迴複製子項目
		var children []models.File
		if err := tx.Where("parent_id = ? AND is_deleted = ?", fileID, false).Find(&children).Error; err != nil {
			return FileOperationResult{
				OriginalID: fileID,
				FileName:   file.Name,
				Error:      "查詢子項目失敗: " + err.Error(),
			}
		}

		for _, child := range children {
			h.copyFileRecursive(child.ID, &newFile.ID, userID, tx)
		}

	} else {
		// 複製檔案（利用去重機制，不需複製實體檔案）
		newFile = models.File{
			Name:          newName,
			OriginalName:  file.OriginalName,
			FilePath:      file.FilePath, // 相同檔案路徑（去重）
			VirtualPath:   newVirtualPath,
			SHA256Hash:    file.SHA256Hash,
			FileSize:      file.FileSize,
			MimeType:      file.MimeType,
			ThumbnailURL:  file.ThumbnailURL,
			ParentID:      targetFolderID,
			CategoryID:    file.CategoryID,
			UploadedBy:    userID,
			IsDirectory:   false,
			Description:   file.Description,
			Tags:          file.Tags,
			ContentType:   file.ContentType,
			Speaker:       file.Speaker,
			SermonTitle:   file.SermonTitle,
			BibleReference: file.BibleReference,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		if err := tx.Create(&newFile).Error; err != nil {
			return FileOperationResult{
				OriginalID: fileID,
				FileName:   file.Name,
				Error:      "建立檔案複本失敗: " + err.Error(),
			}
		}
	}

	return FileOperationResult{
		OriginalID:  fileID,
		NewID:       &newFile.ID,
		FileName:    file.Name,
		VirtualPath: newVirtualPath,
	}
}

// moveFileRecursive 遞迴移動檔案或資料夾
func (h *FileHandler) moveFileRecursive(fileID uint, targetFolderID *uint, userID uint, tx *gorm.DB) FileOperationResult {
	var file models.File
	if err := tx.Where("id = ? AND is_deleted = ?", fileID, false).First(&file).Error; err != nil {
		return FileOperationResult{
			OriginalID: fileID,
			Error:      "檔案不存在或已刪除",
		}
	}

	// 檢查權限（只允許移動自己上傳的檔案，或管理員可移動所有檔案）
	if file.UploadedBy != userID {
		// 這裡可以添加管理員權限檢查
		return FileOperationResult{
			OriginalID: fileID,
			FileName:   file.Name,
			Error:      "沒有權限移動此檔案",
		}
	}

	// 如果移動到相同位置，跳過
	if (file.ParentID == nil && targetFolderID == nil) ||
		(file.ParentID != nil && targetFolderID != nil && *file.ParentID == *targetFolderID) {
		return FileOperationResult{
			OriginalID:  fileID,
			FileName:    file.Name,
			VirtualPath: file.VirtualPath,
		}
	}

	// 處理名稱衝突
	newName := h.resolveNameConflict(file.Name, targetFolderID, tx)
	newVirtualPath := h.buildVirtualPath(targetFolderID, newName)

	// 更新檔案資訊
	updates := map[string]interface{}{
		"name":         newName,
		"parent_id":    targetFolderID,
		"virtual_path": newVirtualPath,
		"updated_at":   time.Now(),
	}

	if err := tx.Model(&file).Updates(updates).Error; err != nil {
		return FileOperationResult{
			OriginalID: fileID,
			FileName:   file.Name,
			Error:      "更新檔案資訊失敗: " + err.Error(),
		}
	}

	// 如果是資料夾，需要遞迴更新所有子項目的虛擬路徑
	if file.IsDirectory {
		if err := h.updateChildrenVirtualPaths(fileID, newVirtualPath, tx); err != nil {
			return FileOperationResult{
				OriginalID: fileID,
				FileName:   file.Name,
				Error:      "更新子項目路徑失敗: " + err.Error(),
			}
		}
	}

	return FileOperationResult{
		OriginalID:  fileID,
		FileName:    file.Name,
		VirtualPath: newVirtualPath,
	}
}

// resolveNameConflict 解決名稱衝突
func (h *FileHandler) resolveNameConflict(originalName string, parentID *uint, tx *gorm.DB) string {
	// 檢查是否有重複名稱
	var count int64
	query := tx.Model(&models.File{}).Where("name = ? AND parent_id = ? AND is_deleted = ?", 
		originalName, parentID, false)
	
	if err := query.Count(&count); err != nil {
		// 如果查詢失敗，返回原名稱
		return originalName
	}

	if count == 0 {
		return originalName
	}

	// 生成新名稱
	ext := filepath.Ext(originalName)
	baseName := strings.TrimSuffix(originalName, ext)
	
	for i := 1; i <= 1000; i++ { // 最多嘗試1000次
		newName := fmt.Sprintf("%s (%d)%s", baseName, i, ext)
		
		var newCount int64
		if err := tx.Model(&models.File{}).Where("name = ? AND parent_id = ? AND is_deleted = ?", 
			newName, parentID, false).Count(&newCount); err != nil {
			continue
		}
		
		if newCount == 0 {
			return newName
		}
	}

	// 如果仍然衝突，使用時間戳
	timestamp := time.Now().Format("20060102_150405")
	return fmt.Sprintf("%s_%s%s", baseName, timestamp, ext)
}

// updateChildrenVirtualPaths 遞迴更新子項目的虛擬路徑
func (h *FileHandler) updateChildrenVirtualPaths(folderID uint, newParentPath string, tx *gorm.DB) error {
	var children []models.File
	if err := tx.Where("parent_id = ? AND is_deleted = ?", folderID, false).Find(&children).Error; err != nil {
		return err
	}

	for _, child := range children {
		newChildPath := newParentPath + "/" + child.Name
		
		updates := map[string]interface{}{
			"virtual_path": newChildPath,
			"updated_at":   time.Now(),
		}
		
		if err := tx.Model(&child).Updates(updates).Error; err != nil {
			return err
		}

		// 如果是資料夾，遞迴更新
		if child.IsDirectory {
			if err := h.updateChildrenVirtualPaths(child.ID, newChildPath, tx); err != nil {
				return err
			}
		}
	}

	return nil
}

// checkCircularDependency 檢查循環依賴
func (h *FileHandler) checkCircularDependency(fileIDs []uint, targetFolderID *uint) error {
	if targetFolderID == nil {
		return nil // 移動到根目錄，沒有循環依賴問題
	}

	// 檢查是否嘗試將資料夾移動到自己或子目錄中
	for _, fileID := range fileIDs {
		var file models.File
		if err := h.db.Where("id = ? AND is_directory = ? AND is_deleted = ?", 
			fileID, true, false).First(&file).Error; err == nil {
			// 這是一個資料夾，檢查目標是否在其子目錄中
			if h.isDescendant(*targetFolderID, fileID) {
				return fmt.Errorf("不能將資料夾移動到自己的子目錄中")
			}
		}
	}

	return nil
}

// isDescendant 檢查 targetID 是否是 ancestorID 的後代
func (h *FileHandler) isDescendant(targetID, ancestorID uint) bool {
	if targetID == ancestorID {
		return true
	}

	var target models.File
	if err := h.db.Where("id = ?", targetID).First(&target).Error; err != nil {
		return false
	}

	if target.ParentID == nil {
		return false
	}

	return h.isDescendant(*target.ParentID, ancestorID)
}
