package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"memoryark/internal/config"
	"memoryark/internal/models"
)

// CategoryHandler 分類處理器
type CategoryHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewCategoryHandler 建立分類處理器
func NewCategoryHandler(db *gorm.DB, cfg *config.Config) *CategoryHandler {
	return &CategoryHandler{
		db:  db,
		cfg: cfg,
	}
}

// CategoryCreateRequest 建立分類請求
type CategoryCreateRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=255"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
	SortOrder   int    `json:"sort_order"`
}

// CategoryUpdateRequest 更新分類請求
type CategoryUpdateRequest struct {
	Name        string `json:"name" binding:"min=1,max=255"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
	SortOrder   int    `json:"sort_order"`
	IsActive    *bool  `json:"is_active"`
}

// GetCategories 獲取分類列表
func (h *CategoryHandler) GetCategories(c *gin.Context) {
	_, exists := c.Get("user_id")
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

	// 查詢參數
	showInactive := c.DefaultQuery("show_inactive", "false")

	var categories []models.Category
	query := h.db.Model(&models.Category{}).Order("sort_order ASC, name ASC")

	// 篩選條件
	if showInactive != "true" {
		query = query.Where("is_active = ?", true)
	}

	// 預載入關聯和檔案計數
	if err := query.Preload("Creator").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查詢分類失敗",
			},
		})
		return
	}

	// 計算每個分類的檔案數量
	for i := range categories {
		var fileCount int64
		h.db.Model(&models.File{}).
			Where("category_id = ? AND is_deleted = ?", categories[i].ID, false).
			Count(&fileCount)
		
		// 將檔案數量添加到回應中（透過臨時欄位）
		categories[i].Files = make([]models.File, int(fileCount))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"categories": categories,
			"total":      len(categories),
		},
	})
}

// GetCategory 獲取單一分類詳情
func (h *CategoryHandler) GetCategory(c *gin.Context) {
	_, exists := c.Get("user_id")
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

	categoryIDParam := c.Param("id")
	categoryID, err := strconv.ParseUint(categoryIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_CATEGORY_ID",
				"message": "無效的分類ID",
			},
		})
		return
	}

	var category models.Category
	if err := h.db.Preload("Creator").First(&category, uint(categoryID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "CATEGORY_NOT_FOUND",
					"message": "分類不存在",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查詢分類失敗",
			},
		})
		return
	}

	// 計算分類下的檔案數量
	var fileCount int64
	h.db.Model(&models.File{}).
		Where("category_id = ? AND is_deleted = ?", category.ID, false).
		Count(&fileCount)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"category":   category,
			"file_count": fileCount,
		},
	})
}

// CreateCategory 建立分類
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
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

	var req CategoryCreateRequest
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

	// 檢查分類名稱是否已存在
	var existingCategory models.Category
	if err := h.db.Where("name = ?", req.Name).First(&existingCategory).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CATEGORY_EXISTS",
				"message": "分類名稱已存在",
			},
		})
		return
	}

	// 建立分類
	category := models.Category{
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		Icon:        req.Icon,
		SortOrder:   req.SortOrder,
		IsActive:    true,
		CreatedBy:   userID,
	}

	if err := h.db.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CREATE_FAILED",
				"message": "建立分類失敗",
			},
		})
		return
	}

	// 預載入創建者資訊
	h.db.Preload("Creator").First(&category, category.ID)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"category": category,
		},
		"message": "分類建立成功",
	})
}

// UpdateCategory 更新分類
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
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

	categoryIDParam := c.Param("id")
	categoryID, err := strconv.ParseUint(categoryIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_CATEGORY_ID",
				"message": "無效的分類ID",
			},
		})
		return
	}

	var req CategoryUpdateRequest
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

	// 查詢分類
	var category models.Category
	if err := h.db.First(&category, uint(categoryID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "CATEGORY_NOT_FOUND",
					"message": "分類不存在",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查詢分類失敗",
			},
		})
		return
	}

	// 權限檢查：只有創建者或管理員可以修改
	user := c.MustGet("user").(models.User)
	if category.CreatedBy != userID && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PERMISSION_DENIED",
				"message": "無權限修改此分類",
			},
		})
		return
	}

	// 更新分類
	updateData := gin.H{}
	if req.Name != "" {
		// 檢查新名稱是否與現有分類衝突
		var existingCategory models.Category
		if err := h.db.Where("name = ? AND id != ?", req.Name, categoryID).First(&existingCategory).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "CATEGORY_EXISTS",
					"message": "分類名稱已存在",
				},
			})
			return
		}
		updateData["name"] = req.Name
	}
	if req.Description != "" {
		updateData["description"] = req.Description
	}
	if req.Color != "" {
		updateData["color"] = req.Color
	}
	if req.Icon != "" {
		updateData["icon"] = req.Icon
	}
	if req.SortOrder != 0 {
		updateData["sort_order"] = req.SortOrder
	}
	if req.IsActive != nil {
		updateData["is_active"] = *req.IsActive
	}

	if err := h.db.Model(&category).Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UPDATE_FAILED",
				"message": "更新分類失敗",
			},
		})
		return
	}

	// 重新查詢更新後的分類
	h.db.Preload("Creator").First(&category, category.ID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"category": category,
		},
		"message": "分類更新成功",
	})
}

// DeleteCategory 刪除分類
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
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

	categoryIDParam := c.Param("id")
	categoryID, err := strconv.ParseUint(categoryIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_CATEGORY_ID",
				"message": "無效的分類ID",
			},
		})
		return
	}

	// 查詢分類
	var category models.Category
	if err := h.db.First(&category, uint(categoryID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "CATEGORY_NOT_FOUND",
					"message": "分類不存在",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查詢分類失敗",
			},
		})
		return
	}

	// 權限檢查：只有創建者或管理員可以刪除
	user := c.MustGet("user").(models.User)
	if category.CreatedBy != userID && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PERMISSION_DENIED",
				"message": "無權限刪除此分類",
			},
		})
		return
	}

	// 檢查分類下是否還有檔案
	var fileCount int64
	h.db.Model(&models.File{}).
		Where("category_id = ? AND is_deleted = ?", category.ID, false).
		Count(&fileCount)

	if fileCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CATEGORY_IN_USE",
				"message": "分類下還有檔案，無法刪除",
				"details": gin.H{
					"file_count": fileCount,
				},
			},
		})
		return
	}

	// 刪除分類
	if err := h.db.Delete(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DELETE_FAILED",
				"message": "刪除分類失敗",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "分類刪除成功",
	})
}

// GetCategoryFiles 獲取分類下的檔案
func (h *CategoryHandler) GetCategoryFiles(c *gin.Context) {
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

	categoryIDParam := c.Param("id")
	categoryID, err := strconv.ParseUint(categoryIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_CATEGORY_ID",
				"message": "無效的分類ID",
			},
		})
		return
	}

	// 查詢參數
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	// 查詢分類下的檔案
	var files []models.File
	var total int64

	query := h.db.Model(&models.File{}).
		Where("category_id = ? AND uploaded_by = ? AND is_deleted = ?", uint(categoryID), userID, false)

	// 計算總數
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查詢檔案總數失敗",
			},
		})
		return
	}

	// 查詢檔案
	if err := query.
		Preload("Uploader").
		Preload("Category").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": "查詢檔案失敗",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"files":       files,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}