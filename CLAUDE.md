# MemoryArk AI 助理指南

## 🚨 絕對禁令 (必須遵守)

- 🚫 **禁止刪除數據**：永不建議 `rm -rf data/*` 或 `DROP DATABASE`
- 🚫 **禁止跳過認證**：遇到 Cloudflare Access 必須修復，不得繞過
- 🚫 **禁止假數據**：所有統計必須基於真實 API 響應

## ✅ 強制操作流程

1. **容器部署**：修改後執行 `podman-compose down && podman-compose up -d`
2. **前端建構**：在 host 執行 `npm run build`，產生 `dist/` 供容器使用
3. **認證問題**：必須完整修復，不可繞過或停用 Cloudflare Access
4. **數據安全**：任何涉及數據變更前先評估風險

## 📁 專案基本資訊

- **技術棧**：Vue 3 + TypeScript + Go + SQLite + Podman
- **生產環境**：內部私有部署
- **管理員**：<94work.net@gmail.com> (劉程維)
- **設計原則**：賈伯斯理念 + Apple HIG + Windows 11 Fluent Design

## 🔧 開發規範

- 使用 TypeScript 嚴格模式
- 組件放在 `src/components/ui/[component-name]/`
- API 共用優先，避免重複端點
- 使用 Tailwind CSS，教會配色（深藍+金色）
- 使用 TodoWrite 追蹤複雜任務

## 🚀 並行開發協調 (2025-06-19 新增)

### 📋 任務分配原則
- 查看 `CACHE_OPTIMIZATION_PARALLEL_PLAN.md` 了解所有可執行任務
- 查看 `TASK_COORDINATION.md` 了解當前任務狀態和認領情況
- 每個任務都是獨立的，可以並行執行
- 任務間有明確的依賴關係，按階段進行

### 🔄 協作流程
1. **認領任務**: 在 `TASK_COORDINATION.md` 更新負責者和狀態
2. **開始工作**: 按照任務文檔中的具體步驟執行
3. **提交更改**: 完成後立即提交，避免衝突
4. **更新狀態**: 在協調文檔中標記任務完成
5. **通知下游**: 如有依賴任務，通知可以開始

### 📁 關鍵檔案分工
- `frontend/src/stores/files.ts`: Task 1, 3, 5 主要修改
- `frontend/src/workers/`: Task 6, 10, 11 專用目錄
- `frontend/src/composables/`: Task 7 專用目錄
- `frontend/src/types/`: Task 2, 6 類型定義
- `frontend/tests/`: Task 12, 13 測試檔案

### 🚨 衝突預防
- 每個任務操作的檔案已明確分離
- 如需修改共同檔案，請在此記錄變更
- 重大架構變更需要團隊討論

### 📊 當前狀態追蹤
請參考 `TASK_COORDINATION.md` 了解最新任務分配狀態

## 🐳 容器管理

- **強制使用 Podman**：安全性優於 Docker
- **開發環境**：所有服務都在容器中運行
- **數據目錄**：`data/`（資料庫）、`uploads/`（檔案）- 極度珍貴！

## 🚨 慘痛教訓 (2025-06-10)

**AI 差點建議 `rm -rf data/*`**，會導致：

- 所有用戶資料全部消失
- 檔案中繼資料完全清空  
- 分享連結全部失效
- 雖然 `uploads/` 保留，但系統顯示完全空白

**感謝用戶 <94work.net@gmail.com> 及時制止災難！**

---

數據完整性 > 技術便利性 > 開發效率