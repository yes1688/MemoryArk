# MemoryArk 2.0 AI 助理指南

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
- **生產環境**：<https://files.94work.net/>
- **管理員**：<94work.net@gmail.com> (劉程維)
- **設計原則**：賈伯斯理念 + Apple HIG + Windows 11 Fluent Design

## 🔧 開發規範

- 使用 TypeScript 嚴格模式
- 組件放在 `src/components/ui/[component-name]/`
- API 共用優先，避免重複端點
- 使用 Tailwind CSS，教會配色（深藍+金色）
- 使用 TodoWrite 追蹤複雜任務

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