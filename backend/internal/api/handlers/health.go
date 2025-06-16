package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// HealthCheck 健康檢查端點
func HealthCheck(c *gin.Context) {
	// 對於 HEAD 請求，只返回狀態碼和標頭
	if c.Request.Method == "HEAD" {
		c.Status(http.StatusOK)
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "MemoryArk API",
		"version":   "2.0.0",
	})
}
