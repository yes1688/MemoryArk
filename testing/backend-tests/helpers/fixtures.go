package helpers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"memoryark/internal/models"
	"mime/multipart"
	"net/textproto"
	"strings"
	"time"
)

// FileFixture 測試檔案資料
type FileFixture struct {
	Name     string
	Content  []byte
	MimeType string
	Size     int64
	Hash     string
}

// GenerateTestFiles 產生測試檔案資料
func GenerateTestFiles() []FileFixture {
	return []FileFixture{
		{
			Name:     "test-image.jpg",
			Content:  generateRandomBytes(1024), // 1KB
			MimeType: "image/jpeg",
			Size:     1024,
		},
		{
			Name:     "test-document.pdf",
			Content:  generateRandomBytes(2048), // 2KB
			MimeType: "application/pdf",
			Size:     2048,
		},
		{
			Name:     "test-video.mp4",
			Content:  generateRandomBytes(5120), // 5KB
			MimeType: "video/mp4",
			Size:     5120,
		},
		{
			Name:     "特殊字元檔案名 #1.txt",
			Content:  []byte("測試內容"),
			MimeType: "text/plain",
			Size:     12,
		},
		{
			Name:     "duplicate-content.txt",
			Content:  []byte("This content will be duplicated"),
			MimeType: "text/plain",
			Size:     31,
		},
	}
}

// GenerateLargeFile 產生大檔案測試資料
func GenerateLargeFile(sizeInMB int) FileFixture {
	size := int64(sizeInMB * 1024 * 1024)
	content := generateRandomBytes(int(size))
	
	return FileFixture{
		Name:     fmt.Sprintf("large-file-%dmb.bin", sizeInMB),
		Content:  content,
		MimeType: "application/octet-stream",
		Size:     size,
	}
}

// GenerateTestCategories 產生測試分類資料
func GenerateTestCategories() []models.Category {
	return []models.Category{
		{
			Name:        "測試分類1",
			Description: "第一層分類",
			ParentID:    nil,
			Path:        "/測試分類1",
		},
		{
			Name:        "子分類1-1",
			Description: "第二層分類",
			ParentID:    uintPtr(1),
			Path:        "/測試分類1/子分類1-1",
		},
		{
			Name:        "測試分類2",
			Description: "另一個第一層分類",
			ParentID:    nil,
			Path:        "/測試分類2",
		},
	}
}

// GenerateTestUsers 產生測試用戶資料
func GenerateTestUsers() []models.User {
	return []models.User{
		{
			Email:    "admin@test.com",
			Name:     "測試管理員",
			Role:     "admin",
			Status:   "active",
			Provider: "cloudflare",
		},
		{
			Email:    "user1@test.com",
			Name:     "測試用戶1",
			Role:     "user",
			Status:   "active",
			Provider: "cloudflare",
		},
		{
			Email:    "user2@test.com",
			Name:     "測試用戶2",
			Role:     "user",
			Status:   "active",
			Provider: "cloudflare",
		},
		{
			Email:    "pending@test.com",
			Name:     "待審核用戶",
			Role:     "user",
			Status:   "pending",
			Provider: "cloudflare",
		},
		{
			Email:    "suspended@test.com",
			Name:     "停用用戶",
			Role:     "user",
			Status:   "suspended",
			Provider: "cloudflare",
		},
	}
}

// GenerateTestRegistrations 產生測試註冊資料
func GenerateTestRegistrations() []models.Registration {
	return []models.Registration{
		{
			Email:     "newuser1@test.com",
			Name:      "新用戶1",
			Reason:    "想要使用系統管理教會檔案",
			Status:    "pending",
			CreatedAt: time.Now().Add(-24 * time.Hour),
		},
		{
			Email:     "newuser2@test.com",
			Name:      "新用戶2",
			Reason:    "教會同工推薦",
			Status:    "pending",
			CreatedAt: time.Now().Add(-48 * time.Hour),
		},
		{
			Email:     "rejected@test.com",
			Name:      "被拒絕的用戶",
			Reason:    "測試",
			Status:    "rejected",
			CreatedAt: time.Now().Add(-72 * time.Hour),
		},
	}
}

// CreateMockMultipartFile 建立模擬的 multipart 檔案
func CreateMockMultipartFile(fixture FileFixture) (*multipart.FileHeader, error) {
	// 計算檔案 hash
	hash := sha256.Sum256(fixture.Content)
	fixture.Hash = hex.EncodeToString(hash[:])

	// 建立 multipart header
	header := make(textproto.MIMEHeader)
	header.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, fixture.Name))
	header.Set("Content-Type", fixture.MimeType)

	return &multipart.FileHeader{
		Filename: fixture.Name,
		Header:   header,
		Size:     fixture.Size,
	}, nil
}

// GenerateShareLink 產生測試分享連結
func GenerateShareLink(fileID uint, createdBy uint) models.ShareLink {
	token := generateRandomString(32)
	return models.ShareLink{
		FileID:    fileID,
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		CreatedBy: createdBy,
		ViewCount: 0,
	}
}

// GenerateActivityLog 產生測試活動日誌
func GenerateActivityLog(userID uint, action string) models.ActivityLog {
	return models.ActivityLog{
		UserID:    userID,
		Action:    action,
		Resource:  "file",
		Details:   fmt.Sprintf("Test %s action", action),
		IP:        "127.0.0.1",
		UserAgent: "Test/1.0",
		CreatedAt: time.Now(),
	}
}

// Helper functions

func generateRandomBytes(size int) []byte {
	b := make([]byte, size)
	rand.Read(b)
	return b
}

func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[randInt(len(charset))]
	}
	return string(b)
}

func randInt(max int) int {
	b := make([]byte, 1)
	rand.Read(b)
	return int(b[0]) % max
}

func uintPtr(i uint) *uint {
	return &i
}

// TestScenarios 測試場景資料

// UploadTestScenarios 檔案上傳測試場景
var UploadTestScenarios = []struct {
	Name          string
	FileName      string
	FileContent   []byte
	VirtualPath   string
	ExpectError   bool
	ExpectedError string
}{
	{
		Name:        "正常檔案上傳",
		FileName:    "normal.txt",
		FileContent: []byte("正常檔案內容"),
		VirtualPath: "/documents/normal.txt",
		ExpectError: false,
	},
	{
		Name:        "空檔案上傳",
		FileName:    "empty.txt",
		FileContent: []byte{},
		VirtualPath: "/documents/empty.txt",
		ExpectError: true,
		ExpectedError: "EMPTY_FILE",
	},
	{
		Name:        "特殊字元檔名",
		FileName:    "特殊@#$%檔案.txt",
		FileContent: []byte("內容"),
		VirtualPath: "/documents/special.txt",
		ExpectError: false,
	},
	{
		Name:        "路徑遍歷攻擊",
		FileName:    "../../../etc/passwd",
		FileContent: []byte("malicious"),
		VirtualPath: "../../../etc/passwd",
		ExpectError: true,
		ExpectedError: "INVALID_PATH",
	},
}

// PermissionTestScenarios 權限測試場景
var PermissionTestScenarios = []struct {
	Name         string
	UserRole     string
	Action       string
	Resource     string
	ExpectAllow  bool
}{
	{
		Name:        "管理員存取所有檔案",
		UserRole:    "admin",
		Action:      "read",
		Resource:    "any_file",
		ExpectAllow: true,
	},
	{
		Name:        "一般用戶存取自己的檔案",
		UserRole:    "user",
		Action:      "read",
		Resource:    "own_file",
		ExpectAllow: true,
	},
	{
		Name:        "一般用戶存取他人檔案",
		UserRole:    "user",
		Action:      "read",
		Resource:    "other_file",
		ExpectAllow: false,
	},
	{
		Name:        "未認證用戶存取檔案",
		UserRole:    "anonymous",
		Action:      "read",
		Resource:    "any_file",
		ExpectAllow: false,
	},
}

// EdgeCaseScenarios 邊界條件測試場景
var EdgeCaseScenarios = []struct {
	Name        string
	Description string
	TestFunc    func() error
}{
	{
		Name:        "並發上傳相同檔案",
		Description: "測試多個用戶同時上傳相同內容的檔案",
	},
	{
		Name:        "超大檔案處理",
		Description: "測試上傳 2GB 以上的檔案",
	},
	{
		Name:        "資料庫連線中斷",
		Description: "測試資料庫連線中斷時的錯誤處理",
	},
	{
		Name:        "磁碟空間不足",
		Description: "測試磁碟空間不足時的處理",
	},
}