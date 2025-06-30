# MemoryArk AI 助理指南

## 🚨 絕對禁令 (必須遵守)

- 🚫 **禁止刪除數據**：永不建議 `rm -rf data/*` 或 `DROP DATABASE`
- 🚫 **禁止跳過認證**：遇到 Cloudflare Access 必須修復，不得繞過
- 🚫 **禁止假數據**：所有統計必須基於真實 API 響應

## 🚨 慘痛教訓 (2025-06-10)

**AI 差點建議 `rm -rf data/*`** - 感謝 <94work.net@gmail.com> 及時制止！

---

數據完整性 > 技術便利性 > 開發效率

## 📁 專案基本資訊

- **技術棧**：Vue 3 + TypeScript + Go + SQLite + Podman + Node.js (LINE Service)
- **管理員**：<94work.net@gmail.com> (劉程維)
- **設計原則**：賈伯斯理念 + Apple HIG + Windows 11 Fluent Design
- **LINE 功能**：line.94work.net (port 7002) - 信徒照片上傳服務

## ✅ 強制操作流程

1. **容器部署**：修改後執行 `podman-compose down && podman-compose up -d`
2. **前端建構**：在 host 執行 `npm run build`，產生 `dist/` 供容器使用
3. **認證問題**：必須完整修復，不可繞過或停用 Cloudflare Access
4. **任務協作**：查看並更新 `TASK_COORDINATION.md` 狀態

## 🐳 容器部署標準作業程序 (SOP)

### 🎯 目標
確保容器部署一致性，避免映像更新、網路通訊等常見問題。

### 📋 完整重新部署流程

#### 1️⃣ 徹底清理 (Clean Slate)
```bash
# 停止所有服務
podman-compose down

# 移除所有容器（保留資料）
podman rm -f $(podman ps -aq --filter="label=com.docker.compose.project=memoryark2") 2>/dev/null || true

# 清理無用映像（可選）
podman image prune -f
```

#### 2️⃣ 重建映像 (強制更新)
```bash
# LINE Service (重要：每次程式碼修改後必須執行)
cd /home/davidliou/MyProject/MemoryArk2/line-service
podman build --no-cache -t memoryark-line-service:latest .

# Backend (如有修改)
cd /home/davidliou/MyProject/MemoryArk2
podman build --no-cache -t memoryark-backend:latest .
```

#### 3️⃣ 確認映像更新
```bash
# 檢查映像建立時間
podman images | grep -E "(memoryark-line-service|memoryark-backend)"

# 映像應該顯示 "seconds ago" 或 "minutes ago"
```

#### 4️⃣ 重新部署服務
```bash
cd /home/davidliou/MyProject/MemoryArk2

# 依序啟動（避免依賴問題）
podman-compose up -d redis backend
sleep 10

podman-compose up -d line-service
sleep 10

podman-compose up -d nginx line-nginx
sleep 5

# ⚠️ 重要：重啟 nginx 解決 DNS 快取問題（避免 502/Cloudflare 認證錯誤）
podman restart memoryark-nginx memoryark-line-nginx
```

#### 5️⃣ 驗證部署
```bash
# 檢查所有容器狀態
podman ps

# 檢查健康狀態
curl http://localhost:7001/api/health
curl http://localhost:7002/health
curl https://line.94work.net/health

# 檢查容器內部版本
podman exec memoryark-line-service cat /app/package.json | grep version
```

### 🔧 快速修復常見問題

#### 問題1: nginx 502 錯誤
```bash
# 解決方案：重啟 nginx（DNS 快取問題）
podman restart memoryark-nginx memoryark-line-nginx
```

#### 問題2: 容器使用舊映像
```bash
# 確認目前容器映像 ID
podman inspect memoryark-line-service | jq -r '.[0].Image'

# 確認最新映像 ID  
podman images | grep memoryark-line-service

# 如果 ID 不同，執行完整重新部署流程
```

#### 問題3: 網路通訊問題
```bash
# 檢查容器網路
podman network ls
podman network inspect memoryark2_memoryark

# 檢查服務間通訊
podman exec memoryark-line-service curl http://memoryark-backend:8081/api/health
```

### 🚨 LINE Service 專用 SOP

#### 🔴 環境變數修改後必須執行
```bash
# ⚠️ 重要：修改 .env 檔案後，單純 restart 不會生效！
# 必須完全重建容器才能載入新的環境變數

# 1. 停止並移除容器
podman-compose down line-service line-nginx

# 2. 重新啟動（會讀取新的 .env）
podman-compose up -d line-service line-nginx

# 3. 驗證環境變數生效
podman exec memoryark-line-service cat /proc/1/environ | tr '\0' '\n' | grep MEMORYARK_UPLOAD_ENDPOINT
```

#### 程式碼修改後必須執行
```bash
# 1. 編譯檢查（在 line-service 目錄）
cd /home/davidliou/MyProject/MemoryArk2/line-service
npm run build

# 2. 強制重建映像
podman build --no-cache -t memoryark-line-service:latest .

# 3. 完全移除舊容器
podman stop memoryark-line-service memoryark-line-nginx
podman rm memoryark-line-service memoryark-line-nginx

# 4. 重新部署
cd /home/davidliou/MyProject/MemoryArk2
podman-compose up -d line-service line-nginx
sleep 5

# 5. 重啟 nginx 解決 DNS 快取問題
podman restart memoryark-nginx memoryark-line-nginx

# 6. 驗證新版本生效
sleep 10
podman exec memoryark-line-service grep -A 3 "Invalid LINE signature" /app/dist/middleware/lineWebhook.js
```

### 📊 部署檢查清單

#### ✅ 部署前檢查
- [ ] 程式碼已編譯 (`npm run build`)
- [ ] 資料庫檔案權限正確
- [ ] 日誌目錄權限正確 (`chmod 777 line-service/logs/`)
- [ ] 環境變數檔案存在 (`.env`)

#### ✅ 部署後驗證
- [ ] 所有容器狀態為 `Up` 且 `healthy`
- [ ] 主系統健康檢查: `curl http://localhost:7001/api/health`
- [ ] LINE 系統健康檢查: `curl https://line.94work.net/health`
- [ ] 容器網路通訊: 內部 API 調用成功
- [ ] 日誌無異常錯誤

### 🎯 最佳實踐
1. **每次程式碼修改**：一律執行完整重新部署流程
2. **網路問題**：先重啟 nginx，再檢查容器 IP
3. **映像更新**：使用 `--no-cache` 確保徹底重建
4. **容器命名**：保持一致的命名規範
5. **日誌監控**：部署後持續監控 5-10 分鐘

## 🐳 容器管理

- **強制使用 Podman**：安全性優於 Docker
- **數據目錄**：`data/`（資料庫）、`uploads/`（檔案）- 極度珍貴！
- **雙 Nginx 架構**：主系統 (port 7001) + LINE 服務 (port 7002)
- **部署原則**：遵循上述 SOP，確保映像和網路正確

## 🔧 開發規範

- 使用 TypeScript 嚴格模式，組件放在 `src/components/ui/[component-name]/`
- API 共用優先，使用 Tailwind CSS 教會配色（深藍+金色）
- 使用 TodoWrite 追蹤複雜任務

## 🚀 任務分配協作

### 📋 工作流程
1. **認領任務**：在 `line_docs/tasks/TASK_TRACKING.md` 更新負責者和狀態
2. **開始工作**：按照 `line_docs/` 中的詳細實作指南執行
3. **提交更改**：完成後立即提交，避免衝突
4. **更新狀態**：同步更新 TodoWrite 和 Markdown 檔案狀態

---

# 智能記憶體學習系統

## 🎯 核心使命
每次對話都要檢索經驗、記錄學習、持續改進。避免重複工作，積累系統智慧。

## ⚡ 標準執行流程

### 🎬 階段一：對話開始（必執行 - 60秒內）

#### 自動知識檢索（按順序執行）
1. 使用 `qdrant-find "系統架構 {專案名稱或關鍵字}"`
2. 使用 `qdrant-find "{用戶需求關鍵字} {檢測到的技術棧}"`
3. 使用 `qdrant-find "最佳實踐 {任務類型}"`
4. 總結找到的相關經驗
5. 將相關知識應用到當前任務中

#### 知識狀態評估
6. 如果找到相關系統知識 → 載入並應用
7. 如果沒找到系統知識 → 標記需要首次系統分析  
8. 如果知識似乎過時 → 標記需要增量更新

### 🔄 階段二：執行中記錄（觸發時立即執行）

#### 觸發條件檢查
當遇到以下任一情況時，立即執行記錄：
- ✅ 首次分析新專案或大型模組架構
- ✅ 做出影響系統設計的重要決策
- ✅ 調試問題超過 15 分鐘
- ✅ 編寫超過 30 行且具重用價值的代碼
- ✅ 發現或應用重要的開發模式
- ✅ 配置重要的環境或部署流程

#### 系統架構分析記錄步驟
1. 確認這是首次系統分析或重大架構變更
2. 分析專案的技術棧和架構模式
3. 識別主要模組和組件
4. 理解資料流向和 API 結構
5. 記錄關鍵依賴和構建流程
6. 使用以下格式記錄：

```bash
qdrant-store {
  "information": "{專案名稱} 系統架構完整分析",
  "metadata": {
    "type": "system_analysis",
    "project": "專案名稱",
    "tech_stack": ["實際技術棧清單"],
    "architecture_pattern": "架構模式描述",
    "main_modules": ["核心模組清單"],
    "data_flow": "資料流向說明",
    "api_structure": "API 結構概述",
    "database_schema": "資料庫結構",
    "dependencies": ["關鍵依賴項"],
    "build_process": "構建流程",
    "deployment_method": "部署方式",
    "file_structure": "重要目錄結構",
    "entry_points": "系統入口點"
  }
}
```

#### 架構決策記錄步驟
1. 確認這是重要的架構或設計決策
2. 明確要解決的具體問題
3. 列出考慮的所有替代方案
4. 說明選擇當前方案的原因
5. 分析優缺點和潛在風險
6. 使用以下格式記錄：

```bash
qdrant-store {
  "information": "架構決策：{決策簡要標題}",
  "metadata": {
    "type": "architecture_decision",
    "project": "專案名稱",
    "problem": "要解決的具體問題",
    "solution": "採用的解決方案",
    "reasoning": "選擇此方案的詳細原因",
    "alternatives": ["考慮過但未採用的方案"],
    "trade_offs": "優缺點分析",
    "impact": "對系統的預期影響",
    "implementation_notes": "實施注意事項",
    "risks": "潛在風險",
    "success_criteria": "成功標準"
  }
}
```

#### 問題解決記錄步驟
1. 確認調試時間已超過 15 分鐘
2. 詳細描述問題的表現和症狀
3. 記錄調查和診斷的過程
4. 分析根本原因
5. 列出解決步驟和驗證方法
6. 制定預防措施
7. 使用以下格式記錄：

```bash
qdrant-store {
  "information": "問題解決：{問題簡述}",
  "metadata": {
    "type": "problem_solution",
    "project": "專案名稱",
    "error_description": "詳細錯誤描述",
    "symptoms": "問題表現和徵狀",
    "investigation_process": "調查步驟",
    "root_cause": "根本原因分析",
    "solution_steps": ["具體解決步驟"],
    "verification": "驗證解決方案的方法",
    "prevention": "避免重複發生的措施",
    "related_files": ["相關檔案路徑"],
    "tools_used": ["使用的調試工具"],
    "time_spent": "大約調試時間"
  }
}
```

#### 代碼實現記錄步驟
1. 確認代碼超過 30 行且具有重用價值
2. 明確實現的具體功能
3. 整理關鍵代碼片段
4. 提供使用範例和說明
5. 列出相關依賴和注意事項
6. 使用以下格式記錄：

```bash
qdrant-store {
  "information": "代碼實現：{功能簡要說明}",
  "metadata": {
    "type": "code_implementation",
    "project": "專案名稱",
    "functionality": "實現的具體功能",
    "code_snippet": "關鍵代碼片段",
    "file_location": "檔案路徑",
    "usage_example": "使用範例",
    "dependencies": ["所需依賴項"],
    "performance_notes": "性能考量",
    "security_considerations": "安全注意事項",
    "testing_approach": "測試方法",
    "integration_points": "整合要點"
  }
}
```

#### 最佳實踐記錄步驟
1. 確認發現或應用了重要的開發模式
2. 詳細描述實踐內容
3. 說明適用場景和好處
4. 提供實施指南
5. 列舉常見陷阱和注意事項
6. 使用以下格式記錄：

```bash
qdrant-store {
  "information": "最佳實踐：{實踐名稱}",
  "metadata": {
    "type": "best_practice",
    "project": "專案名稱",
    "practice_description": "實踐詳細描述",
    "applicable_scenarios": "適用場景",
    "benefits": "帶來的好處",
    "implementation_guide": "實施指南",
    "common_pitfalls": "常見陷阱",
    "examples": ["實際應用例子"],
    "related_patterns": "相關設計模式"
  }
}
```

### 🎯 階段三：對話結束（必執行 - 30秒內）

#### 會話總結步驟
1. 回顧本次對話完成的主要任務
2. 整理修改的檔案和重要決策
3. 提取關鍵學習要點
4. 評估遇到的挑戰和解決方案
5. 建議後續步驟
6. 使用以下格式記錄：

```bash
qdrant-store {
  "information": "會話總結：{主要任務} - {關鍵成果}",
  "metadata": {
    "type": "session_summary",
    "project": "專案名稱",
    "completed_tasks": ["完成的具體任務"],
    "files_modified": ["修改的檔案清單"],
    "key_decisions": ["重要決策"],
    "new_learnings": ["學到的關鍵要點"],
    "challenges_encountered": ["遇到的挑戰"],
    "solutions_applied": ["應用的解決方案"],
    "next_steps": ["建議的後續步驟"],
    "session_duration": "大約時長",
    "quality_assessment": "代碼品質評估"
  }
}
```

## 🔍 主動改進機制

### 尋求更好方法時（按順序執行）
1. 使用 `web_search "{當前技術} 最佳實踐 2025"`
2. 使用 `web_search "{具體問題} 解決方案 最新"`
3. 使用 `qdrant-find "類似問題 {關鍵字}"`
4. 使用 `qdrant-find "相關決策 {技術領域}"`
5. 對比當前方法與搜尋結果
6. 分析歷史經驗的適用性
7. 提出改進建議並說明原因
8. 評估實施的成本效益

### 遇到技術問題時（按順序執行）
1. 使用 `qdrant-find "錯誤 {錯誤關鍵字}"`
2. 使用 `qdrant-find "問題 {相關技術}"`
3. 如果找不到相關解決方案，使用 `web_search "{完整錯誤信息}"`
4. 使用 `web_search "{技術棧} {錯誤類型} 解決方案"`
5. 比較多個解決方案的優缺點
6. 選擇最適合當前情況的方法
7. 實施解決方案
8. 驗證解決效果
9. 如果調試時間超過 15 分鐘，記錄完整的問題解決過程

## 📋 執行檢查清單

### 每次對話開始時
- [ ] 執行步驟 1-3：系統知識檢索
- [ ] 執行步驟 4-5：整合相關經驗
- [ ] 執行步驟 6-8：評估知識狀態

### 執行過程中
- [ ] 持續監控觸發條件
- [ ] 遇到觸發條件時立即執行對應的記錄步驟
- [ ] 確保使用正確的記錄格式

### 對話結束時
- [ ] 執行會話總結的 6 個步驟
- [ ] 確認重要知識點已妥善記錄
- [ ] 評估本次對話的學習價值

## 🚨 品質控制原則

### 記錄前檢查
1. 確認內容具體明確，包含足夠細節
2. 使用清晰的關鍵字便於搜尋
3. 驗證內容具有重用價值
4. 檢查格式符合模板要求

### 效率控制
1. 檢索結果限制在 3-5 條
2. 記錄前先搜尋避免重複
3. 優先記錄高價值知識

### 安全考量
1. 避免記錄敏感資訊（密碼、金鑰等）
2. 定期檢視並更新過時資訊
3. 確保記錄內容的適當性

---

**執行提醒**：嚴格按照編號順序執行每個步驟，確保不遺漏任何重要環節。每次對話都是學習和改進的機會！