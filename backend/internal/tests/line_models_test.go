package tests

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"memoryark/internal/models"
	"memoryark/internal/utils"
)

// setupTestDB 設置測試資料庫
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// 遷移所有 LINE 相關表
	err = db.AutoMigrate(
		&models.LineUploadRecord{},
		&models.LineUser{},
		&models.LineGroup{},
		&models.LineGroupMember{},
		&models.LineWebhookLog{},
		&models.LineSetting{},
		&models.LineUploadStat{},
	)
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

// TestLineUserCRUD 測試 LineUser 的 CRUD 操作
func TestLineUserCRUD(t *testing.T) {
	db := setupTestDB(t)

	// Create
	user := &models.LineUser{
		LineUserID:          "U1234567890abcdef",
		DisplayName:         "測試用戶",
		PictureURL:          strPtr("https://example.com/avatar.jpg"),
		StatusMessage:       strPtr("Hello World"),
		Language:            strPtr("zh-TW"),
		IsBlocked:           false,
		IsActive:            true,
		FirstInteractionAt:  timePtr(time.Now()),
		LastInteractionAt:   timePtr(time.Now()),
		TotalUploads:        5,
	}

	result := db.Create(user)
	if result.Error != nil {
		t.Fatalf("Failed to create LineUser: %v", result.Error)
	}

	// Read
	var readUser models.LineUser
	result = db.Where("line_user_id = ?", "U1234567890abcdef").First(&readUser)
	if result.Error != nil {
		t.Fatalf("Failed to read LineUser: %v", result.Error)
	}

	if readUser.DisplayName != "測試用戶" {
		t.Errorf("Expected DisplayName '測試用戶', got '%s'", readUser.DisplayName)
	}

	// Update
	result = db.Model(&readUser).Update("total_uploads", 10)
	if result.Error != nil {
		t.Fatalf("Failed to update LineUser: %v", result.Error)
	}

	// Verify update
	var updatedUser models.LineUser
	db.Where("line_user_id = ?", "U1234567890abcdef").First(&updatedUser)
	if updatedUser.TotalUploads != 10 {
		t.Errorf("Expected TotalUploads 10, got %d", updatedUser.TotalUploads)
	}

	// Delete
	result = db.Delete(&readUser)
	if result.Error != nil {
		t.Fatalf("Failed to delete LineUser: %v", result.Error)
	}

	// Verify delete
	var deletedUser models.LineUser
	result = db.Where("line_user_id = ?", "U1234567890abcdef").First(&deletedUser)
	if result.Error != gorm.ErrRecordNotFound {
		t.Error("Expected record to be deleted")
	}
}

// TestLineUploadRecordUUID 測試 LineUploadRecord 的 UUID v7 生成
func TestLineUploadRecordUUID(t *testing.T) {
	db := setupTestDB(t)

	// 創建一個假的 File 記錄（簡化測試）
	// 在實際應用中，這應該是 models.File
	type TestFile struct {
		ID   uint   `gorm:"primaryKey"`
		Name string `gorm:"size:255"`
	}
	db.AutoMigrate(&TestFile{})
	
	testFile := &TestFile{Name: "test.jpg"}
	db.Create(testFile)

	record := &models.LineUploadRecord{
		FileID:         testFile.ID,
		LineUserID:     "U1234567890abcdef",
		LineUserName:   "測試用戶",
		LineMessageID:  "MSG123456789",
		MessageType:    "image",
		DownloadStatus: "completed",
	}

	result := db.Create(record)
	if result.Error != nil {
		t.Fatalf("Failed to create LineUploadRecord: %v", result.Error)
	}

	// 驗證 UUID 是否正確生成
	if record.ID == "" {
		t.Error("UUID was not generated")
	}

	// 驗證 UUID v7 格式
	if !utils.IsValidUUIDv7(record.ID) {
		t.Errorf("Generated UUID '%s' is not a valid UUID v7", record.ID)
	}

	// 驗證可以從 UUID 提取時間戳
	timestamp, err := utils.ExtractTimestamp(record.ID)
	if err != nil {
		t.Errorf("Failed to extract timestamp from UUID: %v", err)
	}

	// 時間戳應該接近當前時間（允許 1 秒誤差）
	now := time.Now()
	diff := now.Sub(timestamp)
	if diff < 0 {
		diff = -diff
	}
	if diff > time.Second {
		t.Errorf("Timestamp extraction error: expected ~%v, got %v", now, timestamp)
	}
}

// TestLineWebhookLogJSON 測試 LineWebhookLog 的 JSON 數據處理
func TestLineWebhookLogJSON(t *testing.T) {
	db := setupTestDB(t)

	eventData := models.JSONMap{
		"type": "message",
		"user": map[string]interface{}{
			"id":   "U1234567890abcdef",
			"name": "測試用戶",
		},
		"message": map[string]interface{}{
			"id":   "MSG123456789",
			"type": "image",
			"text": "Hello",
		},
	}

	log := &models.LineWebhookLog{
		WebhookType:      "message",
		LineUserID:       strPtr("U1234567890abcdef"),
		MessageID:        strPtr("MSG123456789"),
		MessageType:      strPtr("image"),
		EventData:        eventData,
		ProcessingStatus: "pending",
		RetryCount:       0,
	}

	result := db.Create(log)
	if result.Error != nil {
		t.Fatalf("Failed to create LineWebhookLog: %v", result.Error)
	}

	// 讀取並驗證 JSON 數據
	var readLog models.LineWebhookLog
	result = db.Where("webhook_type = ?", "message").First(&readLog)
	if result.Error != nil {
		t.Fatalf("Failed to read LineWebhookLog: %v", result.Error)
	}

	// 驗證 JSON 數據是否正確保存和讀取
	if readLog.EventData["type"] != "message" {
		t.Errorf("Expected EventData type 'message', got '%v'", readLog.EventData["type"])
	}

	userMap, ok := readLog.EventData["user"].(map[string]interface{})
	if !ok {
		t.Error("EventData user field is not a map")
	} else if userMap["id"] != "U1234567890abcdef" {
		t.Errorf("Expected user id 'U1234567890abcdef', got '%v'", userMap["id"])
	}
}

// TestLineGroupMemberRelation 測試群組成員關聯
func TestLineGroupMemberRelation(t *testing.T) {
	db := setupTestDB(t)

	// 創建測試用戶
	user := &models.LineUser{
		LineUserID:  "U1234567890abcdef",
		DisplayName: "測試用戶",
	}
	db.Create(user)

	// 創建測試群組
	group := &models.LineGroup{
		LineGroupID: "G1234567890abcdef",
		GroupName:   "測試群組",
		GroupType:   "group",
	}
	db.Create(group)

	// 創建群組成員關聯
	member := &models.LineGroupMember{
		LineGroupID: group.LineGroupID,
		LineUserID:  user.LineUserID,
		Role:        "member",
		JoinDate:    timePtr(time.Now()),
		IsActive:    true,
		UploadCount: 3,
	}
	db.Create(member)

	// 測試關聯查詢
	var readMember models.LineGroupMember
	result := db.Preload("LineGroup").Preload("LineUser").
		Where("line_group_id = ? AND line_user_id = ?", group.LineGroupID, user.LineUserID).
		First(&readMember)

	if result.Error != nil {
		t.Fatalf("Failed to read LineGroupMember with associations: %v", result.Error)
	}

	if readMember.LineGroup == nil {
		t.Error("LineGroup association was not loaded")
	} else if readMember.LineGroup.GroupName != "測試群組" {
		t.Errorf("Expected GroupName '測試群組', got '%s'", readMember.LineGroup.GroupName)
	}

	if readMember.LineUser == nil {
		t.Error("LineUser association was not loaded")
	} else if readMember.LineUser.DisplayName != "測試用戶" {
		t.Errorf("Expected DisplayName '測試用戶', got '%s'", readMember.LineUser.DisplayName)
	}
}

// TestLineSetting 測試設定功能
func TestLineSetting(t *testing.T) {
	db := setupTestDB(t)

	setting := &models.LineSetting{
		SettingKey:   "auto_download_enabled",
		SettingValue: strPtr("true"),
		SettingType:  "boolean",
		Description:  strPtr("是否自動下載 LINE 上傳的照片"),
		IsActive:     true,
	}

	result := db.Create(setting)
	if result.Error != nil {
		t.Fatalf("Failed to create LineSetting: %v", result.Error)
	}

	// 測試根據 key 查詢設定
	var readSetting models.LineSetting
	result = db.Where("setting_key = ?", "auto_download_enabled").First(&readSetting)
	if result.Error != nil {
		t.Fatalf("Failed to read LineSetting: %v", result.Error)
	}

	if *readSetting.SettingValue != "true" {
		t.Errorf("Expected SettingValue 'true', got '%s'", *readSetting.SettingValue)
	}
}

// TestUUIDBatchGeneration 測試批量 UUID 生成
func TestUUIDBatchGeneration(t *testing.T) {
	count := 100
	uuids := utils.GenerateBatchUUIDv7(count)

	if len(uuids) != count {
		t.Fatalf("Expected %d UUIDs, got %d", count, len(uuids))
	}

	// 驗證所有 UUID 都是有效的 v7
	for i, uuid := range uuids {
		if !utils.IsValidUUIDv7(uuid) {
			t.Errorf("UUID at index %d is not a valid UUID v7: %s", i, uuid)
		}
	}

	// 驗證時間順序（允許相同時間戳）
	for i := 1; i < len(uuids); i++ {
		cmp, err := utils.CompareUUIDv7(uuids[i-1], uuids[i])
		if err != nil {
			t.Errorf("Failed to compare UUIDs: %v", err)
		}
		if cmp > 0 {
			t.Errorf("UUIDs are not in chronological order at index %d", i)
		}
	}
}

// 輔助函數
func strPtr(s string) *string {
	return &s
}

func timePtr(t time.Time) *time.Time {
	return &t
}