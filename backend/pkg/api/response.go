package api

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

// StandardResponse 統一的 API 響應格式
type StandardResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorInfo  `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
	Meta    *MetaInfo   `json:"meta,omitempty"`
}

// ErrorInfo 錯誤信息結構
type ErrorInfo struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// MetaInfo 元數據信息（用於分頁等）
type MetaInfo struct {
	Pagination *PaginationInfo `json:"pagination,omitempty"`
	Timestamp  int64          `json:"timestamp,omitempty"`
}

// PaginationInfo 分頁信息
type PaginationInfo struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"totalPages"`
}

// Response 輔助函數 - 發送成功響應
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    data,
	})
}

// SuccessWithMessage 發送帶消息的成功響應
func SuccessWithMessage(c *gin.Context, data interface{}, message string) {
	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    data,
		Message: message,
	})
}

// SuccessWithPagination 發送帶分頁的成功響應
func SuccessWithPagination(c *gin.Context, data interface{}, page, limit int, total int64) {
	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    data,
		Meta: &MetaInfo{
			Pagination: &PaginationInfo{
				Page:       page,
				Limit:      limit,
				Total:      total,
				TotalPages: totalPages,
			},
		},
	})
}

// Error 發送錯誤響應
func Error(c *gin.Context, statusCode int, code string, message string) {
	c.JSON(statusCode, StandardResponse{
		Success: false,
		Error: &ErrorInfo{
			Code:    code,
			Message: message,
		},
	})
}

// ErrorWithDetails 發送帶詳情的錯誤響應
func ErrorWithDetails(c *gin.Context, statusCode int, code string, message string, details string) {
	c.JSON(statusCode, StandardResponse{
		Success: false,
		Error: &ErrorInfo{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

// 預定義的錯誤代碼常量
const (
	// 認證相關
	ErrUnauthorized         = "UNAUTHORIZED"
	ErrInvalidCredentials   = "INVALID_CREDENTIALS"
	ErrTokenExpired         = "TOKEN_EXPIRED"
	ErrInvalidToken         = "INVALID_TOKEN"
	
	// 用戶相關
	ErrUserNotFound         = "USER_NOT_FOUND"
	ErrUserNotRegistered    = "USER_NOT_REGISTERED"
	ErrUserNotApproved      = "USER_NOT_APPROVED"
	ErrUserSuspended        = "USER_SUSPENDED"
	ErrInvalidUserID        = "INVALID_USER_ID"
	
	// 檔案相關
	ErrFileNotFound         = "FILE_NOT_FOUND"
	ErrFileUploadFailed     = "FILE_UPLOAD_FAILED"
	ErrInvalidFileType      = "INVALID_FILE_TYPE"
	ErrFileSizeExceeded     = "FILE_SIZE_EXCEEDED"
	ErrStorageQuotaExceeded = "STORAGE_QUOTA_EXCEEDED"
	
	// 權限相關
	ErrInsufficientPermissions = "INSUFFICIENT_PERMISSIONS"
	ErrAccessDenied            = "ACCESS_DENIED"
	
	// 驗證相關
	ErrValidationFailed     = "VALIDATION_FAILED"
	ErrInvalidRequest       = "INVALID_REQUEST"
	ErrMissingParameter     = "MISSING_PARAMETER"
	
	// 系統相關
	ErrInternalServer       = "INTERNAL_SERVER_ERROR"
	ErrDatabaseError        = "DATABASE_ERROR"
	ErrServiceUnavailable   = "SERVICE_UNAVAILABLE"
)

// 常用的錯誤響應輔助函數
func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, ErrUnauthorized, message)
}

func NotFound(c *gin.Context, resource string) {
	Error(c, http.StatusNotFound, ErrFileNotFound, resource + "不存在")
}

func BadRequest(c *gin.Context, message string) {
	Error(c, http.StatusBadRequest, ErrInvalidRequest, message)
}

func InternalServerError(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, ErrInternalServer, message)
}

func Forbidden(c *gin.Context, message string) {
	Error(c, http.StatusForbidden, ErrAccessDenied, message)
}