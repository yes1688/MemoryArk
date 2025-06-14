# MemoryArk 2.0 管理員設定指南

## 概述

本文檔說明如何正確設定和更換 MemoryArk 2.0 系統的管理員帳號，以及環境變數與資料庫同步的機制。

## 🔧 系統架構說明

### ENV 變數 vs 資料庫的關係

MemoryArk 2.0 的管理員設定採用**雙層機制**：

#### 1. **環境變數配置** (`.env` 檔案)
```bash
# 定義「系統規則」
ROOT_ADMIN_EMAIL=94work.net@gmail.com
ROOT_ADMIN_NAME=劉程維
DEV_AUTO_LOGIN_EMAIL=94work.net@gmail.com
```

**作用**：
- 告訴系統「誰是根管理員」
- 開發模式自動登入的帳號
- 初始化時建立管理員的依據

#### 2. **資料庫記錄** (`users` 表)
```sql
-- 實際的用戶資料
INSERT INTO users (email, name, role, status) 
VALUES ('94work.net@gmail.com', '劉程維', 'admin', 'approved');
```

**作用**：
- 儲存完整的用戶個人資料
- 系統實際查詢和驗證的來源
- 包含權限、狀態、建立時間等詳細資訊

### 為什麼需要兩個都設定？

**類比說明**：
- **ENV** = 門禁卡規則設定：「這張卡號可以進入辦公室」
- **資料庫** = 人事資料庫：「這個人確實存在且擁有這張卡」

如果只有 ENV 沒有資料庫：系統知道要找某個管理員，但找不到這個人
如果只有資料庫沒有 ENV：系統不知道誰是根管理員，開發模式無法自動登入

## 📋 管理員設定流程

### 🆕 初始設定（全新安裝）

1. **修改環境變數**
```bash
vim .env
```

```bash
# 設定你的管理員資訊
ROOT_ADMIN_EMAIL=your-email@domain.com
ROOT_ADMIN_NAME=你的姓名

# 開發模式設定（可選）
DEV_AUTO_LOGIN_EMAIL=your-email@domain.com
DEV_BYPASS_AUTH=true
```

2. **啟動系統**
```bash
podman-compose up -d
```

系統會自動：
- 從 ENV 變數讀取管理員資訊
- 在資料庫中建立對應的管理員帳號
- 設定完整的權限和狀態

### 🔄 更換管理員（現有系統）

#### 方法一：手動更新資料庫（推薦，安全）

```bash
# 1. 備份資料庫（安全起見）
cp data/memoryark.db data/memoryark.db.backup

# 2. 修改環境變數
vim .env
# 更新 ROOT_ADMIN_EMAIL 和 ROOT_ADMIN_NAME

# 3. 停止系統
podman-compose down

# 4. 直接更新資料庫中的管理員資訊
sqlite3 data/memoryark.db "UPDATE users SET email='new-email@domain.com', name='新姓名' WHERE role='admin' AND id=1;"

# 5. 重新啟動
podman-compose up -d
```

**優點**：
- ✅ 保留所有資料（檔案、用戶、中繼資料）
- ✅ 只更新管理員資訊
- ✅ 不會影響其他用戶

#### 方法二：完全重置（⚠️ 危險：會清空所有資料）

🚨 **警告**：此方法會刪除所有用戶資料、檔案記錄，但保留實際檔案

```bash
# 1. 完整備份（必須）
mkdir -p backup/$(date +%Y%m%d_%H%M%S)
cp -r data/ backup/$(date +%Y%m%d_%H%M%S)/
cp -r uploads/ backup/$(date +%Y%m%d_%H%M%S)/

# 2. 停止系統
podman-compose down

# 3. 修改環境變數
vim .env

# 4. 清除資料庫（保留檔案）
rm -rf data/*

# 5. 重新啟動
podman-compose up -d
```

**後果**：
- ❌ 所有用戶需要重新註冊
- ❌ 檔案記錄消失（但檔案實體存在）
- ❌ 分享連結失效
- ❌ 歷史記錄全部消失

```bash
# 1. 修改環境變數
vim .env

# 2. 停止系統
podman-compose down

# 3. 手動更新資料庫
sqlite3 data/memoryark.db "UPDATE users SET email='new-email@domain.com', name='新姓名' WHERE id=1;"

# 4. 重新啟動
podman-compose up -d
```

## 🔧 容器更新流程

### 程式碼更新但不更換管理員

```bash
# 標準更新流程
podman-compose down
podman-compose build --no-cache
podman-compose up -d
```

### 程式碼更新且更換管理員

```bash
# 1. 停止系統
podman-compose down

# 2. 修改 .env 檔案
vim .env

# 3. 清除舊映像和資料庫
podman rmi localhost/memoryark2_backend:latest 2>/dev/null || true
rm -rf data/*

# 4. 重建並啟動
podman build --no-cache -t memoryark2_backend:latest .
podman-compose up -d
```

## 🐛 常見問題排除

### Q1: 修改了 .env 但管理員沒有更新？

**原因**：資料庫中已存在管理員，系統跳過建立

**解決**：
```bash
podman-compose down
rm -rf data/*  # 清除資料庫
podman-compose up -d
```

### Q2: 開發模式無法自動登入？

**檢查清單**：
1. ENV 中的 `DEV_AUTO_LOGIN_EMAIL` 是否正確
2. 資料庫中是否存在對應的用戶
3. 用戶狀態是否為 `approved`

**驗證**：
```bash
# 檢查環境變數
podman exec memoryark2_backend_1 env | grep DEV_

# 檢查資料庫
sqlite3 data/memoryark.db "SELECT * FROM users WHERE role='admin';"
```

### Q3: 容器重建後還是舊的管理員？

**原因**：映像快取或資料庫持久化

**解決**：
```bash
# 完全清理重建
podman-compose down
podman rmi localhost/memoryark2_backend:latest
rm -rf data/*
podman build --no-cache -t memoryark2_backend:latest .
podman-compose up -d
```

## 📊 驗證步驟

### 檢查系統狀態

```bash
# 1. 檢查容器狀態
podman ps

# 2. 檢查健康狀態
curl http://localhost:7001/api/health

# 3. 檢查環境變數
podman exec memoryark2_backend_1 env | grep -E "(ROOT_ADMIN|DEV_)"

# 4. 檢查資料庫中的管理員
sqlite3 data/memoryark.db "SELECT id, email, name, role, status FROM users WHERE role='admin';"
```

### 預期結果

**環境變數**：
```
ROOT_ADMIN_EMAIL=94work.net@gmail.com
ROOT_ADMIN_NAME=劉程維
DEV_AUTO_LOGIN_EMAIL=94work.net@gmail.com
```

**資料庫記錄**：
```
1|94work.net@gmail.com|劉程維|admin|approved
```

## 🔒 安全注意事項

1. **生產環境**：關閉開發模式
```bash
DEVELOPMENT_MODE=false
DEV_BYPASS_AUTH=false
```

2. **強密碼**：確保 JWT 密鑰足夠安全
```bash
JWT_SECRET=your-super-secure-random-string
```

3. **定期備份**：管理員變更前先備份資料庫
```bash
cp -r data/ backup/data-$(date +%Y%m%d_%H%M%S)/
```

## 📝 最佳實踐

1. **文檔記錄**：每次管理員變更都要記錄原因和時間
2. **測試驗證**：更換後務必測試登入和管理功能
3. **備份策略**：變更前建立完整備份
4. **版本控制**：`.env` 檔案變更要提交到 Git（注意敏感資訊）

---

**版本**：MemoryArk 2.0.2  
**更新日期**：2025-06-10  
**維護者**：劉程維 <94work.net@gmail.com>