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
- Windows 11 設計語言標準
- TypeScript 類型安全要求
- RESTful API 設計標準

## 開發規範

### 代碼標準
- 使用 TypeScript 嚴格模式，確保完整類型定義
- 遵循 Windows 11 設計語言，使用 `@/components/ui/` 組件系統
- 所有組件放在 `src/components/ui/[component-name]/` 目錄
- 使用 Tailwind CSS 實現樣式，遵循教會配色方案（深藍+金色）

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
**設計語言**：Windows 11 Files 應用風格
**目標用戶**：真耶穌教會成員
**部署環境**：https://files.94work.net/

## 重要提醒
- 始終以 SPECIFICATION.md 為準則
- 保持代碼品質和系統安全性
- 維護 Windows 11 設計一致性
- 及時記錄變更和影響