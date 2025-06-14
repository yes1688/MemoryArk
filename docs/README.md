# 📚 MemoryArk 2.0 文檔中心

> 最後更新：2025-06-14 | 基於代碼交叉檢驗確保準確性

## 🚀 快速開始

- **部署指南**: [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md) ✅ 已驗證準確
- **開發指南**: [development/DEVELOPMENT.md](development/DEVELOPMENT.md) ✅ 基本準確

## 📖 核心文檔

### 🏗️ 架構設計

- **[串流匯出解釋](architecture/STREAMING_EXPORT_EXPLAINED.md)** ✅ 已驗證
  - 詳細解釋串流匯出原理和實現
  - 包含完整代碼示例
  - **驗證狀態**: 與 `backend/internal/api/handlers/export.go` 完全匹配

- **[檔案管理架構](architecture/FILE_MANAGEMENT_ARCHITECTURE.md)** ⚠️ 需要檢驗
  - 檔案系統設計和虛擬路徑實現

- **[最終檔案管理解決方案](architecture/FINAL_FILE_MANAGEMENT_SOLUTION.md)** ⚠️ 需要檢驗
  - 完整的檔案管理系統設計方案

### 💻 開發指南

- **[開發環境設置](development/DEVELOPMENT.md)** ✅ 基本準確
  - 本地開發環境配置
  - Docker/Podman 設置說明

### 🚢 部署運維

- **[部署指南](deployment/DEPLOYMENT.md)** ✅ 已驗證準確
  - 統一部署腳本使用說明
  - 生產環境和開發環境配置
  - **驗證狀態**: 與根目錄 `deploy.sh` 腳本匹配

- **[備份和匯出優化](operations/BACKUP_AND_EXPORT_OPTIMIZATION.md)** ⚠️ 需要更新
  - 備份策略和匯出功能優化建議

### 🧪 測試文檔

- **[E2E 測試指南](testing/E2E_TESTING_GUIDE.md)** ✅ 詳細完整
  - 端到端測試執行指南
  - 測試環境設置和執行步驟

- **[檔案去重測試](testing/FILE_DEDUPLICATION_TESTING.md)** ✅ 已驗證
  - 去重功能測試策略和結果
  - **驗證狀態**: 與代碼中的去重邏輯和測試文件匹配

### 📋 管理文檔

- **[管理員管理](ADMIN_MANAGEMENT.md)** ✅ 實用指南
  - 系統管理員功能說明
  - 用戶權限管理

## ✅ 文檔驗證狀態說明

- ✅ **已驗證準確**: 已與最新代碼交叉檢驗，內容準確
- ⚠️ **需要檢驗**: 內容可能準確，但需要進一步驗證
- ❌ **已知過時**: 已確認過時，已刪除或需要更新

## 🔄 文檔維護

### 最近清理（2025-06-14）

**已刪除的過時文檔**：
- `operations/ROLLING_UPGRADE_DOCUMENTATION.md` - 引用不存在的腳本
- `development/UPLOAD_PATH_ANALYSIS.md` - 特定問題分析，已過時  
- `testing/STREAMING_EXPORT_LOAD_TESTING.md` - 負載測試腳本不存在

**驗證方法**：
- 檢查文檔中提到的文件和腳本是否存在
- 對比文檔描述與實際代碼實現
- 確保 API 端點和功能描述的準確性

## 📞 支援

如果發現文檔問題或需要幫助：

1. **快速部署**: `./deploy.sh up production`
2. **故障診斷**: `./deploy.sh diagnose`  
3. **查看日誌**: `./deploy.sh logs`

---

💡 **提示**: 優先參考標註為 ✅ 的文檔，這些已經過代碼交叉驗證確保準確性。