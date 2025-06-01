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
	router.Use(middleware.CORSMiddleware())
	router.Use(middleware.LoggerMiddleware())
	
	// 初始化處理器
	authHandler := handlers.NewAuthHandler(db, cfg)
	fileHandler := handlers.NewFileHandler(db, cfg)
	userHandler := handlers.NewUserHandler(db, cfg)
	adminHandler := handlers.NewAdminHandler(db, cfg)
	
	// API 版本分組
	v1 := router.Group("/api/v1")
	
	// 公開路由
	public := v1.Group("/")
	{
		public.GET("/health", handlers.HealthCheck)
		public.POST("/auth/register", authHandler.Register)
		public.POST("/auth/login", authHandler.Login)
		public.POST("/auth/refresh", authHandler.RefreshToken)
	}
	
	// 需要認證的路由
	protected := v1.Group("/")
	protected.Use(middleware.AuthMiddleware(cfg))
	{
		// 用戶相關
		protected.GET("/user/profile", userHandler.GetProfile)
		protected.PUT("/user/profile", userHandler.UpdateProfile)
		protected.POST("/auth/logout", authHandler.Logout)
		
		// 文件相關
		protected.POST("/files/upload", fileHandler.UploadFile)
		protected.GET("/files", fileHandler.GetFiles)
		protected.GET("/files/:id", fileHandler.GetFile)
		protected.DELETE("/files/:id", fileHandler.DeleteFile)
		protected.GET("/files/:id/download", fileHandler.DownloadFile)
	}
	
	// 管理員路由
	admin := v1.Group("/admin")
	admin.Use(middleware.AuthMiddleware(cfg))
	admin.Use(middleware.AdminMiddleware())
	{
		// 用戶管理
		admin.GET("/users", userHandler.GetAllUsers)
		admin.GET("/users/:id", adminHandler.GetUser)
		admin.PUT("/users/:id", adminHandler.UpdateUser)
		admin.DELETE("/users/:id", adminHandler.DeleteUser)
		
		// 註冊申請管理
		admin.GET("/registration-requests", adminHandler.ListRegistrationRequests)
		admin.PUT("/registration-requests/:id/approve", adminHandler.ApproveRegistration)
		admin.PUT("/registration-requests/:id/reject", adminHandler.RejectRegistration)
		
		// 文件管理
		admin.GET("/files", adminHandler.ListAllFiles)
		admin.DELETE("/files/:id", adminHandler.DeleteFile)
		
		// 系統統計
		admin.GET("/stats", adminHandler.GetSystemStats)
		admin.GET("/logs", adminHandler.GetActivityLogs)
	}
	
	// 靜態文件服務
	router.Static("/uploads", cfg.Upload.UploadPath)
	
	return router
}
