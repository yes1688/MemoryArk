# MemoryArk 2.0 專案指南

## 專案概述
MemoryArk 2.0 是真耶穌教會的媒體管理系統，使用 Vue 3 + TypeScript + Tailwind CSS 構建現代化的檔案管理界面。

## 開發規則

### 任務管理規則
1. **任務完成後必須更新文件勾核清單**
   - 完成任務時，必須更新 `docs/tasks/` 下對應任務文件的勾核清單
   - 更新總任務清單 `docs/tasks/README.md` 的進度追蹤
   - 更新主要任務清單 `docs/tasks/UI_REDESIGN_TASKS.md` 的狀態

2. **任務完成後自動繼續下一階段任務**
   - 完成當前任務後，自動開始執行下一個待辦任務
   - 按照優先級順序執行：高 → 中 → 低
   - 使用 TodoWrite 工具更新任務狀態

### 代碼規範
1. **使用新的 UI 組件系統**
   - 所有新功能必須使用 `@/components/ui/` 下的組件
   - 遵循 Windows 11 設計語言
   - 使用 TypeScript 確保類型安全

2. **文件結構**
   - 組件放在 `src/components/ui/[component-name]/`
   - 每個組件資料夾包含 `App[ComponentName].vue`
   - 在 `src/components/ui/index.ts` 統一導出

3. **樣式規範**
   - 使用 Tailwind CSS 類別
   - 遵循教會配色方案（主色：深藍、次色：金色）
   - 使用 `rounded-win11` 等自定義樣式

### 測試和建構
1. **每次修改後必須執行建構**
   - 使用 `npm run build` 檢查 TypeScript 錯誤
   - 修復所有編譯錯誤後才能提交

2. **漸進式開發**
   - 先實作核心功能，再增加進階功能
   - 每個子任務完成後立即測試和建構

## 當前任務狀態

### 已完成任務
- ✅ 任務 001：建立設計系統基礎
- ✅ 任務 002：重構檔案管理界面
  - ✅ 拖放功能（AppDropZone, AppFileDragger）
  - ✅ 檔案預覽功能（AppFilePreview）
  - ✅ 進階搜尋篩選（AppSearchFilter）
- ✅ 任務 003：建立教會特色功能
  - ✅ 共享資料夾頁面（SharedFolderView）
  - ✅ 安息日資料專區（SabbathDataView）
  - ✅ 教會分類和配色系統
  - ✅ 共享資源組件（SharedResourceCard/Item）
  - ✅ 安息日檔案組件（SabbathFileCard/Item）
- ✅ 任務 004：實作進階功能（2025-01-07 完成）
  - ✅ 標籤系統（AppTagManager）- 支援建立、搜尋、分類標籤
  - ✅ 收藏功能（AppFavoriteManager）- 支援收藏夾分類管理
  - ✅ 最近訪問記錄（AppAccessHistory）- 時間分組顯示和清除功能
  - ✅ 分享連結生成（AppShareLinkGenerator）- 支援過期時間、密碼保護、下載限制
  - ✅ FileCard 整合所有進階功能（標籤、收藏、分享）
- ✅ 任務 005：重新設計首頁（2025-01-07 完成）
  - ✅ 歡迎頭部（WelcomeHeader）- 個人化問候、統計資訊、教會資訊
  - ✅ 快速操作區（QuickActions）- 上傳、新建資料夾、共享、安息日資料
  - ✅ 最近檔案小工具（RecentFilesWidget）- 多視圖模式、時間分組
  - ✅ 儲存空間統計（StorageStatsWidget）- 圓形進度圖、類型分布、警告
  - ✅ 快速訪問資料夾、我的收藏、訪問記錄整合

### 進行中任務
**無**

### 待執行任務
- 🔄 任務 006：優化視覺效果（下一個任務）
- 任務 007：整合和測試

## 重要提醒
- 每次完成任務時，請同步更新所有相關文件的勾核清單
- 自動繼續執行下一個優先任務
- 保持代碼品質和 Windows 11 設計一致性