# LINE 信徒照片上傳功能 - 文檔總覽

## 📁 文檔結構

本資料夾包含 MemoryArk2 教會管理系統整合 LINE Bot 照片上傳功能的完整文檔。

### 🎯 核心文檔

#### 1. 架構設計
- **`LINE_PHOTO_ARCHITECTURE_ANALYSIS.md`** - 三種架構方案分析比較
- **`LINE_SERVICE_NODEJS_RATIONALE.md`** - Node.js 技術選擇詳細說明

#### 2. 實作指南
- **`LINE_PHOTO_COMPLETE_IMPLEMENTATION_GUIDE.md`** - 完整實作步驟和程式碼
- **`LINE_SERVICE_CLEANUP_IMPLEMENTATION.md`** - Redis 隊列自動清理機制

#### 3. 資料庫設計
- **`LINE_COMPLETE_DATABASE_DESIGN.md`** - 完整的 7 張資料表設計
- **`LINE_DATABASE_MIGRATION_PLAN.md`** - 資料庫遷移和關聯表方案
- **`UUID_V7_ANALYSIS.md`** - UUID v7 作為主鍵的技術分析

#### 4. 管理界面
- **`LINE_ADMIN_FILE_MANAGEMENT.md`** - 管理員檔案管理界面設計

## 🚀 快速開始

### 閱讀順序建議

1. **了解架構** → `LINE_PHOTO_ARCHITECTURE_ANALYSIS.md`
2. **技術選型** → `LINE_SERVICE_NODEJS_RATIONALE.md`
3. **資料庫設計** → `LINE_COMPLETE_DATABASE_DESIGN.md`
4. **完整實作** → `LINE_PHOTO_COMPLETE_IMPLEMENTATION_GUIDE.md`
5. **清理機制** → `LINE_SERVICE_CLEANUP_IMPLEMENTATION.md`
6. **管理界面** → `LINE_ADMIN_FILE_MANAGEMENT.md`

### 關鍵決策摘要

| 項目 | 選擇方案 | 理由 |
|------|---------|------|
| **系統架構** | 新增 Node.js 容器 | 平衡隔離性與資源共享 |
| **主鍵設計** | UUID v7 | 時間排序 + 分散式友善 |
| **資料庫管理** | Go 統一遷移管理 | 架構一致性與安全性 |
| **清理機制** | node-cron + 容器生命週期 | 自動化與可靠性 |
| **檔案組織** | 按用戶分類的虛擬路徑 | 便於管理和檢索 |

## 🏗️ 系統架構總覽

```
┌─────────────────┐    HTTPS     ┌─────────────────────────────────┐
│   LINE 平台     │──Webhook────►│        MemoryArk2 System        │
└─────────────────┘              │  ┌─────────────┐ ┌─────────────┐│
                                 │  │LINE Service │ │   Backend   ││
                                 │  │(Node.js)    │ │   (Golang)  ││
                                 │  │Port: 3000   │ │  Port: 8081 ││
                                 │  └─────────────┘ └─────────────┘│
                                 │         │               │       │
                                 │         └───────────────┘       │
                                 │                ▼                │
                                 │    ┌─────────────────────┐     │
                                 │    │  Shared Storage     │     │
                                 │    │  • SQLite DB        │     │
                                 │    │  • File Uploads     │     │
                                 │    │  • Redis Queue      │     │
                                 │    └─────────────────────┘     │
                                 └─────────────────────────────────┘
```

## 📊 資料庫設計概覽

### 核心資料表 (7 張)

1. **`line_upload_records`** - 主要上傳記錄 (UUID v7 主鍵)
2. **`line_users`** - LINE 用戶資訊
3. **`line_groups`** - LINE 群組資訊  
4. **`line_group_members`** - 群組成員關聯
5. **`line_webhook_logs`** - Webhook 事件日誌
6. **`line_settings`** - 系統設定
7. **`line_upload_stats`** - 統計快取表

### 檔案組織結構

```
/LINE信徒上傳/
├── 個人上傳/
│   ├── 張三 (LINE_U123456789)/
│   │   ├── 2024-06/ → 主日聚會照片
│   │   └── 2024-07/ → 夏令營照片
│   └── 李四 (LINE_U987654321)/
└── 群組上傳/
    ├── 青年團契群組/
    └── 長老會議群組/
```

## 🔧 技術棧

| 組件 | 技術 | 說明 |
|------|------|------|
| LINE Service | Node.js 20 + TypeScript | Webhook 處理與 API 整合 |
| Web 框架 | Express.js 4.x | 輕量高效的 HTTP 伺服器 |
| LINE SDK | @line/bot-sdk 9.9.0 | 官方 SDK，功能完整 |
| 任務隊列 | Bull + Redis 7.x | 非同步處理照片下載 |
| 清理機制 | node-cron | 定時清理 Redis 隊列 |
| 容器化 | Docker/Podman | 與主系統統一容器架構 |
| 主鍵設計 | UUID v7 | 時間排序 + 全域唯一 |
| 資料庫管理 | Go + GORM | 統一遷移管理 |

## 📅 開發時程

| 階段 | 任務 | 預估時間 |
|------|------|---------|
| Week 1 | 環境建置 + 資料庫遷移 | 3-4 天 |
| Week 2 | LINE Service 核心開發 | 5-6 天 |
| Week 3 | MemoryArk 整合測試 | 4-5 天 |
| Week 4 | 管理界面開發 | 4-5 天 |
| Week 5 | 部署配置與優化 | 3-4 天 |

## 🎯 功能特色

### ✅ 核心功能
- 接收 LINE 用戶上傳的照片
- 自動下載並儲存到 MemoryArk2
- 按用戶和群組分類管理
- 管理員檔案管理界面
- 完整的統計和監控

### 🛡️ 安全特性
- Webhook 簽章驗證
- 檔案類型白名單
- 內部 API 認證
- 容器網路隔離

### ⚡ 效能優化
- Redis 任務隊列
- 並發處理控制
- 自動清理機制
- 統計資料快取

## 📞 支援

如有疑問，請參考各個文檔的詳細說明，或聯繫開發團隊。

---

**版本**: 1.0  
**更新日期**: 2024-06-24  
**適用系統**: MemoryArk2 教會管理系統