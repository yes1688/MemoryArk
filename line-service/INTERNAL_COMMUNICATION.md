# LINE Service 內部通訊配置

## 🔗 內部容器直接通訊

LINE Service 與 MemoryArk 後端服務使用內部容器網路進行直接通訊，無需額外的 token 認證層。

## 📋 配置說明

### 環境變數設定

```bash
# MemoryArk 整合設定 (內部容器直接通訊)
MEMORYARK_API_URL=http://backend:8081
MEMORYARK_API_TOKEN=                      # 留空表示使用內部通訊
MEMORYARK_UPLOAD_ENDPOINT=/api/photos/upload
```

### 網路架構

```
┌─────────────────┐    內部網路     ┌──────────────────┐
│   LINE Service  │ ──────────────► │  MemoryArk 後端   │
│   (port 3000)   │    直接通訊     │   (port 8081)    │
└─────────────────┘                 └──────────────────┘
```

## 🛠️ 技術實現

### API 客戶端配置

- **無 Token 模式**: 當 `MEMORYARK_API_TOKEN` 為空時，不發送 Authorization 標頭
- **Token 模式**: 當設定 Token 時，自動加入 `Authorization: Bearer {token}` 標頭
- **自動切換**: 代碼會根據 Token 存在與否自動調整請求標頭

### 健康檢查端點

LINE Service 會嘗試連接以下端點進行健康檢查：
1. `/health`
2. `/api/health` 
3. `/status`

## 🔒 安全考量

### 內部網路安全

- ✅ **網路隔離**: 服務間通訊限制在內部容器網路
- ✅ **無公開端口**: 後端服務不直接暴露到外部網路
- ✅ **容器命名**: 使用容器名稱 (`backend`) 而非 IP 位址

### 外部存取控制

- 🔒 **LINE Webhook**: 僅接受來自 LINE 平台的請求
- 🔒 **Nginx 代理**: 透過 Nginx 控制外部存取
- 🔒 **簽名驗證**: LINE Webhook 請求必須通過簽名驗證

## 📊 監控與日誌

### 連線狀態記錄

```typescript
// 啟動時會顯示通訊模式
if (config.memoryark.apiToken && config.memoryark.apiToken.trim()) {
  console.log('✅ Using API Token authentication for MemoryArk');
} else {
  console.log('🔗 Using internal container communication (no token)');
}
```

### API 呼叫日誌

```typescript
memoryArkLogger.info('MemoryArk API call', {
  endpoint,
  method,
  status,
  responseTime,
});
```

## 🚀 部署注意事項

1. **容器依賴**: LINE Service 需要等待後端服務啟動
2. **網路配置**: 確保所有服務在同一個 Docker 網路中
3. **健康檢查**: 服務啟動時會測試與後端的連線

## 🔄 切換回 Token 認證

如需切換回 Token 認證模式，只需設定環境變數：

```bash
MEMORYARK_API_TOKEN=your-api-token-here
```

服務會自動偵測並切換到 Token 認證模式。