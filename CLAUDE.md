# Claude Code 智能記憶體系統

## 安全規範
- 禁止破壞性操作（刪除重要數據）
- 禁止跳過安全機制
- 禁止記錄敏感資訊（密碼、API金鑰、個人資料）
- 優先使用 SafuRrier mcp-filesystem 進行檔案操作

## 工具使用優先級
1. SafuRrier mcp-filesystem：檔案操作、搜索、編輯
2. bash：快速查看、簡單操作
3. GitHub MCP：遠端倉庫操作

## 執行流程

### 對話開始時執行
```
qdrant-find "系統架構 {專案名稱}"
qdrant-find "{任務關鍵字} {技術棧}"
qdrant-find "最佳實踐 {任務類型}"
```

### 任務狀態查詢
**重要**：查詢任務狀態時的正確順序：
1. 先執行 `qdrant-find "任務狀態 {專案名稱}"`
2. 再使用 `TodoRead` 查看當前會話任務
3. git status 顯示的是**已完成工作的結果**，不是待辦事項
4. 避免將「已修改檔案」誤判為「未完成任務」

### 觸發記錄條件
- 首次分析新模組 → 立即記錄
- 重要技術決策 → 立即記錄  
- 調試超過15分鐘 → 立即記錄
- 代碼超過30行 → 立即記錄
- 發現重要模式 → 立即記錄

### 問題解決順序
1. 執行：`qdrant-find "錯誤 {關鍵字}"`
2. 如無結果，執行：`web_search "{技術棧} {問題} 解決方案"`

### 對話結束時執行
```
qdrant-store {
  "information": "**會話總結：{任務}**\n\n**Type**: session_summary\n**Project**: {專案名稱}\n**Tasks**: {完成項目}\n**Files**: {修改檔案}\n**Next**: {後續步驟}"
}
```

## 記錄格式（Claude Code Issue #2747 替代方案）

**重要**：由於 Claude Code Issue #2747，metadata 參數無法使用，使用以下替代格式：

### 系統架構記錄
```
qdrant-store {
  "information": "**系統架構：{專案名}**\n\n**Type**: system_analysis\n**Tech**: {技術棧}\n**Component**: {組件類型}\n**Modules**: {主要模組}\n**Details**: {關鍵資訊}"
}
```

### 問題解決記錄
```
qdrant-store {
  "information": "**問題解決：{問題描述}**\n\n**Type**: problem_solution\n**Project**: {專案名稱}\n**Cause**: {根本原因}\n**Solution**: {解決步驟}\n**Prevention**: {預防方法}"
}
```

### 代碼實作記錄
```
qdrant-store {
  "information": "**代碼實作：{功能名稱}**\n\n**Type**: code_implementation\n**Project**: {專案名稱}\n**File**: {檔案路徑}\n**Function**: {功能描述}\n**Usage**: {使用方法}"
}
```

### 架構決策記錄
```
qdrant-store {
  "information": "**架構決策：{決策標題}**\n\n**Type**: architecture_decision\n**Project**: {專案名稱}\n**Problem**: {要解決問題}\n**Solution**: {選擇方案}\n**Reasoning**: {選擇原因}"
}
```

## 檢查清單
對話開始：
- [ ] 執行3步檢索
- [ ] 載入相關經驗

執行過程：
- [ ] 監控觸發條件
- [ ] 立即記錄重要內容

對話結束：
- [ ] 記錄會話總結