# 🔑 生產環境 API Token 設定指南

## 📋 概述

本指南說明如何在生產環境中正確設定 API Token 認證，確保 LINE Service 與 MemoryArk Backend 之間的安全通信。

## 🚀 生產環境部署步驟

### 1. 生成安全的 API Token

```bash
# 在伺服器上生成 64 字元的安全 Token
openssl rand -hex 32
# 範例輸出: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 2. 設定 MemoryArk Backend 環境變數

```bash
# /path/to/memoryark/.env
DEVELOPMENT_MODE=false              # 🚨 關閉開發模式
DEV_BYPASS_AUTH=false              # 🚨 關閉認證跳過
LINE_SERVICE_API_TOKEN=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 3. 設定 LINE Service 環境變數

```bash
# /path/to/line-service/.env
NODE_ENV=production
MEMORYARK_API_TOKEN=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
MEMORYARK_UPLOAD_ENDPOINT=/api/api-access/files/upload
```

### 4. API 端點說明

#### 開發模式 (當前)
```
LINE Service → POST /api/files/upload → MemoryArk Backend
                   ↓
               跳過認證 (DEV_BYPASS_AUTH=true)
```

#### 生產模式
```
LINE Service → POST /api/api-access/files/upload → API Token 中間件 → MemoryArk Backend
                   ↓                                      ↓
          Bearer {MEMORYARK_API_TOKEN}              驗證 Token 是否匹配
                                                   LINE_SERVICE_API_TOKEN
```

## 🔒 安全機制

### Token 驗證流程

1. **LINE Service 發送請求**
   ```http
   POST /api/api-access/files/upload
   Authorization: Bearer a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
   Content-Type: multipart/form-data
   ```

2. **Backend 驗證步驟**
   ```go
   // 1. 檢查 Authorization header 是否存在
   // 2. 檢查是否為 "Bearer " 格式
   // 3. 提取 Token
   // 4. 比對環境變數 LINE_SERVICE_API_TOKEN
   // 5. 驗證成功才允許存取
   ```

3. **驗證失敗回應**
   ```json
   {
     "success": false,
     "error": "Invalid API token",
     "code": "INVALID_API_TOKEN"
   }
   ```

## 🧪 測試驗證

### 測試正確 Token
```bash
curl -X POST http://your-backend.com/api/api-access/files/upload \
  -H "Authorization: Bearer YOUR_CORRECT_TOKEN" \
  -F "file=@test.jpg"
```

### 測試錯誤 Token
```bash
curl -X POST http://your-backend.com/api/api-access/files/upload \
  -H "Authorization: Bearer WRONG_TOKEN" \
  -F "file=@test.jpg"

# 應該返回 401 Unauthorized
```

### 測試缺少 Token
```bash
curl -X POST http://your-backend.com/api/api-access/files/upload \
  -F "file=@test.jpg"

# 應該返回 401 Unauthorized
```

## 📊 監控與日誌

### 成功認證日誌
```
✅ API Token 驗證成功: a1b2c3d4... from 192.168.1.100
```

### 失敗認證日誌
```
🚨 API Token 驗證失敗: wrong_tok... from 192.168.1.200
```

## 🔄 Token 輪換最佳實踐

### 定期更換 Token (建議每 90 天)

1. **生成新 Token**
   ```bash
   NEW_TOKEN=$(openssl rand -hex 32)
   echo "新 Token: $NEW_TOKEN"
   ```

2. **更新 Backend 配置**
   ```bash
   # 先在 Backend 支援新舊兩個 Token
   LINE_SERVICE_API_TOKEN=$OLD_TOKEN,$NEW_TOKEN
   ```

3. **更新 LINE Service**
   ```bash
   # 更新 LINE Service 使用新 Token
   MEMORYARK_API_TOKEN=$NEW_TOKEN
   ```

4. **移除舊 Token**
   ```bash
   # 確認新 Token 正常運作後，移除舊 Token
   LINE_SERVICE_API_TOKEN=$NEW_TOKEN
   ```

## 🚨 安全注意事項

- ❌ **絕不** 在程式碼中硬編碼 Token
- ❌ **絕不** 在日誌中輸出完整 Token
- ✅ **務必** 使用安全的環境變數管理
- ✅ **務必** 定期輪換 Token
- ✅ **務必** 監控異常的認證失敗

## 🔗 相關檔案

- **Backend API Token 中間件**: `backend/internal/middleware/api_token.go`
- **Backend 配置**: `backend/internal/config/config.go`
- **LINE Service API 客戶端**: `line-service/src/services/memoryarkApi.ts`
- **LINE Service 配置**: `line-service/src/config/index.ts`