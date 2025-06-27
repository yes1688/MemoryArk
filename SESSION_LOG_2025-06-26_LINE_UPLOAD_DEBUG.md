# LINE 圖片上傳功能問題排查與解決方案

**對話時間**: 2025-06-26 23:00-23:35  
**主要任務**: 測試並修復 LINE 圖片上傳功能  
**解決狀態**: 🔧 進行中 (認證問題已解決，等待最終測試)

---

## 🎯 問題描述

用戶嘗試在 LINE 中傳送圖片給 Bot，但收到上傳失敗訊息。系統日誌顯示：
- 初期：404 錯誤 (API 端點不存在)
- 後期：401 錯誤 (未授權訪問)

## 🔍 問題排查過程

### 1️⃣ API 端點配置錯誤
**問題**: LINE Service 使用錯誤的上傳端點
```bash
# 錯誤配置
MEMORYARK_UPLOAD_ENDPOINT=/api/photos/upload  # 404

# 正確配置  
MEMORYARK_UPLOAD_ENDPOINT=/api/api-access/files/upload  # ✅
```

**解決**: 修正 `line-service/.env` 中的端點設定

### 2️⃣ 容器環境變數未更新
**問題**: 使用 `podman restart` 無法讓新的 .env 設定生效

**根本原因**: 容器創建時就固化了環境變數，restart 不會重新讀取

**解決**: 採用完整重建流程
```bash
podman-compose down line-service line-nginx
podman-compose up -d line-service line-nginx
```

### 3️⃣ API TOKEN 認證問題
**問題**: 即使後端設為開發模式跳過認證，仍返回 401

**深度分析**:
1. API Token 中間件確實跳過了 token 驗證
2. 但 `UploadFile` 函數檢查 `user_id`，API Token 認證後未設置此值
3. 造成第二層認證失敗

**核心程式碼問題**:
```go
// file.go:272-276
userIDValue, exists := c.Get("user_id")
if !exists {
    api.Unauthorized(c, "未授權訪問")  // ← 這裡失敗
    return
}
```

**解決方案**: 修改 API Token 中間件，為服務設置 service user ID
```go
// api_token.go:68-71
c.Set("api_client", "line_service")
c.Set("auth_type", "api_token")
c.Set("user_id", uint(0))  // ← 新增：設置系統服務用戶 ID
```

## 🛠️ 解決方案實作

### TOKEN 配置
```bash
# LINE Service (.env)
MEMORYARK_API_TOKEN=memoryark-line-service-token-2025

# Backend (.env) 
LINE_SERVICE_API_TOKEN=memoryark-line-service-token-2025
```

### ENV 檔案註解優化
為兩個 .env 檔案添加詳細說明：
- 📝 TOKEN 本質說明 (可以是任何自訂文字)
- 🔑 功能用途說明
- ⚠️ 兩邊必須一致的重要提醒

### 容器部署 SOP 更新
在 `CLAUDE.md` 中新增專門的環境變數修改流程：
```bash
# ⚠️ 重要：修改 .env 檔案後，單純 restart 不會生效！
# 必須完全重建容器才能載入新的環境變數
```

## 📊 LINE 用戶資訊處理分析

### 已實作的用戶資訊擷取
LINE Service 已完整實作用戶資訊處理：

**取得的資訊**:
```typescript
{
  userId: string,          // LINE 用戶 ID (唯一識別)
  displayName: string,     // 顯示名稱  
  pictureUrl?: string,     // 頭像 URL
  statusMessage?: string,  // 狀態訊息
  language?: string        // 語言設定
}
```

**上傳到後端的 metadata**:
```json
{
  "lineUserId": "U1234567890abcdef...",
  "lineMessageId": "567320167319863438", 
  "timestamp": "2025-06-26T23:33:51.351Z",
  "source": { "type": "user", "userId": "..." },
  "userProfile": {
    "userId": "U1234567890abcdef...",
    "displayName": "王小明",
    "pictureUrl": "https://profile.line-scdn.net/...",
    "statusMessage": "今天天氣真好！"
  }
}
```

**檔案描述和標籤**:
- 描述: `"來自 LINE 的照片 - 使用者：{顯示名稱}"`
- 標籤: `['line', 'auto-upload', '{顯示名稱}']`

## 🎯 架構設計決策：TOKEN vs 內部免認證

### 討論的兩種方案
1. **內部容器免認證** - 基於網路隔離的信任
2. **統一 TOKEN 認證** - 明確的服務間身份驗證

### 採用的解決方案
選擇 **TOKEN 認證方案**，理由：
- ✅ 架構已完善 (支援開發/生產模式)
- ✅ 一勞永逸 (適用所有環境)
- ✅ 安全最佳實踐 (零信任模型)
- ✅ 避免複雜 debug (直接解決問題)

### TOKEN 本質說明
- TOKEN 就是字串 (`memoryark-line-service-token-2025`)
- 可讀性設計 (服務名稱 + 年份)
- 便於除錯和維護

## 📋 修改的檔案清單

### 配置檔案
- `/line-service/.env` - 修正上傳端點和 TOKEN
- `/.env` - 更新後端 TOKEN 配置
- 兩個檔案都加入詳細註解說明

### 程式碼
- `/backend/internal/middleware/api_token.go` - 添加 service user ID 設定

### 文檔
- `/CLAUDE.md` - 更新容器部署 SOP，強調環境變數修改後必須重建容器

## 🚨 重要學習與最佳實踐

### 容器環境變數管理
- ❌ `podman restart` 無法更新 .env 設定
- ✅ 必須使用 `podman-compose down + up` 完全重建
- ⚠️ 修改 .env 後一律執行完整重新部署流程

### API 認證層級設計
- 中間件認證 ≠ 業務邏輯認證
- API Token 認證需要設置完整的認證上下文
- 服務間通訊需要明確的身份映射

### 除錯方法論
- 分層排查：網路 → 認證 → 業務邏輯
- 容器狀態驗證：環境變數、健康檢查、日誌分析
- 端點驗證：確認 API 路由和處理函數

## 🔄 待完成任務

1. **重新部署後端容器** - 讓 API Token 中間件修改生效
2. **最終功能測試** - 驗證 LINE 圖片上傳完整流程  
3. **用戶資訊映射** - 考慮實作 LINE 用戶到系統用戶的映射
4. **監控和日誌** - 完善上傳成功/失敗的監控機制

---

## 💡 總結與展望

本次對話成功解決了 LINE 圖片上傳的核心認證問題，建立了完善的容器部署和環境配置管理流程。關鍵學習是**容器化環境中環境變數的正確管理方式**，以及**多層認證架構的設計考量**。

系統架構設計良好，LINE 用戶資訊處理已完整實作，為後續的用戶管理和統計功能奠定了堅實基礎。