package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	
	"gorm.io/gorm"
	"github.com/glebarez/sqlite"
	_ "github.com/mattn/go-sqlite3"
	"memoryark/internal/models"
)

// Initialize 初始化數據庫
func Initialize(dbPath string) (*gorm.DB, error) {
	// 確保數據庫目錄存在
	dbDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, err
	}
	
	// 在 GORM 初始化前處理 SQLite 相容性問題
	log.Println("Pre-GORM compatibility check...")
	if err := preMigrationCheck(dbPath); err != nil {
		log.Printf("Warning: Pre-migration check failed: %v", err)
	}
	
	// 連接數據庫
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	
	// 處理向前相容性問題
	log.Println("Starting legacy migration check...")
	if err := handleLegacyMigrations(db); err != nil {
		log.Printf("Warning: Legacy migration handling failed: %v", err)
	}
	log.Println("Legacy migration check completed")
	
	// 自動遷移
	if err := autoMigrate(db); err != nil {
		return nil, err
	}
	
	// 創建默認管理員用戶
	if err := createDefaultAdmin(db); err != nil {
		log.Printf("Warning: Failed to create default admin: %v", err)
	}
	
	log.Println("Database initialized successfully")
	return db, nil
}

// autoMigrate 自動遷移數據庫表
func autoMigrate(db *gorm.DB) error {
	
	// 統一使用 GORM AutoMigrate 處理所有模型
	if err := db.AutoMigrate(
		&models.User{},
		&models.UserRegistrationRequest{},
		&models.File{},
		&models.Category{},
		&models.ExportJob{},
		&models.FileShare{},
		&models.ActivityLog{},
		&models.ChunkSession{},
		// LINE 功能相關模型
		&models.LineUploadRecord{},
		&models.LineUser{},
		&models.LineGroup{},
		&models.LineGroupMember{},
		&models.LineWebhookLog{},
		&models.LineSetting{},
		&models.LineUploadStat{},
	); err != nil {
		return err
	}

	// 為現有檔案填充虛擬路徑
	if err := PopulateVirtualPaths(db); err != nil {
		log.Printf("Warning: Failed to populate virtual paths: %v", err)
	}

	// 初始化 LINE 設定
	if err := initializeLineSettings(db); err != nil {
		log.Printf("Warning: Failed to initialize LINE settings: %v", err)
	}

	return nil
}

// createDefaultAdmin 創建默認管理員用戶
func createDefaultAdmin(db *gorm.DB) error {
	var count int64
	db.Model(&models.User{}).Where("role = ?", "admin").Count(&count)
	
	// 如果已有管理員，則跳過
	if count > 0 {
		return nil
	}
	
	// 從環境變數讀取管理員資訊
	adminEmail := os.Getenv("ROOT_ADMIN_EMAIL")
	adminName := os.Getenv("ROOT_ADMIN_NAME")
	
	// 如果沒有設定管理員信箱，跳過建立預設管理員
	if adminEmail == "" {
		log.Printf("Warning: ROOT_ADMIN_EMAIL not set, no default admin will be created")
		log.Printf("Hint: Set ROOT_ADMIN_EMAIL in .env file to create an admin user")
		return nil
	}
	
	// 設定預設名稱（如果沒有提供）
	if adminName == "" {
		adminName = "系統管理員"
	}
	
	log.Printf("Creating default admin user: %s", adminEmail)
	admin := models.User{
		Email:  adminEmail,
		Name:   adminName,
		Role:   "admin",
		Status: "approved",
	}
	
	return db.Create(&admin).Error
}

// GetDB 獲取數據庫實例的輔助函數
var dbInstance *gorm.DB

func SetDB(db *gorm.DB) {
	dbInstance = db
}

func GetDB() *gorm.DB {
	return dbInstance
}

// initializeLineSettings 初始化 LINE 預設設定
func initializeLineSettings(db *gorm.DB) error {
	// 檢查是否已有設定
	var count int64
	db.Model(&models.LineSetting{}).Count(&count)
	
	if count > 0 {
		return nil // 已有設定，跳過初始化
	}
	
	log.Println("Initializing LINE default settings...")
	
	defaultSettings := []models.LineSetting{
		{SettingKey: "auto_download_enabled", SettingValue: stringPtr("true"), SettingType: "boolean", Description: stringPtr("是否自動下載 LINE 上傳的照片")},
		{SettingKey: "download_timeout", SettingValue: stringPtr("30"), SettingType: "integer", Description: stringPtr("下載逾時時間（秒）")},
		{SettingKey: "max_retry_count", SettingValue: stringPtr("3"), SettingType: "integer", Description: stringPtr("下載失敗最大重試次數")},
		{SettingKey: "allowed_file_types", SettingValue: stringPtr("image/jpeg,image/png,image/gif,image/webp"), SettingType: "string", Description: stringPtr("允許的檔案類型")},
		{SettingKey: "max_file_size", SettingValue: stringPtr("52428800"), SettingType: "integer", Description: stringPtr("最大檔案大小（bytes）- 預設 50MB")},
		{SettingKey: "webhook_verification_enabled", SettingValue: stringPtr("true"), SettingType: "boolean", Description: stringPtr("是否啟用 Webhook 簽名驗證")},
		{SettingKey: "rate_limit_per_minute", SettingValue: stringPtr("100"), SettingType: "integer", Description: stringPtr("每分鐘 API 請求限制")},
		{SettingKey: "stat_aggregation_enabled", SettingValue: stringPtr("true"), SettingType: "boolean", Description: stringPtr("是否啟用統計數據聚合")},
		{SettingKey: "stat_retention_days", SettingValue: stringPtr("365"), SettingType: "integer", Description: stringPtr("統計數據保留天數")},
	}
	
	for _, setting := range defaultSettings {
		if err := db.Create(&setting).Error; err != nil {
			return err
		}
	}
	
	log.Println("LINE default settings initialized successfully")
	return nil
}

// handleLegacyMigrations 處理舊版資料庫相容性問題
func handleLegacyMigrations(db *gorm.DB) error {
	// 檢查是否存在舊版的 migration_history 表
	if db.Migrator().HasTable("migration_history") {
		log.Println("Found legacy migration_history table, handling compatibility...")
		
		// 記錄已執行的舊版遷移
		var migrations []struct {
			ID          int    `gorm:"column:id"`
			Version     string `gorm:"column:version"`
			Description string `gorm:"column:description"`
		}
		
		if err := db.Table("migration_history").Find(&migrations).Error; err != nil {
			log.Printf("Warning: Could not read migration_history: %v", err)
		} else {
			log.Printf("Found %d legacy migrations in history", len(migrations))
		}
		
		// 檢查並處理可能的表結構問題
		if err := handleTableStructureIssues(db); err != nil {
			return err
		}
		
		// 可選：重命名舊表以保留歷史記錄
		if err := db.Migrator().RenameTable("migration_history", "migration_history_legacy"); err != nil {
			log.Printf("Warning: Could not rename migration_history table: %v", err)
		}
	}
	
	return nil
}

// handleTableStructureIssues 處理表結構相容性問題
func handleTableStructureIssues(db *gorm.DB) error {
	// 檢查是否有臨時表存在（可能是失敗的遷移留下的）
	var tempTables []string
	
	// 查詢所有以 _temp 結尾的表
	rows, err := db.Raw("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_temp%'").Rows()
	if err != nil {
		return err
	}
	defer rows.Close()
	
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			continue
		}
		tempTables = append(tempTables, tableName)
	}
	
	// 清理臨時表
	for _, tempTable := range tempTables {
		log.Printf("Cleaning up temporary table: %s", tempTable)
		if err := db.Migrator().DropTable(tempTable); err != nil {
			log.Printf("Warning: Could not drop temporary table %s: %v", tempTable, err)
		}
	}
	
	// 特別處理 LINE 相關表的結構問題
	if err := handleLineTablesCompatibility(db); err != nil {
		return err
	}
	
	// 檢查並修復可能的索引問題
	if err := handleIndexIssues(db); err != nil {
		return err
	}
	
	return nil
}

// handleLineTablesCompatibility 特別處理 LINE 表的相容性問題
func handleLineTablesCompatibility(db *gorm.DB) error {
	// 檢查 line_group_members 表是否存在結構問題
	if db.Migrator().HasTable("line_group_members") {
		// 檢查表結構
		var columns []struct {
			Name string `gorm:"column:name"`
		}
		
		if err := db.Raw("PRAGMA table_info(line_group_members)").Scan(&columns).Error; err != nil {
			log.Printf("Warning: Could not check line_group_members table structure: %v", err)
			return nil
		}
		
		// 檢查是否有問題的列
		hasUniqueColumn := false
		for _, col := range columns {
			if col.Name == "UNIQUE" {
				hasUniqueColumn = true
				break
			}
		}
		
		// 如果存在 UNIQUE 列或其他結構問題，重建表
		if hasUniqueColumn {
			log.Println("Detected problematic line_group_members table structure, rebuilding...")
			if err := rebuildLineGroupMembersTable(db); err != nil {
				return err
			}
		}
	}
	
	return nil
}

// rebuildLineGroupMembersTable 重建 line_group_members 表
func rebuildLineGroupMembersTable(db *gorm.DB) error {
	// 備份現有數據
	log.Println("Backing up line_group_members data...")
	
	// 創建備份表
	if err := db.Exec("CREATE TABLE line_group_members_backup AS SELECT * FROM line_group_members").Error; err != nil {
		log.Printf("Warning: Could not backup line_group_members: %v", err)
	}
	
	// 刪除原表
	if err := db.Migrator().DropTable("line_group_members"); err != nil {
		return err
	}
	
	// 讓 GORM 重新創建表
	if err := db.Migrator().CreateTable(&models.LineGroupMember{}); err != nil {
		return err
	}
	
	// 嘗試恢復數據
	log.Println("Restoring line_group_members data...")
	
	// 查詢備份表的結構
	var backupColumns []struct {
		Name string `gorm:"column:name"`
	}
	
	if err := db.Raw("PRAGMA table_info(line_group_members_backup)").Scan(&backupColumns).Error; err == nil {
		// 構建恢復數據的 SQL，只選擇存在的列
		var validColumns []string
		expectedColumns := []string{"id", "line_group_id", "line_user_id", "role", "join_date", "leave_date", "is_active", "upload_count", "last_upload_at", "created_at", "updated_at"}
		
		for _, expected := range expectedColumns {
			for _, backup := range backupColumns {
				if backup.Name == expected {
					validColumns = append(validColumns, expected)
					break
				}
			}
		}
		
		if len(validColumns) > 0 {
			columnsStr := strings.Join(validColumns, ", ")
			restoreSQL := fmt.Sprintf("INSERT INTO line_group_members (%s) SELECT %s FROM line_group_members_backup", columnsStr, columnsStr)
			
			if err := db.Exec(restoreSQL).Error; err != nil {
				log.Printf("Warning: Could not restore line_group_members data: %v", err)
			} else {
				log.Println("Successfully restored line_group_members data")
			}
		}
	}
	
	// 清理備份表
	if err := db.Migrator().DropTable("line_group_members_backup"); err != nil {
		log.Printf("Warning: Could not drop backup table: %v", err)
	}
	
	return nil
}

// handleIndexIssues 處理索引相容性問題
func handleIndexIssues(db *gorm.DB) error {
	// 檢查是否有衝突的索引
	tables := []string{
		"line_users", "line_groups", "line_group_members", 
		"line_upload_records", "line_webhook_logs", "line_settings", "line_upload_stats",
	}
	
	for _, table := range tables {
		if !db.Migrator().HasTable(table) {
			continue
		}
		
		// 查詢該表的所有索引
		query := fmt.Sprintf("PRAGMA index_list(%s)", table)
		rows, err := db.Raw(query).Rows()
		if err != nil {
			continue
		}
		
		var indexNames []string
		for rows.Next() {
			var seq int
			var name string
			var unique int
			var origin string
			var partial int
			
			if err := rows.Scan(&seq, &name, &unique, &origin, &partial); err != nil {
				continue
			}
			
			// 跳過自動生成的主鍵索引
			if origin == "pk" {
				continue
			}
			
			indexNames = append(indexNames, name)
		}
		rows.Close()
		
		// 記錄找到的索引
		if len(indexNames) > 0 {
			log.Printf("Found %d existing indexes on table %s", len(indexNames), table)
		}
	}
	
	return nil
}

// PopulateVirtualPaths 為現有檔案填充虛擬路徑
func PopulateVirtualPaths(db *gorm.DB) error {
	// 這個函數暫時為空，原本的實現可能在其他地方
	log.Println("PopulateVirtualPaths: Skipping - function not implemented")
	return nil
}

// stringPtr 輔助函數，返回字串指標
func stringPtr(s string) *string {
	return &s
}

// preMigrationCheck 在 GORM 初始化前檢查並修復資料庫相容性問題
func preMigrationCheck(dbPath string) error {
	// 檢查資料庫檔案是否存在
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		log.Println("Database file does not exist, no pre-migration check needed")
		return nil
	}
	
	// 使用原生 SQLite 連接來檢查結構
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database for pre-migration check: %v", err)
	}
	defer db.Close()
	
	// 檢查是否有 migration_history 表
	var hasMigrationHistory bool
	err = db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='migration_history'").Scan(&hasMigrationHistory)
	if err != nil {
		return fmt.Errorf("failed to check migration_history table: %v", err)
	}
	
	if hasMigrationHistory {
		log.Println("Found legacy migration_history table, checking for structure issues...")
		
		// 檢查 line_group_members 表是否存在問題
		if err := checkAndFixLineGroupMembersTable(db); err != nil {
			log.Printf("Warning: Could not fix line_group_members table: %v", err)
		}
		
		// 清理任何臨時表
		if err := cleanupTemporaryTables(db); err != nil {
			log.Printf("Warning: Could not clean up temporary tables: %v", err)
		}
	}
	
	return nil
}

// checkAndFixLineGroupMembersTable 檢查並修復 line_group_members 表結構問題
func checkAndFixLineGroupMembersTable(db *sql.DB) error {
	// 檢查表是否存在
	var tableExists int
	err := db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='line_group_members'").Scan(&tableExists)
	if err != nil || tableExists == 0 {
		return nil // 表不存在，跳過
	}
	
	// 檢查表結構
	rows, err := db.Query("PRAGMA table_info(line_group_members)")
	if err != nil {
		return err
	}
	defer rows.Close()
	
	hasProblematicColumn := false
	for rows.Next() {
		var cid int
		var name, dataType string
		var notNull, pk int
		var defaultValue *string
		
		if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &pk); err != nil {
			continue
		}
		
		// 檢查是否有 UNIQUE 列或其他問題列
		if name == "UNIQUE" || strings.Contains(strings.ToUpper(dataType), "UNIQUE") {
			hasProblematicColumn = true
			break
		}
	}
	
	if hasProblematicColumn {
		log.Println("Detected problematic line_group_members table structure, rebuilding...")
		return rebuildLineGroupMembersTableRaw(db)
	}
	
	return nil
}

// rebuildLineGroupMembersTableRaw 使用原生 SQL 重建 line_group_members 表
func rebuildLineGroupMembersTableRaw(db *sql.DB) error {
	// 開始事務
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	
	// 1. 備份現有數據到臨時表
	log.Println("Backing up line_group_members data...")
	_, err = tx.Exec(`CREATE TABLE line_group_members_backup AS 
		SELECT id, line_group_id, line_user_id, role, join_date, leave_date, 
		       is_active, upload_count, last_upload_at, created_at, updated_at 
		FROM line_group_members 
		WHERE id IS NOT NULL AND line_group_id IS NOT NULL AND line_user_id IS NOT NULL`)
	if err != nil {
		log.Printf("Warning: Could not backup data (table might be empty): %v", err)
	}
	
	// 2. 刪除原表
	_, err = tx.Exec("DROP TABLE line_group_members")
	if err != nil {
		return err
	}
	
	// 3. 創建新的正確結構的表
	createTableSQL := `
	CREATE TABLE line_group_members (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		line_group_id TEXT NOT NULL,
		line_user_id TEXT NOT NULL,
		role TEXT DEFAULT 'member',
		join_date DATETIME,
		leave_date DATETIME,
		is_active BOOLEAN DEFAULT true,
		upload_count INTEGER DEFAULT 0,
		last_upload_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(line_group_id, line_user_id)
	)`
	
	_, err = tx.Exec(createTableSQL)
	if err != nil {
		return err
	}
	
	// 4. 恢復數據
	log.Println("Restoring line_group_members data...")
	_, err = tx.Exec(`INSERT INTO line_group_members 
		(id, line_group_id, line_user_id, role, join_date, leave_date, 
		 is_active, upload_count, last_upload_at, created_at, updated_at)
		SELECT id, line_group_id, line_user_id, role, join_date, leave_date, 
		       is_active, upload_count, last_upload_at, created_at, updated_at 
		FROM line_group_members_backup`)
	if err != nil {
		log.Printf("Warning: Could not restore all data: %v", err)
	}
	
	// 5. 清理備份表
	_, err = tx.Exec("DROP TABLE IF EXISTS line_group_members_backup")
	if err != nil {
		log.Printf("Warning: Could not drop backup table: %v", err)
	}
	
	// 提交事務
	if err := tx.Commit(); err != nil {
		return err
	}
	
	log.Println("Successfully rebuilt line_group_members table")
	return nil
}

// cleanupTemporaryTables 清理臨時表
func cleanupTemporaryTables(db *sql.DB) error {
	// 查找所有臨時表
	rows, err := db.Query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_temp%'")
	if err != nil {
		return err
	}
	defer rows.Close()
	
	var tempTables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			continue
		}
		tempTables = append(tempTables, tableName)
	}
	
	// 刪除臨時表
	for _, tableName := range tempTables {
		log.Printf("Cleaning up temporary table: %s", tableName)
		_, err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", tableName))
		if err != nil {
			log.Printf("Warning: Could not drop temporary table %s: %v", tableName, err)
		}
	}
	
	return nil
}
