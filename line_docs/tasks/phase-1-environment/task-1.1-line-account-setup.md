# Task 1.1: LINE 開發者帳號申請與設定

## 📋 任務描述

申請 LINE Official Account 和 Messaging API，取得開發所需的憑證資訊。

**預估時間**：1 天  
**難度**：簡單  
**責任者**：專案經理 + 開發者

## 🎯 具體步驟

### Step 1: 申請 LINE Official Account (0.5 天)

#### 1.1 前往 LINE Official Account Manager
- 網址：https://manager.line.biz/
- 使用 LINE 帳號登入

#### 1.2 建立新的官方帳號
```bash
# 設定資訊
名稱: MemoryArk 教會照片上傳
類型: 其他 > 宗教組織
地區: 台灣
描述: 教會信徒照片上傳服務
```

#### 1.3 記錄帳號資訊
- [ ] **Official Account ID**: @your_line_id (用戶加好友時使用的 ID)
- [ ] **帳號名稱**: MemoryArk 教會照片上傳
- [ ] **QR Code**: 下載並儲存 (用戶掃描加好友)

### Step 2: 申請 Messaging API (0.5 天)

#### 2.1 前往 LINE Developers Console
- 網址：https://developers.line.biz/console/
- 使用同一個 LINE 帳號登入

#### 2.2 建立 Provider
```bash
Provider 名稱: MemoryArk Church
```

#### 2.3 建立 Messaging API Channel
```bash
Channel 名稱: MemoryArk Photo Upload
Channel 描述: 教會信徒照片上傳系統
分類: 宗教
子分類: 教會
地區: 台灣
Email: [專案負責人 Email]
```

#### 2.4 取得重要憑證
- [ ] **Channel ID**: 記錄並保存
- [ ] **Channel Secret**: 記錄並妥善保存
- [ ] **Channel Access Token**: 生成並記錄

### Step 3: 基本設定配置

#### 3.1 Webhook 設定
```bash
# 在 Messaging API 設定中
Webhook 設定: 啟用
Webhook URL: https://[您的子域名].94work.net/webhook/line
Use webhook: 啟用

# 範例 (請替換為實際的子域名):
# https://line.94work.net/webhook/line
# https://webhook.94work.net/webhook/line
# https://bot.94work.net/webhook/line
```

#### 3.2 回覆設定
```bash
自動回覆訊息: 停用
歡迎訊息: 停用（之後程式控制）
```

#### 3.3 權限設定
- [ ] 確認 Messaging API 已啟用
- [ ] 確認可以發送訊息
- [ ] 確認可以接收 Webhook

## 📝 輸出文件

### 憑證資訊記錄
建立 `line-credentials.md` 檔案：

```markdown
# LINE API 憑證資訊

## 基本資訊
- **Official Account ID**: @your_line_id
- **Channel ID**: your_channel_id_here
- **Provider ID**: [已設定完成]

## 重要憑證（請妥善保管）
- **Channel Secret**: your_channel_secret_here
- **Channel Access Token**: your_channel_access_token_here

## 測試資訊
- **QR Code 路徑**: ./assets/line-qr-code.png
- **測試用戶**: [開發者 LINE ID]

## 更新記錄
- 建立日期: 2024-06-24
- 最後更新: 2024-06-24
- 更新者: [姓名]
```

### 環境變數範本
建立 `.env.example` 檔案：

```bash
# LINE API Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_CHANNEL_ID=your_channel_id_here

# MemoryArk Integration
MEMORYARK_API_URL=http://backend:8081
MEMORYARK_API_TOKEN=your_internal_api_token

# Service Configuration
PORT=3000
NODE_ENV=development
```

## ✅ 驗收標準

### 基本功能測試
- [ ] 可以透過 QR Code 加入官方帳號
- [ ] 在 LINE Developers Console 看到 Channel 資訊
- [ ] Channel Access Token 有效（可通過 API 測試）
- [ ] Channel Secret 正確記錄

### 測試指令
```bash
# 測試 Channel Access Token 是否有效
curl -v -X GET https://api.line.me/v2/bot/info \
-H 'Authorization: Bearer YOUR_CHANNEL_ACCESS_TOKEN'

# 預期回應：200 OK 且包含 bot 資訊
```

## 🚨 注意事項

### 安全性
- ⚠️ **絕不將憑證提交到 Git**
- ⚠️ **使用環境變數儲存敏感資訊**
- ⚠️ **定期更新 Access Token**

### 限制事項
- 免費版 LINE Official Account 有訊息數量限制
- Webhook 需要有效的 HTTPS URL

### 常見問題
1. **申請被拒絕**：確保填寫資訊完整且符合 LINE 政策
2. **無法生成 Token**：確認 Messaging API 已正確啟用
3. **Token 無效**：檢查是否正確複製完整的 Token

## 📞 求助資源

- LINE Developers 文檔：https://developers.line.biz/en/docs/
- LINE Official Account 說明：https://www.linebiz.com/tw/
- 技術支援：LINE Developers 社群

---

**狀態**：⏳ 待開始  
**指派給**：待分配  
**開始時間**：待定  
**完成時間**：待定  
**檢查者**：專案經理