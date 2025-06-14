# 💻 開發者指南

> **開發者專區** - 本地開發、測試、貢獻指南

---

## 🛠️ 開發文檔

### 🏗️ [開發環境設置](DEVELOPMENT.md)
本地開發完整指南：
- 🐳 Docker/Podman 開發環境
- 🔧 IDE 配置
- 🚀 快速啟動
- 🔄 熱重載設置

---

## 🧪 測試文檔

### 📋 [E2E 測試指南](testing/E2E_TESTING_GUIDE.md)
端到端測試完整指南：
- 🎭 測試環境設置
- 🧪 測試腳本執行
- 📊 測試報告生成
- ✅ 持續集成配置

### 🔄 [檔案去重測試](testing/FILE_DEDUPLICATION_TESTING.md)
去重功能測試文檔：
- 🧮 SHA256 去重機制
- ⚡ 效能基準測試
- 📈 空間節省統計
- 🔍 健康檢查腳本

---

## ⚡ 快速開始

### 本地開發環境

```bash
# 開發模式啟動（自動登錄）
./deploy.sh up dev

# 查看開發日誌
./deploy.sh logs

# 重新編譯前端
cd frontend && npm run dev
```

### 測試執行

```bash
# 執行完整測試套件
./scripts/test-all.sh

# 執行去重測試
go test ./internal/services/... -run TestDeduplication

# E2E 測試
npm run test:e2e
```

---

## 🏗️ 架構理解

想了解系統架構？查看：
- 📐 [技術架構文檔](../04-architecture/README.md)
- 🔄 [串流匯出原理](../04-architecture/STREAMING_EXPORT_EXPLAINED.md)
- 📁 [檔案管理架構](../04-architecture/FILE_MANAGEMENT_ARCHITECTURE.md)

---

## 🤝 貢獻指南

### 開發流程

1. **Fork** 專案到你的 GitHub
2. **Clone** 到本地開發
3. **開發** 新功能或修復
4. **測試** 確保所有測試通過
5. **提交** Pull Request

### 代碼規範

- ✅ 遵循現有代碼風格
- ✅ 添加必要的測試
- ✅ 更新相關文檔
- ✅ 確保所有檢查通過

---

**相關資源**: [入門指南](../01-getting-started/README.md) | [運維文檔](../05-operations/README.md)