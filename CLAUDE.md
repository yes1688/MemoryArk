# Claude Code 智能記憶體系統 - MemoryArk

## 🚨 絕對禁令
- 🚫 **禁止刪除數據**：永不建議 `rm -rf data/*` 或破壞性檔案操作
- 🚫 **禁止跳過認證**：遇到 Cloudflare Access 必須修復，不得繞過
- 🚫 **禁止硬編碼**：所有配置必須通過 deploy.sh 互動式設定
- 🎯 **MCP 工具優先**：優先使用 MCP 工具，bash 作為補充

---

## 🔧 MCP 工具調用策略

### 工具選擇原則
**優先使用 MCP 工具，但根據情況靈活選擇最佳方案**

#### 📁 檔案操作工具選擇

| 場景       | 🥇 首選 MCP 工具                 | 🥈 備選 bash      | 適用情況                          |
| ---------- | ------------------------------- | ---------------- | --------------------------------- |
| 讀取檔案   | `read_file "file.go"`           | `cat file.go`    | 大檔案用 MCP，小檔案可用 bash     |
| 列出目錄   | `list_directory "backend"`      | `ls backend/`    | 需要詳細資訊用 MCP                |
| 搜尋程式碼 | `grep_files "." pattern="func"` | `grep -r "func"` | 複雜搜尋用 MCP，簡單查找可用 bash |
| 目錄結構   | `directory_tree "backend"`      | `tree backend/`  | 任何一種都可以                    |

#### 🔗 GitHub 操作工具選擇

| 場景     | 🥇 首選 GitHub MCP                                | 🥈 備選 git      | 適用情況                         |
| -------- | ------------------------------------------------ | --------------- | -------------------------------- |
| 提交歷史 | `list_commits "yes1688" "MemoryArk"`             | `git log -5`    | 需要分析用 MCP，快速查看可用 git |
| 檔案內容 | `get_file_contents "yes1688" "MemoryArk" "path"` | `cat path`      | 遠端檔案用 MCP，本地檔案可用 cat |
| 分支管理 | `list_branches "yes1688" "MemoryArk"`            | `git branch -a` | 任何一種都可以                   |

### ⚡ 快速決策指南
- **🔍 分析和搜尋** → MCP 工具（更智慧）
- **⚡ 快速查看** → bash（更快速）  
- **📊 數據處理** → MCP 工具（更強大）
- **🧪 簡單測試** → bash（更直接）

---

## ⚡ 三階段執行流程

### 🎬 階段一：對話開始檢索
```bash
qdrant-find "系統架構 MemoryArk"
qdrant-find "{需求關鍵字} Vue Go SQLite"  
qdrant-find "最佳實踐 {任務類型}"
```

### 🔄 階段二：觸發記錄條件
- **T1**: 首次分析新模組
- **T2**: 重要技術決策 
- **T3**: 調試超過15分鐘
- **T4**: 代碼超過30行
- **T5**: 發現重要模式

**記錄格式**：
```bash
qdrant-store {
  "information": "**{類型}：{標題}**\n\n**Type**: {記錄類型}\n**Project**: MemoryArk\n**Component**: {前端/後端/部署}\n**Details**: {具體內容}\n**Date**: $(date '+%Y-%m-%d')"
}
```

### 🎯 階段三：會話結束總結
```bash
qdrant-store {
  "information": "**會話總結：{主要任務}**\n\n**Type**: session_summary\n**Project**: MemoryArk\n**Tasks**: {完成任務}\n**Files**: {修改檔案}\n**Decisions**: {重要決策}\n**Next**: {後續步驟}\n**Date**: $(date '+%Y-%m-%d')"
}
```

---

## 🎯 MemoryArk 專案資訊

### 核心架構
- **前端**：Vue 3 + TypeScript + Pinia + Tailwind CSS
- **後端**：Go + Gin + SQLite + GORM  
- **部署**：Docker/Podman + Nginx
- **設計**：Apple HIG + Steve Jobs 簡約哲學

### 關鍵特性
- 🔄 **串流技術**：零記憶體壓力，支援 GB 級檔案
- 🧮 **SHA256 去重**：自動偵測重複檔案
- 🛡️ **安全設計**：零硬編碼，完全用戶控制
- ⛪ **教會專用**：真耶穌教會檔案管理系統

### 部署指令
```bash
./deploy.sh up production    # 生產環境部署
./deploy.sh restart         # 重啟服務
./deploy.sh diagnose        # 診斷問題
./deploy.sh logs           # 查看日誌
```

---

## 🔍 問題解決策略

### 內部優先檢索
```bash
qdrant-find "錯誤 {關鍵字}"
qdrant-find "問題 Vue Go SQLite"
qdrant-find "部署 Cloudflare"
```

### 外部資源補充
```bash
web_search "Vue 3 {問題} 解決方案"
web_search "Go Gin SQLite {錯誤訊息}"
web_search "Docker Nginx {問題} 2025"
```

---

## 📋 執行檢查清單

### 對話開始
- [ ] 執行3步檢索序列
- [ ] 載入相關架構知識
- [ ] 識別任務類型（前端/後端/部署）

### 執行過程
- [ ] 優先使用 MCP 工具
- [ ] 監控5個觸發條件
- [ ] 重要修改立即記錄

### 對話結束
- [ ] 記錄會話總結
- [ ] 確認檔案修改已記錄
- [ ] 提供後續建議

---

## 🚨 MemoryArk 特定規則

### 必須執行 ✅
- 對話開始檢索相關經驗
- 重要檔案修改立即記錄
- 調試問題完整記錄過程
- 新功能記錄設計決策

### 禁止行為 ❌
- 跳過 deploy.sh 手動部署
- 建議硬編碼配置
- 忽略 Cloudflare Access 認證
- 建議刪除 data/ 或 uploads/

### 開發重點 🎯
- **前端**：Vue 3 組件化、Tailwind 深色模式
- **後端**：Go REST API、SQLite 優化
- **部署**：Docker 容器化、Nginx 配置
- **安全**：權限控制、檔案安全、認證流程

---

**執行原則**：每次對話檢索經驗，記錄重要知識，確保專案知識持續累積。

*參考：記錄格式詳見 `docs/記錄格式參考.md`*