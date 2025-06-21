# FilesView 重構計畫

## 🎯 目標
將複雜的 FilesView.vue (1600+ 行) 拆分為更小、更可維護的組件，並簡化導航邏輯。

## 📊 現狀分析

### 問題點
1. **單一檔案過大**：FilesView.vue 包含太多職責
2. **雙重路由模式**：ID 模式和路徑模式並存
3. **狀態管理複雜**：URL、Store、Cache 三層同步
4. **導航邏輯重複**：多處處理相似的導航邏輯

### 優勢
1. 已是標準 SPA 架構
2. 快取系統完整
3. 響應式設計完善
4. 功能豐富完整

## 🏗️ 重構架構

### 組件拆分計畫

```
FilesView.vue (主容器)
├── components/
│   ├── FileNavigation/
│   │   ├── FileBreadcrumb.vue      # 麵包屑導航
│   │   ├── FileSidebar.vue         # 側邊欄（桌面版）
│   │   └── FileMobileNav.vue       # 底部導航（手機版）
│   │
│   ├── FileContent/
│   │   ├── FileGrid.vue            # 網格視圖
│   │   ├── FileList.vue            # 列表視圖
│   │   ├── FileEmpty.vue           # 空狀態
│   │   └── FileLoading.vue         # 載入狀態
│   │
│   ├── FileOperations/
│   │   ├── FileToolbar.vue         # 工具列
│   │   ├── FileUploadZone.vue      # 拖放上傳區
│   │   ├── FileContextMenu.vue     # 右鍵選單
│   │   └── FileSelectionBar.vue    # 多選操作列
│   │
│   └── FileDialogs/
│       ├── FilePreview.vue         # 檔案預覽
│       ├── FileRename.vue          # 重命名對話框
│       ├── FileMove.vue            # 移動對話框
│       └── FileDelete.vue          # 刪除確認
```

### 統一導航方案

**選擇：路徑模式（更直觀）**
- 捨棄：`/files/folder/:folderId`
- 採用：`/files/:pathMatch*`
- 範例：`/files/documents/2024/reports`

**優點：**
1. URL 更易讀
2. 支援深層導航
3. 與檔案系統概念一致
4. 便於分享和書籤

### 狀態管理簡化

**現有三層：**
1. URL 參數（路由）
2. Pinia Store（狀態）
3. Worker Cache（快取）

**簡化方案：**
```typescript
// 單一資料流向
URL (真實來源) 
  → Store (衍生狀態) 
  → Cache (性能優化)

// 導航統一入口
navigateToPath(path: string) {
  // 1. 更新路由
  router.push(`/files/${path}`)
  // 2. Store 自動響應路由變化
  // 3. Cache 自動預載
}
```

## 📋 執行步驟

### Phase 1: 準備工作（Day 1）
- [ ] 建立組件目錄結構
- [ ] 定義共用介面和類型
- [ ] 建立組件間通訊機制

### Phase 2: 拆分導航組件（Day 2-3）
- [ ] 提取 FileBreadcrumb
- [ ] 提取 FileSidebar
- [ ] 提取 FileMobileNav
- [ ] 統一導航事件處理

### Phase 3: 拆分內容組件（Day 4-5）
- [ ] 提取 FileGrid
- [ ] 提取 FileList
- [ ] 提取 FileEmpty
- [ ] 提取 FileLoading

### Phase 4: 拆分操作組件（Day 6-7）
- [ ] 提取 FileToolbar
- [ ] 提取 FileUploadZone
- [ ] 提取 FileContextMenu
- [ ] 提取 FileSelectionBar

### Phase 5: 整合測試（Day 8-9）
- [ ] 整合所有組件
- [ ] 移除舊路由模式
- [ ] 測試各種場景
- [ ] 性能優化

### Phase 6: 收尾工作（Day 10）
- [ ] 更新文檔
- [ ] 清理舊代碼
- [ ] 部署測試

## 🚀 實施策略

### 漸進式重構
1. **保持功能完整**：每次只重構一個部分
2. **持續可用**：確保應用始終可正常使用
3. **回退機制**：保留原始檔案備份

### 風險控制
1. **版本控制**：每個階段建立 git tag
2. **測試覆蓋**：為新組件編寫單元測試
3. **用戶測試**：邀請管理員測試關鍵功能

## 📊 預期成果

### 可維護性提升
- 單一組件不超過 300 行
- 職責單一，易於理解
- 便於團隊協作

### 性能改善
- 組件懶加載
- 更精確的更新範圍
- 減少不必要的重渲染

### 開發體驗
- 更快的熱重載
- 更容易定位問題
- 更方便添加新功能

## 🔄 後續優化

### 短期（1-2 週）
- 添加組件級快取
- 優化虛擬滾動
- 改進鍵盤導航

### 中期（1-2 月）
- 實現離線模式
- 添加批量操作
- 優化大量檔案性能

### 長期（3-6 月）
- 插件化架構
- 自定義視圖
- AI 輔助整理

## 📝 注意事項

1. **保持 API 相容**：不更改後端介面
2. **漸進增強**：優先保證基本功能
3. **響應式優先**：確保手機體驗
4. **無障礙設計**：保持鍵盤和螢幕閱讀器支援

---

*最後更新：2025-06-20*
*負責人：AI 助理 + 管理員團隊*