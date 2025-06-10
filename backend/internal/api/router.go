package api

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	
	"memoryark/internal/config"
	"memoryark/internal/middleware"
	"memoryark/internal/api/handlers"
)

// SetupRouter 設置路由
func SetupRouter(db *gorm.DB, cfg *config.Config) *gin.Engine {
	// 設置 Gin 模式
	gin.SetMode(cfg.Server.Mode)
	
	router := gin.New()
	
	// 基礎中間件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.CORSMiddleware(cfg))
	router.Use(middleware.LoggerMiddleware())
	
	// 初始化處理器
	authHandler := handlers.NewAuthHandler(db, cfg)
	fileHandler := handlers.NewFileHandler(db, cfg)
	categoryHandler := handlers.NewCategoryHandler(db, cfg)
	exportHandler := handlers.NewExportHandler(db, cfg)
	// userHandler := handlers.NewUserHandler(db, cfg)
	adminHandler := handlers.NewAdminHandler(db, cfg)
	
	// API 版本分組
	v1 := router.Group("/api")
	
	// 公開路由 - 根據規格書定義
	public := v1.Group("/")
	{
		public.GET("/health", handlers.HealthCheck)
		public.GET("/auth/status", authHandler.GetAuthStatus)
		public.POST("/auth/register", authHandler.Register)
	}
	
	// 需要認證的路由
	protected := v1.Group("/")
	protected.Use(middleware.CloudflareAccessMiddleware(cfg, db))
	{
		// 認證相關
		protected.GET("/auth/me", authHandler.GetCurrentUser)
		
		// 檔案管理 - 根據規格書 API 設計
		protected.GET("/files", fileHandler.GetFiles)
		protected.GET("/files/:id", fileHandler.GetFileDetails)
		protected.POST("/files/upload", fileHandler.UploadFile)
		protected.PUT("/files/:id", fileHandler.UpdateFile)
		protected.DELETE("/files/:id", fileHandler.DeleteFile)
		protected.POST("/files/:id/restore", fileHandler.RestoreFile)
		protected.DELETE("/files/:id/permanent", fileHandler.PermanentDeleteFile)
		protected.GET("/files/:id/download", fileHandler.DownloadFile)
		protected.POST("/files/:id/share", fileHandler.CreateShareLink)
		
		// 儲存空間統計
		protected.GET("/storage/stats", fileHandler.GetStorageStats)
		
		// 資料夾管理
		protected.POST("/folders", fileHandler.CreateFolder)
		protected.PUT("/folders/:id/move", fileHandler.MoveFile)
		protected.PUT("/folders/:id/rename", fileHandler.RenameFile)
		
		// 分類管理
		protected.GET("/categories", categoryHandler.GetCategories)
		protected.GET("/categories/:id", categoryHandler.GetCategory)
		protected.POST("/categories", categoryHandler.CreateCategory)
		protected.PUT("/categories/:id", categoryHandler.UpdateCategory)
		protected.DELETE("/categories/:id", categoryHandler.DeleteCategory)
		protected.GET("/categories/:id/files", categoryHandler.GetCategoryFiles)
		
		// 匯出功能
		protected.POST("/export/stream", exportHandler.StreamExport)
		protected.GET("/export/quick", exportHandler.QuickStreamExport)
		protected.GET("/export/status/:jobId", exportHandler.GetExportStatus)
		protected.GET("/export/download/:jobId", exportHandler.DownloadExport)
		protected.GET("/export/history", exportHandler.GetUserExports)
	}
	
	// 管理員路由 - 根據規格書定義
	admin := v1.Group("/admin")
	admin.Use(middleware.CloudflareAccessMiddleware(cfg, db))
	admin.Use(middleware.RequireRole("admin"))
	{
		// 用戶管理
		admin.GET("/users", adminHandler.GetUsers)
		admin.PUT("/users/:id/role", adminHandler.UpdateUserRole)
		admin.PUT("/users/:id/status", adminHandler.UpdateUserStatus)
		
		// 註冊申請管理
		admin.GET("/registrations", adminHandler.GetRegistrations)
		admin.PUT("/registrations/:id/approve", adminHandler.ApproveRegistration)
		admin.PUT("/registrations/:id/reject", adminHandler.RejectRegistration)
		
		// 系統管理
		admin.GET("/stats", adminHandler.GetSystemStats)
		admin.GET("/logs", adminHandler.GetActivityLogs)
		
		// 檔案管理
		admin.GET("/files", adminHandler.GetAllFiles)
		admin.DELETE("/files/:id", adminHandler.DeleteFile)
		admin.GET("/files/:id/download", adminHandler.DownloadFile)
	}
	
	// 靜態文件服務
	router.Static("/uploads", cfg.Upload.UploadPath)
	
	return router
}
