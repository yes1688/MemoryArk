# MemoryArk 2.0 AI 助理遵循指南

## 核心遵循原則

### 規格書優先原則
在執行任何任務前，必須先檢查 `SPECIFICATION.md` 規格書：

1. **衝突檢查**：驗證任務是否與規格書中的設計原則、技術標準或功能定義衝突
2. **影響評估**：分析變更對系統架構、安全性、用戶體驗的潛在影響
3. **衝突警告**：若發現衝突，明確告知用戶並提供替代方案
4. **確認機制**：等待用戶確認後才能執行可能有衝突的變更
5. **文檔更新**：執行變更後必須同步更新規格書和 CHANGELOG.md

### 核心不可變原則
以下項目為專案核心，除非有重大業務需求否則不應修改：
- 安全認證架構（雙層認證機制）
- 資料隱私保護機制
- 賈伯斯設計理念融合 Apple + Windows 設計標準
- TypeScript 類型安全要求
- RESTful API 設計標準
- **真實數據原則**：絕對禁止使用假數據或硬編碼統計

## 開發規範

### 代碼標準
- 使用 TypeScript 嚴格模式，確保完整類型定義
- 遵循賈伯斯設計理念：簡潔優雅、完美細節、直觀操作
- 融合 Apple Human Interface Guidelines 和 Windows 11 Fluent Design
- 所有組件放在 `src/components/ui/[component-name]/` 目錄
- 使用 Tailwind CSS 實現樣式，遵循教會配色方案（深藍+金色）

### 數據整合標準
- **絕對禁止假數據**：所有統計數據必須基於真實 API 響應
- **統一數據源**：使用 `useFilesStore()` 作為檔案數據唯一來源
- **動態計算**：所有統計採用 computed 屬性動態計算，確保即時性
- **分類標準**：使用 `categoryId` 而非 `category` 或 `isShared` 進行分類
- **時間統計**：基於 `createdAt` 和 `updatedAt` 進行時間相關統計

### 建構和測試
- 每次修改後必須執行 `npm run build` 檢查 TypeScript 錯誤
- 修復所有編譯錯誤後才能提交代碼
- 使用 TodoWrite 工具管理和追蹤任務進度

### 任務執行流程
1. 使用 TodoWrite 規劃複雜任務
2. 檢查 SPECIFICATION.md 是否有衝突
3. 實施變更並測試
4. 更新相關文檔（如有規格變更）
5. 標記任務完成並繼續下一項

## 專案資訊

**專案名稱**：MemoryArk 2.0 - 教會影音回憶錄系統
**技術架構**：Vue 3 + TypeScript + Tailwind CSS + Go + SQLite
**設計語言**：賈伯斯理念 + Apple HIG + Windows 11 Fluent Design
**目標用戶**：真耶穌教會成員
**部署環境**：https://files.94work.net/

## 重要提醒
- 始終以 SPECIFICATION.md 為準則
- 保持代碼品質和系統安全性
- 維護賈伯斯設計理念的一致性
- 及時記錄變更和影響
- **數據完整性**：所有統計必須反映真實系統狀態

## 已完成的重大改進

### v2.0.1 - 真實數據整合 (2025-01-08)
- ✅ **HomeView.vue** - 主頁統計改為真實計算
- ✅ **WelcomeHeader.vue** - 歡迎組件使用 filesStore 數據
- ✅ **RecentFilesWidget.vue** - 最近檔案改為真實檔案記錄
- ✅ **StorageStatsWidget.vue** - 儲存統計基於真實檔案大小
- ✅ **SharedFolderView.vue** - 共享資料夾使用 categoryId 分類
- ✅ **SabbathDataView.vue** - 安息日數據基於真實檔案和日期
- ✅ **AppAccessHistory.vue** - 訪問歷史轉換為真實檔案記錄
- ✅ **TypeScript 修復** - 所有屬性名稱統一為正確格式

### v2.0.0 - 設計美學革新 (2025-01-07)
- ✅ **賈伯斯設計理念** - 完美細節、簡潔優雅、情感連接
- ✅ **Apple + Windows 融合** - 創新的雙系統設計語言
- ✅ **組件系統重構** - 基於 Tailwind 的完整 UI 組件庫
- ✅ **用戶體驗優化** - 直觀操作、溫馨界面、響應式設計