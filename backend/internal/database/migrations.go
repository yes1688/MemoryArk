package database

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"
	"memoryark/pkg/logger"
)

// MigrationHistory 遷移歷史記錄
type MigrationHistory struct {
	ID          uint      `gorm:"primaryKey"`
	Version     string    `gorm:"size:50;not null"`
	Description string    `gorm:"type:text"`
	ExecutedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

// TableName 指定表名
func (MigrationHistory) TableName() string {
	return "migration_history"
}

// RunMigrations 執行資料庫遷移
func RunMigrations(db *gorm.DB) error {
	logger.Info("Starting database migrations...")

	// 確保 migration_history 表存在
	if err := db.AutoMigrate(&MigrationHistory{}); err != nil {
		return fmt.Errorf("failed to create migration_history table: %v", err)
	}

	// 獲取遷移檔案目錄
	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		// 如果當前目錄沒有 migrations，嘗試尋找
		possiblePaths := []string{
			"../migrations",
			"../../migrations",
			"./backend/migrations",
		}
		
		found := false
		for _, path := range possiblePaths {
			if _, err := os.Stat(path); err == nil {
				migrationsDir = path
				found = true
				break
			}
		}
		
		if !found {
			logger.Warn("No migrations directory found, skipping migrations")
			return nil
		}
	}

	// 讀取遷移檔案
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	if err != nil {
		return fmt.Errorf("failed to read migration files: %v", err)
	}

	if len(files) == 0 {
		logger.Info("No migration files found")
		return nil
	}

	// 獲取已執行的遷移
	var executedMigrations []MigrationHistory
	db.Find(&executedMigrations)
	
	executedVersions := make(map[string]bool)
	for _, migration := range executedMigrations {
		executedVersions[migration.Version] = true
	}

	// 按檔名排序並執行遷移
	for _, file := range files {
		// 從檔名提取版本號（假設格式為 001_description.sql）
		fileName := filepath.Base(file)
		version := strings.Split(fileName, "_")[0]
		
		// 檢查是否已執行
		if executedVersions[version] {
			logger.Info(fmt.Sprintf("Migration %s already executed, skipping", version))
			continue
		}

		logger.Info(fmt.Sprintf("Executing migration %s", fileName))
		
		// 讀取並執行 SQL 檔案
		if err := executeSQLFile(db, file); err != nil {
			return fmt.Errorf("failed to execute migration %s: %v", fileName, err)
		}

		// 記錄遷移歷史
		migration := MigrationHistory{
			Version:     version,
			Description: strings.TrimSuffix(strings.Join(strings.Split(fileName, "_")[1:], "_"), ".sql"),
			ExecutedAt:  time.Now(),
		}
		
		if err := db.Create(&migration).Error; err != nil {
			return fmt.Errorf("failed to record migration history for %s: %v", fileName, err)
		}

		logger.Info(fmt.Sprintf("Migration %s completed successfully", version))
	}

	logger.Info("All migrations completed successfully")
	return nil
}

// executeSQLFile 執行 SQL 檔案
func executeSQLFile(db *gorm.DB, filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %v", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	var sqlBuilder strings.Builder
	var inTransaction bool

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		
		// 跳過註釋和空行
		if line == "" || strings.HasPrefix(line, "--") {
			continue
		}

		sqlBuilder.WriteString(line)
		sqlBuilder.WriteString("\n")

		// 檢查是否為完整的 SQL 語句（以分號結尾）
		if strings.HasSuffix(line, ";") {
			sql := strings.TrimSpace(sqlBuilder.String())
			if sql != "" {
				// 檢查是否需要事務
				sqlUpper := strings.ToUpper(sql)
				needsTransaction := strings.Contains(sqlUpper, "CREATE TABLE") || 
								   strings.Contains(sqlUpper, "ALTER TABLE") ||
								   strings.Contains(sqlUpper, "CREATE INDEX") ||
								   strings.Contains(sqlUpper, "INSERT")

				if needsTransaction && !inTransaction {
					if err := db.Exec("BEGIN TRANSACTION").Error; err != nil {
						return fmt.Errorf("failed to begin transaction: %v", err)
					}
					inTransaction = true
				}

				// 執行 SQL
				if err := db.Exec(sql).Error; err != nil {
					if inTransaction {
						db.Exec("ROLLBACK")
						inTransaction = false
					}
					return fmt.Errorf("failed to execute SQL: %s\nError: %v", sql, err)
				}

				// 如果是批次結束，提交事務
				if inTransaction && (strings.Contains(sqlUpper, "COMMIT") || 
					!needsTransaction) {
					if err := db.Exec("COMMIT").Error; err != nil {
						return fmt.Errorf("failed to commit transaction: %v", err)
					}
					inTransaction = false
				}
			}
			sqlBuilder.Reset()
		}
	}

	// 確保事務已提交
	if inTransaction {
		if err := db.Exec("COMMIT").Error; err != nil {
			return fmt.Errorf("failed to commit final transaction: %v", err)
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading file: %v", err)
	}

	return nil
}

// PopulateVirtualPaths 為現有檔案填充虛擬路徑
func PopulateVirtualPaths(db *gorm.DB) error {
	logger.Info("Populating virtual paths for existing files...")

	// 查詢所有沒有虛擬路徑的檔案
	var files []struct {
		ID           uint
		Name         string
		OriginalName string
		ParentID     *uint
		VirtualPath  string
	}

	if err := db.Table("files").
		Select("id, name, original_name, parent_id, virtual_path").
		Where("virtual_path IS NULL OR virtual_path = ''").
		Find(&files).Error; err != nil {
		return fmt.Errorf("failed to query files: %v", err)
	}

	if len(files) == 0 {
		logger.Info("No files need virtual path population")
		return nil
	}

	logger.Info(fmt.Sprintf("Found %d files needing virtual path population", len(files)))

	// 建立父子關係映射
	parentMap := make(map[uint][]uint)
	fileMap := make(map[uint]*struct {
		ID           uint
		Name         string
		OriginalName string
		ParentID     *uint
		VirtualPath  string
	})

	for i := range files {
		file := &files[i]
		fileMap[file.ID] = file
		if file.ParentID != nil {
			parentMap[*file.ParentID] = append(parentMap[*file.ParentID], file.ID)
		}
	}

	// 遞歸函數建立虛擬路徑
	var buildVirtualPath func(uint) string
	buildVirtualPath = func(fileID uint) string {
		file := fileMap[fileID]
		if file == nil {
			return ""
		}

		if file.VirtualPath != "" {
			return file.VirtualPath
		}

		if file.ParentID == nil {
			file.VirtualPath = "/" + file.OriginalName
		} else {
			parentPath := buildVirtualPath(*file.ParentID)
			if parentPath == "" {
				file.VirtualPath = "/" + file.OriginalName
			} else {
				file.VirtualPath = parentPath + "/" + file.OriginalName
			}
		}

		return file.VirtualPath
	}

	// 為所有檔案建立虛擬路徑
	for _, file := range files {
		if file.VirtualPath == "" {
			buildVirtualPath(file.ID)
		}
	}

	// 批次更新資料庫
	tx := db.Begin()
	for _, file := range files {
		if file.VirtualPath != "" {
			if err := tx.Table("files").
				Where("id = ?", file.ID).
				Update("virtual_path", file.VirtualPath).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to update virtual path for file %d: %v", file.ID, err)
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit virtual path updates: %v", err)
	}

	logger.Info("Virtual path population completed successfully")
	return nil
}