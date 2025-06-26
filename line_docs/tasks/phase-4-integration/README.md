# Phase 4: 系統整合與測試

## 📋 階段概述

將 LINE Service 與 MemoryArk2 主系統進行完整整合，進行端到端測試，確保所有功能正常運作。

**預估時間**：4-5 天  
**依賴關係**：Phase 3 完成  
**輸出物**：完整整合的系統、測試報告、部署文檔

## 🎯 主要子任務

### 4.1 容器化與 Docker Compose 整合
- **檔案**：`task-4.1-container-integration.md`
- **時間**：1 天
- **責任**：DevOps + 後端開發者

### 4.2 後端 API 整合開發
- **檔案**：`task-4.2-backend-api-integration.md`
- **時間**：1.5 天
- **責任**：後端開發者

### 4.3 檔案儲存系統整合
- **檔案**：`task-4.3-file-storage-integration.md`
- **時間**：1 天
- **責任**：後端開發者

### 4.4 端到端測試
- **檔案**：`task-4.4-end-to-end-testing.md`
- **時間**：1 天
- **責任**：QA + 後端開發者

### 4.5 效能優化與調校
- **檔案**：`task-4.5-performance-optimization.md`
- **時間**：0.5 天
- **責任**：DevOps + 後端開發者

## 🏗️ 整合架構

### 系統整合圖
```
┌─────────────────┐    HTTPS     ┌─────────────────────────────────┐
│   LINE 平台     │──Webhook────►│        MemoryArk2 System        │
│                 │              │  ┌─────────────┐ ┌─────────────┐│
└─────────────────┘              │  │LINE Service │ │   Backend   ││
                                 │  │(Node.js)    │ │   (Golang)  ││
                                 │  │Port: 3000   │ │  Port: 8081 ││
                                 │  └─────────────┘ └─────────────┘│
                                 │         │               │       │
                                 │         └───────────────┘       │
                                 │                ▼                │
                                 │    ┌─────────────────────┐     │
                                 │    │  Shared Storage     │     │
                                 │    │  • SQLite DB        │     │
                                 │    │  • File Uploads     │     │
                                 │    │  • Redis Queue      │     │
                                 │    └─────────────────────┘     │
                                 └─────────────────────────────────┘
```

### 資料流程
```
LINE 用戶發送照片
       ↓
LINE Service 接收 Webhook
       ↓
下載照片到臨時儲存
       ↓
呼叫 Backend API 上傳照片
       ↓
Backend 儲存檔案並建立記錄
       ↓
LINE Service 記錄上傳資訊
       ↓
回覆確認訊息給用戶
```

## ✅ 完成標準

### 整合功能
- [ ] LINE Service 容器正常啟動
- [ ] 與 Backend 的 API 通訊正常
- [ ] 檔案上傳流程完整運作
- [ ] 資料庫記錄正確建立
- [ ] 前端可以查看 LINE 上傳的照片

### 系統測試
- [ ] 單張照片上傳測試通過
- [ ] 批量照片上傳測試通過
- [ ] 大檔案上傳測試通過
- [ ] 錯誤恢復測試通過
- [ ] 併發使用者測試通過

### 效能指標
- [ ] 照片上傳端到端時間 < 30 秒
- [ ] 系統併發處理能力 > 10 users
- [ ] 記憶體使用量穩定
- [ ] CPU 使用率合理

## 🔧 整合要求

### API 整合規範
```typescript
// LINE Service → Backend API
interface PhotoUploadRequest {
  lineUserId: string;
  lineUserName: string;
  lineMessageId: string;
  lineGroupId?: string;
  lineGroupName?: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
  timestamp: string;
}

interface PhotoUploadResponse {
  success: boolean;
  fileId?: number;
  filePath?: string;
  error?: string;
}
```

### 檔案組織結構
```
/uploads/LINE信徒上傳/
├── 個人上傳/
│   ├── 張三 (LINE_U123456789)/
│   │   ├── 2024-06/
│   │   │   ├── photo_20240624_001.jpg
│   │   │   └── photo_20240624_002.jpg
│   │   └── 2024-07/
│   └── 李四 (LINE_U987654321)/
└── 群組上傳/
    ├── 青年團契群組/
    └── 長老會議群組/
```

## 📊 測試計畫

### 功能測試
| 測試項目 | 測試方法 | 預期結果 |
|---------|---------|---------|
| 單張照片上傳 | 手動測試 | 成功上傳並顯示在前端 |
| 批量照片上傳 | 自動化腳本 | 所有照片都成功處理 |
| 大檔案上傳 | 10MB 以上檔案 | 正常處理或適當錯誤訊息 |
| 無效檔案類型 | 傳送 PDF 等 | 拒絕並回覆錯誤訊息 |
| 網路異常 | 模擬網路中斷 | 重試機制正常運作 |

### 負載測試
```bash
# 使用 Artillery 進行負載測試
artillery run load-test-config.yml

# 測試場景
- 10 個並發用戶，持續 5 分鐘
- 每個用戶每 30 秒上傳一張照片
- 監控系統資源使用情況
```

### 壓力測試
```bash
# 極限測試
- 50 個並發用戶同時上傳
- 單個 20MB 大檔案上傳
- 記憶體不足情況模擬
- 磁碟空間不足情況模擬
```

## 🚨 風險評估

| 風險項目 | 機率 | 影響 | 緩解措施 |
|---------|------|------|---------|
| API 整合失敗 | 中 | 高 | 完整的 API 測試與文檔 |
| 檔案系統權限問題 | 中 | 中 | 容器權限配置驗證 |
| 資料庫鎖定問題 | 低 | 高 | 事務優化與監控 |
| 記憶體洩漏 | 中 | 中 | 記憶體監控與重啟機制 |

## 📋 整合檢查清單

### 環境準備
- [ ] 所有容器服務正常啟動
- [ ] 網路連接設定正確
- [ ] 環境變數配置完整
- [ ] 日誌系統運作正常

### API 整合
- [ ] 內部 API 認證機制設定
- [ ] API 端點正確回應
- [ ] 錯誤處理機制測試
- [ ] API 文檔更新完成

### 檔案系統
- [ ] 上傳目錄權限設定正確
- [ ] 檔案路徑生成規則正確
- [ ] 檔案去重機制運作
- [ ] 備份機制設定完成

### 資料庫
- [ ] 資料表關聯正確
- [ ] 索引效能驗證
- [ ] 資料完整性檢查
- [ ] 備份恢復測試

## 📞 支援工具

### 測試工具
- Postman：API 測試
- Artillery：負載測試
- Jest：單元測試
- Selenium：E2E 測試

### 監控工具
- htop：系統資源監控
- docker stats：容器監控
- tail -f：日誌即時監控
- curl：手動 API 測試

### 除錯工具
- docker logs：容器日誌
- docker exec：容器內部除錯
- sqlite3：資料庫查詢
- redis-cli：Redis 狀態檢查

---

**狀態**：待開始  
**負責人**：整合測試團隊  
**開始日期**：待定  
**完成日期**：待定