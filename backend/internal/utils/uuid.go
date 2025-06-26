package utils

import (
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// GenerateUUIDv7 生成 UUID v7
// 使用自定義實作，因為 google/uuid 尚未完全支援 v7
func GenerateUUIDv7() string {
	return generateCustomUUIDv7()
}

// generateCustomUUIDv7 自定義 UUID v7 實作
// 格式：時間戳(48位) + 版本(4位) + 隨機A(12位) + 變體(2位) + 隨機B(62位)
func generateCustomUUIDv7() string {
	// 1. 獲取當前時間戳（毫秒）
	timestamp := time.Now().UnixMilli()
	
	// 2. 生成隨機數據
	randomBytes := make([]byte, 10) // 80 位隨機數據
	if _, err := rand.Read(randomBytes); err != nil {
		// 如果隨機數生成失敗，使用時間戳作為種子的偽隨機數
		fallbackRandom(randomBytes, timestamp)
	}
	
	// 3. 構建 UUID v7
	var uuidBytes [16]byte
	
	// 前 6 字節：48 位時間戳
	binary.BigEndian.PutUint64(uuidBytes[:8], uint64(timestamp))
	// 只取前 6 字節，後 2 字節留給版本和隨機數
	copy(uuidBytes[:6], uuidBytes[:6])
	
	// 第 7 字節：版本(4位) + 隨機A高4位
	uuidBytes[6] = 0x70 | (randomBytes[0] & 0x0F) // 版本 7
	
	// 第 8 字節：隨機A低8位
	uuidBytes[7] = randomBytes[1]
	
	// 第 9 字節：變體(2位) + 隨機B高6位
	uuidBytes[8] = 0x80 | (randomBytes[2] & 0x3F) // 變體 10
	
	// 第 10-16 字節：隨機B剩餘56位
	copy(uuidBytes[9:], randomBytes[3:10])
	
	// 4. 格式化為標準 UUID 字符串
	return formatUUID(uuidBytes)
}

// fallbackRandom 當加密隨機數生成失敗時的回退方案
func fallbackRandom(bytes []byte, seed int64) {
	// 使用時間戳和簡單的線性同餘生成器
	state := uint64(seed)
	for i := range bytes {
		state = state*1664525 + 1013904223 // 標準 LCG 參數
		bytes[i] = byte(state >> 24)
	}
}

// formatUUID 將字節數組格式化為標準 UUID 字符串
func formatUUID(bytes [16]byte) string {
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		binary.BigEndian.Uint32(bytes[0:4]),
		binary.BigEndian.Uint16(bytes[4:6]),
		binary.BigEndian.Uint16(bytes[6:8]),
		binary.BigEndian.Uint16(bytes[8:10]),
		bytes[10:16],
	)
}

// ExtractTimestamp 從 UUID v7 中提取時間戳
func ExtractTimestamp(uuidStr string) (time.Time, error) {
	// 解析 UUID 字符串
	id, err := uuid.Parse(uuidStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid UUID format: %w", err)
	}
	
	// 檢查版本
	if id.Version() != 7 {
		return time.Time{}, fmt.Errorf("not a UUID v7, got version %d", id.Version())
	}
	
	// 提取前 48 位時間戳
	bytes := id[:]
	timestampBytes := make([]byte, 8)
	copy(timestampBytes[2:], bytes[:6]) // 前 6 字節是 48 位時間戳
	
	timestamp := int64(binary.BigEndian.Uint64(timestampBytes))
	return time.UnixMilli(timestamp), nil
}

// IsValidUUIDv7 檢查是否為有效的 UUID v7
func IsValidUUIDv7(uuidStr string) bool {
	id, err := uuid.Parse(uuidStr)
	if err != nil {
		return false
	}
	return id.Version() == 7
}

// CompareUUIDv7 比較兩個 UUID v7 的時間順序
// 返回值：-1 表示 uuid1 < uuid2, 0 表示相等, 1 表示 uuid1 > uuid2
func CompareUUIDv7(uuid1, uuid2 string) (int, error) {
	time1, err1 := ExtractTimestamp(uuid1)
	time2, err2 := ExtractTimestamp(uuid2)
	
	if err1 != nil {
		return 0, fmt.Errorf("invalid uuid1: %w", err1)
	}
	if err2 != nil {
		return 0, fmt.Errorf("invalid uuid2: %w", err2)
	}
	
	if time1.Before(time2) {
		return -1, nil
	} else if time1.After(time2) {
		return 1, nil
	}
	return 0, nil
}

// GenerateBatchUUIDv7 批量生成 UUID v7，確保時間順序
func GenerateBatchUUIDv7(count int) []string {
	if count <= 0 {
		return nil
	}
	
	uuids := make([]string, count)
	baseTime := time.Now().UnixMilli()
	
	for i := 0; i < count; i++ {
		// 為每個 UUID 增加微小的時間差，確保排序
		timestamp := baseTime + int64(i)
		uuids[i] = generateUUIDv7WithTimestamp(timestamp)
	}
	
	return uuids
}

// generateUUIDv7WithTimestamp 使用指定時間戳生成 UUID v7
func generateUUIDv7WithTimestamp(timestamp int64) string {
	randomBytes := make([]byte, 10)
	if _, err := rand.Read(randomBytes); err != nil {
		fallbackRandom(randomBytes, timestamp)
	}
	
	var uuidBytes [16]byte
	
	// 使用指定的時間戳
	binary.BigEndian.PutUint64(uuidBytes[:8], uint64(timestamp))
	copy(uuidBytes[:6], uuidBytes[:6])
	
	uuidBytes[6] = 0x70 | (randomBytes[0] & 0x0F)
	uuidBytes[7] = randomBytes[1]
	uuidBytes[8] = 0x80 | (randomBytes[2] & 0x3F)
	copy(uuidBytes[9:], randomBytes[3:10])
	
	return formatUUID(uuidBytes)
}