# 🔧 運維指南

> **系統維護專區** - 備份策略、效能優化、監控告警

---

## 📋 運維文檔

### 💾 [備份和匯出優化](BACKUP_AND_EXPORT_OPTIMIZATION.md) ⚠️ 需更新
備份策略與效能優化：
- 🔄 自動備份策略
- ⚡ 匯出效能優化
- 📊 監控指標設置
- 🚨 告警配置

---

## ⚡ 快速運維

### 日常維護命令

```bash
# 系統備份
./deploy.sh backup

# 效能診斷
./deploy.sh diagnose

# 清理舊檔案
./deploy.sh cleanup

# 查看系統狀態
./deploy.sh status
```

### 監控指標

```bash
# 檢查磁碟使用率
df -h

# 檢查記憶體使用
free -h

# 檢查容器狀態
docker ps -a

# 檢查日誌
./deploy.sh logs
```

---

## 📊 系統監控

### 關鍵指標

| 指標 | 正常範圍 | 告警閾值 | 檢查命令 |
|------|----------|----------|----------|
| 💾 磁碟使用率 | < 80% | > 90% | `df -h` |
| 🧠 記憶體使用 | < 70% | > 85% | `free -h` |
| 🔄 CPU 使用率 | < 60% | > 80% | `top` |
| 📦 容器狀態 | Running | Exited | `docker ps` |

### 自動化監控腳本

```bash
#!/bin/bash
# monitor.sh - 系統監控腳本

# 檢查磁碟空間
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "⚠️ 磁碟使用率過高: ${DISK_USAGE}%"
fi

# 檢查容器狀態
if ! docker ps | grep -q memoryark; then
    echo "🚨 MemoryArk 容器未運行"
    ./deploy.sh restart
fi

# 檢查服務可用性
if ! curl -s http://localhost:7001/api/health > /dev/null; then
    echo "🚨 服務無響應，嘗試重啟"
    ./deploy.sh restart
fi
```

---

## 🔄 備份策略

### 自動備份設置

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 點自動備份
0 2 * * * cd /path/to/MemoryArk && ./deploy.sh backup

# 每週清理舊備份（保留 30 天）
0 3 * * 0 find /path/to/backups -mtime +30 -delete
```

### 手動備份

```bash
# 完整系統備份
./deploy.sh backup

# 單獨備份資料庫
cp data/memoryark.db data/memoryark_backup_$(date +%Y%m%d).db

# 單獨備份檔案
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

---

## ⚡ 效能優化

### 資料庫優化

```sql
-- 清理軟刪除的檔案記錄（謹慎操作）
DELETE FROM files WHERE is_deleted = 1 AND deleted_at < datetime('now', '-30 days');

-- 重建索引
REINDEX;

-- 清理 WAL 檔案
PRAGMA wal_checkpoint(TRUNCATE);
```

### 檔案系統優化

```bash
# 清理孤立檔案（謹慎操作）
./deploy.sh cleanup

# 檢查檔案完整性
find uploads/ -type f -exec sha256sum {} \; > file_hashes.txt

# 磁碟碎片整理（如果需要）
# 注意：現代檔案系統通常不需要手動整理
```

---

## 🚨 故障處理

### 常見故障排除

#### 服務無法啟動
```bash
# 檢查端口占用
netstat -tlnp | grep :7001

# 檢查磁碟空間
df -h

# 查看詳細錯誤
./deploy.sh logs
```

#### 效能問題
```bash
# 檢查系統負載
top
htop

# 檢查 I/O 狀況
iotop

# 分析慢查詢
sqlite3 data/memoryark.db ".timeout 5000"
```

#### 資料庫損壞
```bash
# 檢查資料庫完整性
sqlite3 data/memoryark.db "PRAGMA integrity_check;"

# 修復資料庫
sqlite3 data/memoryark.db "PRAGMA quick_check;"

# 從備份恢復
cp data/memoryark_backup_*.db data/memoryark.db
./deploy.sh restart
```

---

## 📈 容量規劃

### 儲存需求預估

| 用戶數 | 檔案數 | 平均檔案大小 | 去重後儲存 | 建議配置 |
|--------|--------|--------------|------------|----------|
| 10-50 | 1K-10K | 5MB | 20-100GB | 200GB SSD |
| 50-200 | 10K-50K | 5MB | 100-500GB | 1TB SSD |
| 200+ | 50K+ | 5MB | 500GB+ | 2TB+ SSD |

### 效能基準

```bash
# I/O 效能測試
dd if=/dev/zero of=test_file bs=1M count=1000
time cp test_file test_file_copy
rm test_file test_file_copy

# 網路效能測試
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:7001/api/health
```

---

## 🔐 安全維護

### 定期安全檢查

```bash
# 檢查檔案權限
find uploads/ -type f -not -perm 644 -ls
find data/ -type f -not -perm 644 -ls

# 檢查異常大檔案
find uploads/ -size +100M -ls

# 檢查系統日誌
journalctl -u docker --since "1 day ago" | grep -i error
```

### 更新管理

```bash
# 系統更新前檢查清單
1. 備份資料 ✓
2. 記錄當前版本 ✓  
3. 檢查磁碟空間 ✓
4. 通知用戶維護時間 ✓

# 執行更新
./deploy.sh update

# 更新後驗證
./deploy.sh status
curl http://localhost:7001/api/health
```

---

**相關資源**: [部署指南](../01-getting-started/DEPLOYMENT.md) | [用戶指南](../02-user-guide/README.md) | [故障排除](../01-getting-started/DEPLOYMENT.md#-出問題了)