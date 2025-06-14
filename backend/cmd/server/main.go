package main

import (
	"log"
	"memoryark/internal/config"
	"memoryark/internal/database"
	"memoryark/internal/api"
	"memoryark/pkg/logger"
)

func main() {
	// 初始化日誌
	logger.Init()
	
	// 載入配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}
	
	// 初始化數據庫
	db, err := database.Initialize(cfg.Database.Path)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	
	// 初始化根管理員
	if err := database.InitializeRootAdmin(db, cfg); err != nil {
		log.Printf("Warning: Failed to initialize root admin: %v", err)
	}
	
	// 啟動 API 服務器
	router := api.SetupRouter(db, cfg)
	
	log.Printf("MemoryArk server starting on port %s", cfg.Server.Port)
	if err := router.Run(":" + cfg.Server.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
