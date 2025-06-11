# MemoryArk 2.0 前端測試指南

## 🎯 測試目標

本指南旨在協助開發者和測試人員對 MemoryArk 2.0 前端系統進行全面的功能驗證和品質保證。

## 📋 測試策略

### 測試金字塔

```
    🔺 E2E 測試
      (瀏覽器自動化)
    
   🔺🔺 整合測試
     (API + 前端)
   
  🔺🔺🔺 單元測試
    (組件 + 函數)
```

### 測試分類

1. **功能性測試** - 驗證功能是否按預期工作
2. **非功能性測試** - 效能、安全性、可用性
3. **回歸測試** - 確保新變更不影響現有功能
4. **探索性測試** - 發現未預期的問題

## 🧪 測試執行流程

### 階段一：準備工作

```bash
# 1. 確認環境狀態
cd /home/davidliou/MyProject/MemoryArk2
podman ps

# 2. 確認服務健康狀態
curl -I http://localhost:7001

# 3. 檢查前端建置
ls -la frontend/dist/

# 4. 準備測試環境
python3 -c "import requests; print('OK')"
```

### 階段二：執行測試

```bash
# 快速測試 (5分鐘)
python3 testing/frontend/automated-test.py

# 完整測試 (15分鐘)
python3 testing/frontend/automated-test.py
python3 testing/frontend/static-analysis.py
python3 testing/frontend/browser-test.py  # 需要 Chrome

# 生成報告
python3 testing/frontend/comprehensive-test-report.py
```

### 階段三：結果分析

1. 檢查整體成功率
2. 分析失敗原因
3. 確認修復方案
4. 執行回歸測試

## 📊 測試案例詳解

### 關鍵測試案例

#### TC001: 基本連接性測試
```python
# 目的：確認前端服務可正常訪問
# 期望：HTTP 200 響應
# 失敗處理：檢查服務狀態和網路配置
```

#### TC018: 資料夾創建錯誤處理 ⭐
```python
# 目的：驗證同名資料夾錯誤訊息正確顯示
# 期望：友善的中文錯誤提示
# 重要性：已知問題修復驗證
```

#### TC017: Vue 組件品質分析
```python
# 目的：評估組件架構和 TypeScript 覆蓋率
# 期望：TS 覆蓋率 > 80%，組件結構良好
# 評分：100% = 優秀，80% = 良好，<60% = 需改進
```

### 測試數據管理

#### 測試用戶
```json
{
  "admin": {
    "email": "94work.net@gmail.com",
    "role": "admin",
    "permissions": ["all"]
  },
  "user": {
    "email": "test@example.com", 
    "role": "user",
    "permissions": ["read", "upload"]
  }
}
```

#### 測試檔案
```
測試檔案集合/
├── small_file.txt        (< 1KB)
├── medium_image.jpg      (< 1MB)  
├── large_video.mp4       (> 10MB)
├── special_chars_文件.pdf
└── malicious_test.exe    (安全測試)
```

## 🐛 常見問題與解決方案

### 問題分類

#### 連接問題
```bash
# 症狀：Connection refused
# 檢查：podman ps | grep nginx
# 解決：podman-compose restart nginx
```

#### 權限問題
```bash
# 症狀：403 Forbidden
# 檢查：用戶認證狀態
# 解決：確認 Cloudflare Access 配置
```

#### 效能問題
```bash
# 症狀：載入時間 > 5秒
# 檢查：網路狀況和資源大小
# 解決：優化資源載入策略
```

### 調試技巧

#### 1. 啟用詳細日誌
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### 2. 使用瀏覽器開發者工具
```javascript
// 檢查網路請求
console.log(performance.getEntriesByType('navigation'));

// 檢查錯誤
window.addEventListener('error', console.error);
```

#### 3. 分段測試
```bash
# 只測試基本功能
python3 automated-test.py --basic-only

# 只測試特定模組
python3 static-analysis.py --components-only
```

## 📈 效能基準

### 載入效能目標

| 指標 | 目標值 | 良好 | 需改進 |
|------|--------|------|--------|
| 首頁載入時間 | < 2秒 | < 3秒 | > 5秒 |
| API 響應時間 | < 500ms | < 1秒 | > 2秒 |
| 靜態資源載入 | < 1秒 | < 2秒 | > 3秒 |
| JavaScript 錯誤數 | 0 | < 2 | > 5 |

### 品質門檻

```yaml
測試通過標準:
  整體成功率: ">= 85%"
  關鍵功能成功率: ">= 95%"
  安全測試成功率: "100%"
  效能測試: "符合基準"
```

## 🔒 安全測試重點

### 輸入驗證
- XSS 防護測試
- SQL 注入測試
- 路徑遍歷測試
- 檔案上傳安全測試

### 認證授權
- 未認證存取限制
- 權限邊界測試
- 會話管理測試
- CSRF 防護測試

### 資料保護
- 敏感資料遮罩
- HTTPS 強制使用
- 安全標頭配置
- 內容安全政策

## 📱 響應式測試矩陣

### 測試裝置

| 裝置類型 | 解析度 | 測試重點 |
|----------|--------|----------|
| 桌面 | 1920x1080 | 完整功能 |
| 筆電 | 1366x768 | 導航適應 |
| 平板橫向 | 1024x768 | 觸控操作 |
| 平板直向 | 768x1024 | 垂直布局 |
| 手機大 | 414x896 | 手指觸控 |
| 手機小 | 375x667 | 最小螢幕 |

### 檢查項目
- ✅ 無水平滾動條
- ✅ 文字可讀性
- ✅ 按鈕可點擊
- ✅ 表單可用性
- ✅ 圖片自適應

## 🤝 協作流程

### 開發者自測
```bash
# 提交前檢查
npm run build
python3 testing/frontend/automated-test.py
# 確認成功率 > 90%
```

### 測試人員驗證
```bash
# 完整測試套件
./run-all-tests.sh
# 生成詳細報告
python3 comprehensive-test-report.py
```

### 持續整合
```yaml
# CI/CD 配置範例
test:
  stage: test
  script:
    - docker-compose up -d
    - python3 testing/frontend/automated-test.py
    - python3 testing/frontend/static-analysis.py
  artifacts:
    reports:
      junit: testing/frontend/results/*.xml
```

## 📚 參考資源

### 技術文檔
- [Vue.js 測試指南](https://vuejs.org/guide/scaling-up/testing.html)
- [Playwright 文檔](https://playwright.dev/)
- [Web 效能最佳實踐](https://web.dev/performance/)

### 工具推薦
- **自動化測試**: Playwright, Cypress
- **效能測試**: Lighthouse, WebPageTest  
- **視覺測試**: Percy, Chromatic
- **安全測試**: OWASP ZAP, Burp Suite

### 社群資源
- [前端測試最佳實踐](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [測試策略指南](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**維護者**: MemoryArk 開發團隊  
**最後更新**: 2025-06-11  
**版本**: v1.0