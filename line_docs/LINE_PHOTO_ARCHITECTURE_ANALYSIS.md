# LINE 信徒照片接收功能架構分析

## 📋 功能需求總覽

基於 LINE Messaging API 的技術要求，本功能需要實現：

1. **Webhook 接收**：接收 LINE 平台推送的訊息事件（需要 HTTPS + 有效 SSL）
2. **簽章驗證**：驗證 X-Line-Signature 確保請求來源真實性
3. **圖片下載**：透過 LINE Content API 下載使用者上傳的圖片
4. **使用者識別**：透過 LINE Profile API 取得使用者資訊
5. **檔案儲存**：將圖片儲存到系統中，並建立關聯資料
6. **自動回覆**：透過 Reply API 回覆使用者確認訊息
7. **10秒內回應**：Webhook 必須在 10 秒內回應 HTTP 200

## 🏗️ 架構方案分析

### 方案一：建立獨立新專案 (api.domainName.net)

#### 架構設計
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   LINE 平台     │────►│ api.domain.net   │────►│  MemoryArk2     │
│  Webhook Push   │     │  (新獨立專案)     │     │   (主系統)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │                            │
                              ▼                            ▼
                        ┌──────────┐                ┌──────────┐
                        │ 獨立DB   │                │ 主系統DB  │
                        └──────────┘                └──────────┘
```

#### 優點
- ✅ **完全隔離**：LINE 服務故障不影響主系統運作
- ✅ **獨立擴展**：可根據 LINE 訊息量獨立擴展資源
- ✅ **技術自由**：可選擇最適合的技術棧（如 Node.js + Express）
- ✅ **維護簡單**：程式碼庫獨立，易於管理和部署
- ✅ **安全隔離**：Webhook 端點與主系統完全分離，降低攻擊面
- ✅ **獨立監控**：可設置專門的監控和告警機制

#### 缺點
- ❌ **維護成本高**：需要額外的域名、SSL 憑證、伺服器資源
- ❌ **資料同步複雜**：需要設計 API 或資料庫同步機制
- ❌ **重複開發**：認證、日誌、監控等基礎設施需要重新實作
- ❌ **部署複雜**：需要管理兩套部署流程和環境
- ❌ **成本增加**：額外的伺服器和維護成本

#### 實作要點
```yaml
# 獨立專案技術棧建議
技術棧:
  語言: Node.js (LINE SDK 支援完善)
  框架: Express.js + TypeScript
  資料庫: PostgreSQL (更適合獨立服務)
  檔案儲存: 本地 + 定期同步到主系統
  
API 設計:
  - POST /webhook/line      # LINE Webhook 端點
  - GET /api/photos         # 供主系統查詢
  - POST /api/sync          # 資料同步端點
```

### 方案二：在本專案新增容器 (多容器架構)

#### 架構設計
```
┌─────────────────┐     ┌─────────────────────────────────┐
│   LINE 平台     │────►│        MemoryArk2 System        │
│  Webhook Push   │     │  ┌─────────┐   ┌──────────┐   │
└─────────────────┘     │  │ LINE    │   │  Main    │   │
                        │  │ Service │───│ Backend  │   │
                        │  │Container│   │Container │   │
                        │  └─────────┘   └──────────┘   │
                        │         │              │        │
                        │         └──────┬───────┘        │
                        │                ▼                │
                        │          ┌──────────┐          │
                        │          │ Shared   │          │
                        │          │ SQLite   │          │
                        │          └──────────┘          │
                        └─────────────────────────────────┘
```

#### 優點
- ✅ **資源共享**：共用資料庫、檔案儲存、網路設定
- ✅ **部署統一**：透過 docker-compose 一起管理
- ✅ **內部通訊快速**：容器間通訊無需經過外網
- ✅ **中度隔離**：服務故障不會直接影響其他容器
- ✅ **擴展彈性**：可以獨立擴展 LINE 服務容器
- ✅ **統一監控**：可以使用相同的日誌和監控系統

#### 缺點
- ❌ **資源競爭**：共用主機資源，高峰期可能互相影響
- ❌ **複雜度增加**：需要管理容器間通訊和依賴
- ❌ **技術限制**：需要配合現有的容器編排架構
- ❌ **除錯困難**：多容器環境的除錯和日誌追蹤較複雜

#### 實作要點
```yaml
# docker-compose.yml 新增
line-service:
  build: ./line-service
  environment:
    - LINE_CHANNEL_TOKEN=${LINE_CHANNEL_TOKEN}
    - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
    - DB_PATH=/data/memoryark.db
  volumes:
    - ./data:/data
    - ./uploads:/uploads
  networks:
    - memoryark-network
  depends_on:
    - backend
    
# Nginx 配置新增
location /webhook/line {
    proxy_pass http://line-service:3000;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### 方案三：直接整合到現有 Golang 後端

#### 架構設計
```
┌─────────────────┐     ┌─────────────────────────────────┐
│   LINE 平台     │────►│      MemoryArk2 Backend         │
│  Webhook Push   │     │   ┌─────────────────────┐       │
└─────────────────┘     │   │   Gin Router        │       │
                        │   │  /api/webhook/line  │       │
                        │   └──────────┬──────────┘       │
                        │              ▼                   │
                        │   ┌─────────────────────┐       │
                        │   │  LINE Handler      │       │
                        │   │  - 簽章驗證        │       │
                        │   │  - 圖片下載        │       │
                        │   │  - 檔案儲存        │       │
                        │   └─────────────────────┘       │
                        └─────────────────────────────────┘
```

#### 優點
- ✅ **最簡單實作**：無需額外的基礎設施或部署流程
- ✅ **完全整合**：直接使用現有的認證、權限、檔案管理系統
- ✅ **程式碼重用**：可重用現有的檔案上傳、儲存、去重邏輯
- ✅ **維護方便**：單一程式碼庫，統一的開發和部署流程
- ✅ **成本最低**：無需額外的伺服器或服務
- ✅ **資料一致**：直接寫入主資料庫，無同步問題

#### 缺點
- ❌ **耦合度高**：LINE 服務問題可能影響主系統
- ❌ **擴展受限**：無法獨立擴展 LINE 相關功能
- ❌ **風險集中**：Webhook 攻擊可能影響整個系統
- ❌ **技術債務**：Go 的 LINE SDK 支援不如 Node.js 完善
- ❌ **隔離性差**：LINE 高流量可能影響主服務性能

#### 實作要點
```go
// 新增 LINE 相關路由
func SetupLineRoutes(r *gin.RouterGroup) {
    line := r.Group("/webhook")
    {
        // LINE Webhook 端點（不需要認證）
        line.POST("/line", handlers.HandleLineWebhook)
    }
}

// 新增 LINE 處理器
package line

type Handler struct {
    fileService    *services.FileService
    channelSecret  string
    channelToken   string
    httpClient     *http.Client
}

func (h *Handler) HandleWebhook(c *gin.Context) {
    // 1. 驗證簽章
    if !h.verifySignature(c) {
        c.JSON(403, gin.H{"error": "Invalid signature"})
        return
    }
    
    // 2. 解析事件
    // 3. 處理圖片訊息
    // 4. 下載並儲存
    // 5. 回覆確認
    
    c.JSON(200, gin.H{"status": "ok"})
}
```

## 📊 方案對比總表

| 評估面向 | 方案一：獨立專案 | 方案二：新增容器 | 方案三：整合後端 |
|---------|----------------|----------------|----------------|
| **實作複雜度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **維護成本** | 💰💰💰💰 | 💰💰 | 💰 |
| **擴展性** | 🚀🚀🚀🚀🚀 | 🚀🚀🚀 | 🚀 |
| **安全隔離** | 🔒🔒🔒🔒🔒 | 🔒🔒🔒 | 🔒 |
| **開發速度** | 🐌 | 🐢 | 🐇 |
| **資源使用** | 📦📦📦 | 📦📦 | 📦 |
| **技術自由度** | ✅✅✅✅✅ | ✅✅✅ | ✅ |

## 🎯 建議方案：方案二（新增容器）

### 推薦理由

1. **平衡性最佳**：在隔離性、維護性和實作複雜度之間取得良好平衡
2. **符合現有架構**：MemoryArk2 已採用容器化架構，新增容器符合設計理念
3. **漸進式演進**：未來如需要可輕易抽離為獨立服務
4. **資源效率**：共用基礎設施但保持服務隔離
5. **技術選擇彈性**：可以選用 Node.js 獲得更好的 LINE SDK 支援

### 實作路徑建議

#### Phase 1：基礎建設（第 1-2 週）
```yaml
tasks:
  - 建立 line-service 容器專案結構
  - 配置 LINE SDK 和基本 webhook
  - 實作簽章驗證機制
  - 設定容器間通訊
```

#### Phase 2：核心功能（第 3-4 週）
```yaml
tasks:
  - 實作圖片接收和下載
  - 整合主系統檔案儲存 API
  - 實作自動回覆功能
  - 添加錯誤處理和重試機制
```

#### Phase 3：進階功能（第 5-6 週）
```yaml
tasks:
  - 實作批次處理機制
  - 添加使用者管理功能
  - 建立管理介面
  - 效能優化和壓力測試
```

## 🔧 技術實作細節

### LINE Service 容器設計
```javascript
// 建議技術棧
{
  "runtime": "Node.js 20 LTS",
  "framework": "Express.js + TypeScript",
  "lineSDK": "@line/bot-sdk",
  "database": "透過 API 存取主系統",
  "queue": "Bull (Redis) 處理非同步任務",
  "monitoring": "整合主系統日誌"
}
```

### API 整合設計
```typescript
// LINE Service → Main Backend API
interface PhotoUploadAPI {
  endpoint: "/internal/api/line/photos"
  method: "POST"
  auth: "Internal service token"
  payload: {
    lineUserId: string
    lineUserName: string
    messageId: string
    imageBuffer: Buffer
    metadata: {
      timestamp: number
      contentType: string
    }
  }
}
```

### 安全性考量
1. **內部通訊加密**：容器間 API 呼叫使用內部 token
2. **請求限流**：防止 webhook 濫用
3. **檔案驗證**：圖片類型和大小檢查
4. **日誌審計**：完整的操作日誌記錄

## 📋 行動計畫

### 立即行動項目
1. 評估團隊對 Node.js 的熟悉度
2. 申請 LINE Official Account 和開發者帳號
3. 準備 SSL 憑證和 webhook URL
4. 建立開發環境和測試計畫

### 風險評估
- **技術風險**：團隊需要學習 LINE API 和可能的 Node.js
- **營運風險**：需要監控 LINE 訊息配額和費用
- **安全風險**：Webhook 端點暴露需要適當防護

## 結論

考量 MemoryArk2 的現有架構、團隊能力和未來擴展性，**建議採用方案二（新增容器）**。這個方案在保持適度隔離的同時，能夠充分利用現有基礎設施，並為未來可能的獨立部署保留彈性。

如果團隊對 Go 語言更熟悉且預期 LINE 使用量不大，方案三（整合後端）也是可行的快速解決方案。但長期來看，方案二的架構更加清晰和可維護。