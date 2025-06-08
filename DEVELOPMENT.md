# 開發者模式設定指南

## 概述

為了避免 Cloudflare Tunnel 不穩定的影響，本專案支援開發者模式，讓開發者可以直接使用 `http://localhost:7001` 進行開發和測試。

## 配置

### 環境變數設定

在 `.env` 檔案中設定以下變數：

```bash
# 開發者模式設定
DEVELOPMENT_MODE=true
DEV_AUTO_LOGIN_EMAIL=94work.net@gmail.com
DEV_BYPASS_AUTH=true
DEV_CORS_ENABLED=true
```

### 變數說明

- `DEVELOPMENT_MODE=true`: 啟用開發者模式
- `DEV_AUTO_LOGIN_EMAIL`: 開發模式下自動登入的管理員郵箱
- `DEV_BYPASS_AUTH=true`: 跳過所有身份認證檢查
- `DEV_CORS_ENABLED=true`: 啟用寬鬆的 CORS 設定

## 功能特性

### 1. 身份認證繞過
- 開發模式下直接獲得管理員權限
- 不需要 Cloudflare Access 標頭
- 自動設定用戶 ID、郵箱、角色為管理員

### 2. CORS 支援
- 開發模式下啟用寬鬆的 CORS 設定
- 支援所有 HTTP 方法
- 允許跨域請求

### 3. 管理員權限
- 自動獲得系統管理員權限
- 可以存取所有 API 端點
- 無需額外的權限檢查

## 使用方式

### 1. 啟動開發模式

```bash
# 確保 .env 中已設定開發模式
DEVELOPMENT_MODE=true

# 重新建置並啟動容器
podman-compose up -d --build
```

### 2. 存取系統

直接在瀏覽器中開啟：
```
http://localhost:7001
```

### 3. 測試功能

- ✅ 檔案管理
- ✅ 資料夾導航
- ✅ 檔案上傳
- ✅ 系統管理
- ✅ 用戶管理

## 安全注意事項

⚠️ **重要警告**

開發者模式會跳過所有安全檢查，僅適用於開發環境。

### 生產部署前務必：

1. 設定 `DEVELOPMENT_MODE=false`
2. 確保 Cloudflare Access 正常運作
3. 檢查所有安全設定

## 故障排除

### 問題 1: 無法存取 localhost:7001
```bash
# 檢查容器狀態
podman ps

# 檢查端口映射
podman port memoryark2_nginx_1

# 檢查服務響應
curl http://localhost:7001
```

### 問題 2: 權限不足
確認 `.env` 中的設定：
```bash
DEVELOPMENT_MODE=true
DEV_BYPASS_AUTH=true
```

### 問題 3: CORS 錯誤
確認 CORS 設定：
```bash
DEV_CORS_ENABLED=true
```

## 開發工作流程

1. **設定開發模式**: 確保 `.env` 中啟用開發模式
2. **建置容器**: `podman-compose up -d --build`
3. **開發測試**: 使用 `http://localhost:7001`
4. **功能驗證**: 測試資料夾導航和檔案上傳
5. **提交變更**: 確保程式碼品質
6. **部署準備**: 停用開發模式

---

**最後更新**: 2025-06-09
**版本**: MemoryArk 2.0