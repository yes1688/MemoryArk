# MemoryArk2 檔案重命名與移動功能需求評估報告

> 建立日期：2025-01-21  
> 評估人員：Claude AI Assistant  
> 版本：1.0

## 📋 執行摘要

本報告評估在 MemoryArk2 系統中實現檔案/資料夾重命名與移動功能的需求。經過深入分析，發現系統已有基礎框架但實現不完整，存在安全性和資料一致性問題。

### 關鍵發現：
- ✅ API 端點已定義但實現不完整
- ❌ 前端 UI 功能完全缺失
- ⚠️ 後端缺少權限檢查和輸入驗證
- ⚠️ 資料一致性維護機制不足

## 🎯 需求定義

### 1. 功能需求

#### 1.1 檔案/資料夾重命名
- **使用者故事**：作為使用者，我想要能夠修改檔案或資料夾的名稱，以便更好地組織我的檔案
- **接受條件**：
  - 支援右鍵選單和快捷鍵（F2）觸發
  - 支援內聯編輯或彈窗編輯
  - 即時顯示名稱變更
  - 保留檔案副檔名

#### 1.2 檔案/資料夾移動
- **使用者故事**：作為使用者，我想要能夠將檔案或資料夾移動到不同位置，以便重新組織檔案結構
- **接受條件**：
  - 支援拖放操作
  - 支援剪下/貼上操作
  - 提供資料夾選擇器介面
  - 支援批量移動

### 2. 非功能需求

#### 2.1 安全性需求
- 只有檔案擁有者和管理員可以重命名/移動
- 防止 SQL 注入和路徑遍歷攻擊
- 記錄所有操作的審計日誌

#### 2.2 效能需求
- 重命名操作應在 500ms 內完成
- 移動操作應在 1 秒內完成（不含大量子項目）
- 支援批量操作時的進度顯示

#### 2.3 可用性需求
- 操作失敗時提供清晰的錯誤訊息
- 支援撤銷操作（至少一步）
- 保持檔案選擇狀態

## 🔍 現況分析

### 1. 前端現況

| 組件/功能 | 現況 | 缺失項目 |
|---------|------|---------|
| FilesView.vue | 有基礎檔案列表 | 缺少重命名/移動的事件處理 |
| ContextMenu.vue | 有重命名選項 | 沒有實際功能實現 |
| API 客戶端 | 已定義端點 | 缺少錯誤處理和狀態管理 |
| UI 組件 | 無 | 需要重命名彈窗、資料夾選擇器 |

### 2. 後端現況

| API 端點 | 現況 | 問題 |
|---------|------|------|
| PUT /folders/:id/rename | 基礎實現 | 缺少權限檢查、輸入驗證 |
| PUT /folders/:id/move | 基礎實現 | 缺少目標驗證、循環檢查 |

### 3. 資料庫結構

當前資料庫結構支援功能實現，但需要注意：
- `virtual_path` 欄位需要在操作時更新
- 資料夾操作需要遞迴更新所有子項目
- 需要防止移動操作造成的循環引用

## 💡 技術方案

### 1. 前端實現方案

#### 1.1 重命名功能
```typescript
// 方案一：內聯編輯（推薦）
interface RenameState {
  isRenaming: boolean
  editingFileId: string | null
  originalName: string
  newName: string
}

// 方案二：彈窗編輯
interface RenameModalProps {
  file: FileItem
  onConfirm: (newName: string) => Promise<void>
  onCancel: () => void
}
```

#### 1.2 移動功能
```typescript
// 資料夾選擇器組件
interface FolderSelectorProps {
  currentFolderId: string
  excludeFolderIds: string[] // 防止循環
  onSelect: (folderId: string) => void
}

// 拖放支援
interface DragDropState {
  isDragging: boolean
  draggedItems: FileItem[]
  dropTarget: string | null
}
```

### 2. 後端改進方案

#### 2.1 權限檢查
```go
func (h *FileHandler) checkFilePermission(c *gin.Context, fileID string) (*models.File, error) {
    userID := c.GetString("user_id")
    userRole := c.GetString("user_role")
    
    var file models.File
    if err := h.db.First(&file, fileID).Error; err != nil {
        return nil, err
    }
    
    // 檢查是否為擁有者或管理員
    if file.UploadedBy != userID && userRole != "admin" {
        return nil, errors.New("permission denied")
    }
    
    return &file, nil
}
```

#### 2.2 輸入驗證
```go
func validateFileName(name string) error {
    // 檢查檔名長度
    if len(name) == 0 || len(name) > 255 {
        return errors.New("invalid file name length")
    }
    
    // 檢查非法字元
    invalidChars := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
    for _, char := range invalidChars {
        if strings.Contains(name, char) {
            return fmt.Errorf("file name contains invalid character: %s", char)
        }
    }
    
    return nil
}
```

#### 2.3 循環檢查
```go
func (h *FileHandler) checkCircularReference(fileID, targetID string) error {
    // 遞迴檢查目標資料夾是否為當前資料夾的子資料夾
    // 實現細節...
}
```

### 3. 資料一致性方案

#### 3.1 Virtual Path 更新
```go
func (h *FileHandler) updateVirtualPaths(file *models.File, newPath string) error {
    // 1. 更新當前檔案/資料夾的虛擬路徑
    // 2. 如果是資料夾，遞迴更新所有子項目
    // 3. 使用事務確保原子性
}
```

## 📊 風險評估

### 高風險項目
1. **資料遺失風險**：操作失敗可能導致檔案"消失"
   - 緩解措施：使用資料庫事務、實現軟刪除
   
2. **權限洩露風險**：未經授權的檔案存取
   - 緩解措施：嚴格的權限檢查、審計日誌

### 中風險項目
1. **效能問題**：大量檔案的資料夾移動
   - 緩解措施：批量更新、背景任務

2. **使用者體驗**：操作不直觀
   - 緩解措施：清晰的 UI 提示、操作確認

## 📅 實施計畫

### 第一階段：基礎功能（1-2 週）
1. **後端安全加固**
   - 實現完整的權限檢查
   - 添加輸入驗證
   - 修復 virtual_path 更新

2. **前端基礎 UI**
   - 實現重命名內聯編輯
   - 處理 ContextMenu 事件
   - 基礎錯誤處理

### 第二階段：進階功能（1-2 週）
1. **移動功能**
   - 資料夾選擇器組件
   - 拖放支援
   - 批量操作

2. **使用者體驗優化**
   - 操作確認對話框
   - 撤銷功能
   - 進度指示器

### 第三階段：測試與優化（1 週）
1. **測試覆蓋**
   - 單元測試
   - 整合測試
   - 效能測試

2. **文檔更新**
   - API 文檔
   - 使用者指南

## 🎯 建議優先順序

基於現有系統狀況和風險評估，建議按以下順序實施：

1. **立即修復**（安全性問題）
   - 後端權限檢查
   - 輸入驗證
   - 防止 SQL 注入

2. **核心功能**
   - 檔案重命名（較簡單）
   - 資料夾重命名
   - Virtual path 更新機制

3. **進階功能**
   - 檔案移動
   - 批量操作
   - 拖放支援

## 📈 成功指標

1. **功能指標**
   - 100% 的重命名操作成功率
   - 移動操作錯誤率 < 0.1%
   - 無資料遺失事件

2. **效能指標**
   - 重命名響應時間 < 500ms
   - 移動操作完成時間 < 2s（一般情況）

3. **使用者滿意度**
   - 操作直觀性評分 > 4/5
   - 錯誤訊息清晰度 > 4/5

## 🔚 結論

重命名和移動功能是檔案管理系統的核心功能，當前 MemoryArk2 已有基礎框架但實現不完整。主要挑戰在於：

1. **安全性加固**：必須立即修復權限檢查缺失
2. **資料一致性**：需要完善 virtual_path 更新機制
3. **使用者體驗**：需要實現直觀的 UI 交互

建議分階段實施，優先處理安全性問題，再逐步完善功能和體驗。整體實施週期預計 3-4 週。

---

*本報告基於 2025-01-21 的系統狀態分析，實際實施時請參考最新程式碼。*