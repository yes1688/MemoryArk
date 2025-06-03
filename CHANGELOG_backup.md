# MemoryArk 2.0 變更記錄

所有重要的專案變更都會記錄在此文件中。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
並且本專案遵循 [語義化版本控制](https://semver.org/lang/zh-TW/)。

## [2025-06-02] 修復完成: 後端服務編譯錯誤和數據庫遷移

- 修復 file.go 中 userID 變量未使用的編譯錯誤，添加用戶權限控制
- 修復 auth.go 中未使用的 import
- 修復數據庫模型中 Phone 字段 NOT NULL 約束問題
- 後端服務成功啟動，所有 API 路由正常註冊
- ✅ 所有服務已準備就緒，可進行 Cloudflare Tunnels 部署

## [2025-06-02] 修復: 後端服務編譯錯誤和數據庫遷移問題

- 修復 `file.go` 中 userID 變量未使用的編譯錯誤，添加用戶權限控制
- 修復 `auth.go` 中未使用的 import (`time`, `memoryark/internal/auth`)
- 修復 `router.go` 中未使用的 userHandler 變量
- 修復數據庫模型中 Phone 字段 NOT NULL 約束導致的遷移錯誤
- 重新創建數據庫文件以解決模式衝突
- 後端服務成功啟動，所有 API 路由正常註冊

## [2025-06-02] 完成: MemoryArk 2.0 Cloudflare Tunnels 部署準備檢查

- ✅ 容器 memoryark-dev 正在運行 (Up 21+ hours)
- ✅ 前端服務 (端口 5173) 正常監聽和響應 (HTTP 200)
- ✅ 後端服務 (端口 7001) 正常監聽和響應 (HTTP 200)  
- ✅ API 健康檢查通過 (`{"status":"healthy","version":"2.0.0"}`)
- ✅ Cloudflare Tunnel 配置文件和部署腳本存在
- ✅ cloudflared 工具已安裝 (版本 2025.4.0)
- 🎉 所有服務已準備就緒，可進行 Cloudflare Tunnels 部署

## [2025-06-02] 添加: 部署狀態檢查腳本
- 創建 `check-deployment-status.sh` 自動化檢查腳本
- 提供完整的部署前狀態驗證
- 包含容器、端口、服務響應和配置文件檢查

## [2025-06-03] 已完成: NGINX 代理統一入口配置

### ✅ NGINX 代理配置成功
- **統一入口**: 端口 7001 作為容器唯一對外端口
- **前端代理**: `http://localhost:7001/` → 前端服務 (5173)
- **API 代理**: `http://localhost:7001/api/*` → 後端服務 (8080)
- **健康檢查**: `http://localhost:7001/nginx-health` → NGINX 狀態

### 🔧 修復內容
1. **容器內安裝 NGINX + Supervisor**
   - 在現有 `memoryark-dev` 容器中安裝 nginx 和 supervisor
   - 配置 supervisor 統一管理三個服務: nginx、frontend、backend

2. **後端配置調整**
   - 修改後端端口從 7001 → 8080 避免與 NGINX 衝突
   - 修復 `auth.go` 編譯錯誤（重複代碼、語法錯誤）
   - 添加缺失的類型定義: `LoginRequest`, `RefreshTokenRequest`
   - 添加 `auth` 包引用解決依賴問題

3. **NGINX 配置優化**
   - 移除 `try_files` 指令，直接代理所有非 API 請求到前端
   - 配置正確的上游服務器: frontend_dev (5173), backend_api (8080)
   - 添加安全標頭和 CORS 支持
   - 支援 WebSocket 和 Vite HMR

### 📊 服務狀態
- **NGINX**: 進程 7322 (master) + 7323 (worker) - 端口 7001 ✅
- **前端**: 進程 7277 (Vite) - 端口 5173 ✅ 
- **後端**: 進程 7297 (Go) - 端口 8080 ✅
- **Supervisor**: 進程 7127 (統一管理) ✅

### 🌐 訪問方式
- **Web 界面**: http://localhost:7001 (透過 NGINX 代理)
- **API 端點**: http://localhost:7001/api/* (透過 NGINX 代理)
- **健康檢查**: http://localhost:7001/nginx-health

### 🔗 Cloudflare Tunnels 準備狀況
- 容器已準備好通過 Cloudflare Tunnels 進行部署訪問
- 所有服務通過統一端口 7001 對外提供服務
- 適合透過隧道進行生產環境部署

## [未發布]

### 修復

- [2025-01-21] 修復 FilesView.vue 檔案截斷問題並重新整合完整功能
  - 使用 FilesView_new.vue 的完整內容重新創建 FilesView.vue
  - 修復 Files Store 與 API 之間的參數不匹配問題
  - 修正類型錯誤，包括 navigateToPath 方法的 null 值處理
  - 調整 API 調用以匹配實際的後端接口簽名
  - 確保檔案管理功能（上傳、創建資料夾、刪除、還原等）正常運作

### 新增

- 專案初始化和技術規格制定
- 雙層身份驗證系統設計（Cloudflare Access + 內部審核）
- 用戶註冊申請流程設計
- 技術架構設計（Vue 3 + Go + SQLite）
- 專案文檔結構建立

### 計劃中

- 後端 API 開發
- 前端界面開發
- 數據庫模式實現
- 認證系統實現

- 文件管理功能
- 媒體處理功能

## [0.1.0] - 2024-12-19

### 新增
- 專案技術規格文檔 (SPECIFICATION.md)
- 專案基礎文檔結構
- README.md 專案介紹
- CHANGELOG.md 變更記錄
- 貢獻指南架構

### 變更
- 確定技術堆疊：Vue 3 + TypeScript + Go + SQLite
- 設計雙層認證機制
- 規劃用戶管理流程

## [2025-06-02] 完成: 前後端完整開發環境建置

- **後端 Go 項目**: 成功建立完整的後端架構
  - 實現所有 API 處理器 (auth, user, file, admin, health)
  - 完成 GORM 模型定義 (User, File, UserRegistrationRequest, ActivityLog, MediaTask)
  - 建立 JWT 認證中介軟體
  - 實現日誌系統和配置管理
  - 修復 SQLite 驅動程序兼容性 (使用 github.com/glebarez/sqlite)
  - 修復所有欄位名稱和方法名稱問題
  - **✅ 後端編譯成功，可執行文件生成**

- **前端 Vue 3 項目**: 成功建立完整的前端架構
  - 實現所有核心組件 (FileCard, FileFilters, FileUploader)
  - 建立管理員組件 (AdminUsers, AdminRegistrations, AdminFiles, AdminStats)
  - 完成 Pinia 狀態管理 (auth, files stores)
  - 建立 API 服務層 (auth, files, admin)
  - 實現所有頁面視圖 (Home, Login, Register, Upload, Admin)
  - 配置 Tailwind CSS 樣式系統
  - 修復 PostCSS 配置 ES6 模組問題
  - **✅ 前端構建成功，開發服務器正常啟動**

- **開發環境**: 容器化開發環境完全就緒
  - **✅ 前端依賴安裝成功 (434 packages)**
  - **✅ 後端依賴安裝成功 (純 Go SQLite 驅動)**
  - **✅ 前端 Vite 開發服務器運行正常 (http://localhost:5173)**
  - **✅ 後端編譯生成可執行文件 (19MB)**

## [2025-06-02] Added: Podman 容器化開發環境

- 新增 Podman 開發環境配置 (Dockerfile.dev)
- 新增開發腳本 (scripts/dev-start.sh, dev-shell.sh, dev-stop.sh)
- 新增前後端初始化腳本 (scripts/init-backend.sh, init-frontend.sh)
- 新增 Makefile 簡化開發命令
- 新增 Podman 開發指南文檔 (docs/PODMAN_DEVELOPMENT.md)
- 更新 docker-compose.dev.yml 支援 Podman
- 更新 README.md 優先推薦容器化開發流程

---

## 變更類型說明

- **新增** - 新功能
- **變更** - 現有功能的變更
- **棄用** - 即將移除的功能
- **移除** - 已移除的功能
- **修復** - 錯誤修復
- **安全** - 安全性相關變更
