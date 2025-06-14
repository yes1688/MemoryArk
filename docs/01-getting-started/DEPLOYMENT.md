# MemoryArk 2.0 部署指南

> **Just Works** - 3分鐘完成部署，資料永不丟失 🎯

---

## ⚡ 極速開始

### 🆕 第一次安裝？

```bash
git clone https://github.com/yes1688/MemoryArk.git
cd MemoryArk
./deploy.sh up production
```

**想要自訂配置？**
```bash
cp .env.example .env  # 建立配置檔案
nano .env             # 修改設定
./deploy.sh restart   # 重啟套用
```

**就這麼簡單！** 3分鐘後訪問 http://localhost:7001

---

### 🔄 已有舊版本？

```bash
cd MemoryArk
./deploy.sh update
```

**資料會自動保護！** 不會丟失任何檔案或資料庫。

---

## 🎛️ 日常操作

```bash
./deploy.sh up        # 啟動系統
./deploy.sh down      # 停止系統  
./deploy.sh restart   # 重啟系統
./deploy.sh status    # 檢查狀態
./deploy.sh logs      # 查看日誌
```

---

## 🚨 出問題了？

### 網站打不開

```bash
./deploy.sh diagnose
./deploy.sh restart
```

### 想看錯誤日誌

```bash
./deploy.sh logs
```

### 需要重新安裝

```bash
./deploy.sh down
./deploy.sh up production
```

---

## 📍 訪問地址

- **本地開發**: http://localhost:7001
- **生產環境**: 依實際部署網域而定

---

## 🛡️ 安全保證

### ✅ 永不丟失的資料
- 📁 上傳的檔案：`uploads/`
- 🗄️ 資料庫：`data/memoryark.db`
- 📝 日誌檔案：`logs/`

### 🔄 自動備份
每次更新前系統會自動備份，安全無憂。

---

## 💡 進階設定

<details>
<summary>📧 更改管理員帳號</summary>

**方法1：修改 .env 檔案**
```bash
cp .env.example .env  # 如果還沒有 .env
nano .env             # 修改 ROOT_ADMIN_EMAIL 和 ROOT_ADMIN_NAME
./deploy.sh restart
```

**方法2：直接設定環境變數**
```bash
export ROOT_ADMIN_EMAIL="your-email@domain.com"
export ROOT_ADMIN_NAME="您的姓名"
./deploy.sh restart
```
</details>

<details>
<summary>🔧 手動 Docker 操作</summary>

```bash
# 如果不想用 deploy.sh，也可以直接用：
docker-compose up -d      # 啟動
docker-compose down       # 停止
docker-compose logs -f    # 查看日誌
```
</details>

<details>
<summary>🐧 Podman 用戶</summary>

```bash
# 把 docker-compose 換成 podman-compose 即可
podman-compose up -d
podman-compose down
```
</details>

<details>
<summary>🚧 開發模式</summary>

```bash
# 自動登錄，跳過 Cloudflare 認證
./deploy.sh up dev
```
</details>

<details>
<summary>📊 系統診斷</summary>

```bash
./deploy.sh diagnose    # 自動檢測問題
./deploy.sh backup      # 手動備份
./deploy.sh cleanup     # 清理舊檔案
```
</details>

---

## 🎯 常見場景

### 情境1：新電腦第一次安裝
```bash
git clone https://github.com/yes1688/MemoryArk.git
cd MemoryArk  
./deploy.sh up production
# 完成！訪問 http://localhost:7001
```

### 情境2：從舊版升級
```bash
cd MemoryArk
./deploy.sh update
# 完成！資料自動保護
```

### 情境3：系統出錯了
```bash
./deploy.sh diagnose
./deploy.sh restart
# 大部分問題都能自動修復
```

### 情境4：想要重新開始
```bash
./deploy.sh down
rm -rf data uploads  # 確定要清空所有資料
./deploy.sh up production
```

---

## 📞 需要幫助？

**一行命令生成報告：**
```bash
./deploy.sh report > 我的系統報告.txt
```

把報告發給技術支援：**94work.net@gmail.com**

---

## ✨ 設計哲學

遵循 **Steve Jobs** 的設計理念：
- 🎯 **Simple** - 複雜的事情變簡單
- 🛡️ **Safe** - 資料安全永遠第一
- ⚡ **Fast** - 3分鐘完成部署
- 💫 **Beautiful** - 優雅的用戶體驗

---

*"Simplicity is the ultimate sophistication." - Leonardo da Vinci / Steve Jobs*