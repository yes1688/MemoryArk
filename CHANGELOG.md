# MemoryArk 2.0 變更記錄

所有重要的專案變更都會記錄在此文件中。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
並且本專案遵循 [語義化版本控制](https://semver.org/lang/zh-TW/)。

## [未發布]

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
