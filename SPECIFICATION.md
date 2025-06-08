# MemoryArk 2.0 - 教會影音回憶錄系統技術規格書

## 專案概述

### 專案名稱
MemoryArk 2.0 - 教會影音回憶錄系統

### 專案目標
為真耶穌教會設計的檔案瀏覽與管理系統，用於分享和管理教會的影音資源和回憶。旨在成為一個合一的媒體管理平台，讓教會成員能夠輕鬆分享、尋找和保存珍貴的影音記錄。

### 核心價值觀
1. **簡單易用**：即使是非技術使用者也能輕鬆上手
2. **美觀一致**：提供視覺愉悅且溫馨的使用體驗
3. **高效可靠**：快速穩定地處理教會的媒體資源
4. **安全私密**：保護教會內部資料，確保只有授權用戶可訪問

### 專案特色
- 專為真耶穌教會設計（使用安息日而非主日的文化特色）
- Windows 11 Files 應用的設計語言
- 基於 Cloudflare Access 的企業級安全認證
- 容器化部署，易於維護和擴展

## 技術架構

### 前端技術棧
- **Vue 3**：採用組合式 API，提供反應式與高效的用戶界面
- **TypeScript**：全專案使用 TypeScript 確保代碼品質
- **Tailwind CSS**：完全採用 Tailwind CSS 實現 UI 設計，遵循 Windows 11 Files 應用的設計語言
- **Vue Router**：實現 SPA 路由管理
- **Pinia**：狀態管理解決方案

### 自定義組件庫
基於 Tailwind CSS 打造一套完整的組件系統，不依賴第三方 UI 庫：
- **AppButton**：Windows 11 風格按鈕組件
- **AppDialog**：模糊背景對話框組件
- **AppInput**：表單輸入組件
- **AppCard**：卡片容器組件
- **AppFileIcon**：檔案類型圖標組件
- **AppContextMenu**：右鍵選單組件
- **AppBreadcrumb**：路徑導航組件

### 後端技術棧
- **Go**：高性能後端語言
- **Gin 框架**：輕量級 Web 框架
- **SQLite**：簡單高效的文件數據庫
- **JWT**：實現安全的身份驗證

### 部署與基礎設施
- **Nginx**：Web 服務器與反向代理
- **Podman**：容器化部署
- **Cloudflare Access**：外部身份驗證層

## 功能規格

### 1. 身份認證與授權

#### 1.1 認證流程

- **雙層驗證機制**：
  - **第一層**：Cloudflare Access 驗證（僅確認通過 Google 身份驗證，不限定特定郵箱）
  - **第二層**：系統內部用戶註冊與審核
- **Cloudflare 標頭檢查**：系統檢查請求中的 `Cf-Access-Authenticated-User-Email` 標頭或 Cloudflare cookie
- **無自動用戶創建**：不會基於 Cloudflare 資訊自動創建用戶資料

#### 1.2 用戶註冊流程

- **註冊申請**：用戶第一次訪問系統時，提供註冊申請按鈕
- **必填資訊**：
  - 用戶姓名
  - 聯絡電話
  - 電子郵件（自動從 Cloudflare 標頭獲取）
- **審核機制**：
  - 管理員審核所有註冊申請
  - 可查看申請詳情，批准或拒絕申請
  - 可為批准的用戶指定角色

#### 1.3 自動登入機制

- **每次訪問**：系統讀取 Cloudflare 標頭或 cookie 中的電子郵件
- **資料庫比對**：比對此郵件是否為已審核通過的註冊用戶
- **自動登入**：若為有效用戶，系統自動完成登入程序
- **引導註冊**：若非有效用戶，引導至註冊申請頁面

#### 1.4 權限管理

- **角色系統**：
  - 管理員：完整系統權限
  - 一般用戶：基本檔案操作權限
- **權限控制**：
  - 檔案上傳/下載
  - 資料夾創建/管理
  - 垃圾桶操作
  - 用戶管理

### 2. 檔案管理系統

#### 2.1 基本檔案操作

- **上傳檔案**：
  - 支援拖拽上傳
  - 批量上傳
  - 進度顯示
  - 檔案類型驗證
- **下載檔案**：
  - 單檔下載
  - 批量下載（ZIP 壓縮）
- **預覽功能**：
  - 圖片預覽
  - 影片播放
  - 音頻播放
  - 文件預覽

#### 2.2 檔案夾管理

- **創建資料夾**
- **重命名檔案/資料夾**
- **移動檔案/資料夾**：支援拖拽操作
- **複製操作**
- **檔案搜尋**：支援檔名和內容搜尋

#### 2.3 檔案組織

- **標籤系統**：為檔案添加標籤便於分類
- **收藏功能**：快速訪問常用檔案
- **最近訪問**：顯示最近操作的檔案
- **分享連結**：生成有時效性的分享連結

### 3. 垃圾桶系統

#### 3.1 刪除機制

- **軟刪除**：檔案移至垃圾桶而非立即刪除
- **自動清理**：設定時間後自動永久刪除
- **刪除記錄**：保留刪除操作的詳細記錄

#### 3.2 垃圾桶管理

- **檢視已刪除檔案**：所有用戶可檢視
- **還原檔案**：僅管理員可執行
- **永久刪除**：僅管理員可執行
- **批量操作**：支援批量還原或刪除

### 4. 管理員功能

#### 4.1 用戶管理

- **用戶列表**：檢視所有用戶
- **角色管理**：修改用戶角色
- **用戶停用**：暫時停用用戶帳號
- **登入記錄**：檢視用戶登入歷史
- **註冊審核**：審核新用戶註冊申請

#### 4.2 系統管理

- **儲存空間監控**：檢視系統儲存使用情況
- **系統記錄**：檢視操作記錄和錯誤記錄
- **備份管理**：系統備份與還原
- **設定管理**：系統全域設定

## 用戶界面設計

### 設計原則

- **Windows 11 Files 設計語言**：採用 Microsoft Fluent Design 風格
- **響應式設計**：支援桌面、平板、手機等各種裝置
- **無障礙設計**：遵循 WCAG 2.1 標準
- **教會文化融入**：在色彩和圖示中融入教會元素

### 主要頁面結構

#### 4.1 主導航

- **首頁**：快速訪問和最近檔案
- **我的檔案**：個人檔案管理
- **共享資料夾**：教會共享資源
- **安息日資料**：專門存放安息日相關影音
- **垃圾桶**：已刪除檔案管理
- **設定**：個人和系統設定

#### 4.2 檔案瀏覽介面

- **工具列**：快速操作按鈕
- **路徑導航**：麵包屑導航
- **檢視模式**：清單、縮圖、詳細資訊
- **右側資訊面板**：檔案詳細資訊
- **搜尋列**：即時搜尋功能

### 色彩系統

- **主色調**：深藍色系（體現穩重和信任）
- **次色調**：溫暖金色（體現溫馨和希望）
- **中性色**：灰色系（符合 Windows 11 設計）
- **狀態色**：綠色（成功）、紅色（錯誤）、橙色（警告）

## 資料庫設計

### 資料表結構

#### users 用戶表

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
    avatar_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    approved_by INTEGER,
    approved_at DATETIME,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
```

#### user_registration_requests 用戶註冊申請表

```sql
CREATE TABLE user_registration_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    processed_by INTEGER,
    rejection_reason TEXT,
    FOREIGN KEY (processed_by) REFERENCES users(id)
);
```

#### files 檔案表

```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    parent_id INTEGER,
    uploaded_by INTEGER NOT NULL,
    is_directory BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,
    deleted_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES files(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    FOREIGN KEY (deleted_by) REFERENCES users(id)
);
```

#### file_shares 檔案分享表

```sql
CREATE TABLE file_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    shared_by INTEGER NOT NULL,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id),
    FOREIGN KEY (shared_by) REFERENCES users(id)
);
```

#### activity_logs 操作記錄表

```sql
CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## API 設計

### RESTful API 端點

#### 認證相關

- `GET /api/auth/me` - 獲取當前用戶資訊
- `POST /api/auth/register` - 提交用戶註冊申請
- `GET /api/auth/status` - 檢查當前用戶狀態（未註冊/審核中/已批准/已拒絕）
README.md
#### 檔案管理

- `GET /api/files` - 獲取檔案列表
- `GET /api/files/:id` - 獲取檔案詳情
- `POST /api/files/upload` - 上傳檔案
- `PUT /api/files/:id` - 更新檔案資訊
- `DELETE /api/files/:id` - 刪除檔案（移至垃圾桶）
- `POST /api/files/:id/restore` - 還原檔案
- `DELETE /api/files/:id/permanent` - 永久刪除檔案
- `GET /api/files/:id/download` - 下載檔案
- `POST /api/files/:id/share` - 創建分享連結

#### 資料夾管理

- `POST /api/folders` - 創建資料夾
- `PUT /api/folders/:id/move` - 移動檔案/資料夾
- `PUT /api/folders/:id/rename` - 重命名資料夾

#### 用戶管理（管理員）

- `GET /api/admin/users` - 獲取用戶列表
- `PUT /api/admin/users/:id/role` - 修改用戶角色
- `PUT /api/admin/users/:id/status` - 修改用戶狀態
- `GET /api/admin/registrations` - 獲取註冊申請列表
- `PUT /api/admin/registrations/:id/approve` - 批准註冊申請
- `PUT /api/admin/registrations/:id/reject` - 拒絕註冊申請

#### 系統管理

- `GET /api/admin/stats` - 獲取系統統計資訊
- `GET /api/admin/logs` - 獲取系統記錄

### API 回應格式

```json
{
    "success": true,
    "data": {
        // 實際數據
    },
    "message": "操作成功",
    "timestamp": "2025-05-26T10:00:00Z"
}
```

### 錯誤回應格式

```json
{
    "success": false,
    "error": {
        "code": "FILE_NOT_FOUND",
        "message": "檔案不存在",
        "details": {}
    },
    "timestamp": "2025-05-26T10:00:00Z"
}
```

## 安全性設計

### 1. 認證安全

- **Cloudflare Access**：第一層認證保護，驗證用戶已通過 Google 身份認證
- **系統內部認證**：第二層認證，驗證用戶已在系統中註冊並獲批准
- **JWT Token**：用於 API 認證，設定適當過期時間
- **CSRF Protection**：防範跨站請求偽造攻擊

### 2. 授權控制

- **角色驗證**：每個 API 請求驗證用戶角色
- **資源權限**：確保用戶只能訪問有權限的資源
- **操作記錄**：所有敏感操作都記錄到 activity_logs

### 3. 檔案安全

- **檔案類型驗證**：限制可上傳的檔案類型
- **檔案大小限制**：防止惡意大檔案上傳
- **病毒掃描**：整合病毒掃描引擎（可選）
- **檔案隔離**：將用戶檔案與系統檔案分離

### 4. 資料保護

- **資料加密**：敏感資料進行加密存儲
- **備份策略**：定期自動備份
- **災難恢復**：制定災難恢復計劃

## 效能優化

### 1. 前端優化

- **代碼分割**：Vue Router 懶加載
- **資源壓縮**：CSS/JS 檔案壓縮
- **圖片優化**：自動調整圖片大小和格式
- **快取策略**：靜態資源瀏覽器快取

### 2. 後端優化

- **資料庫索引**：為常用查詢欄位建立索引
- **分頁查詢**：大資料集分頁載入
- **檔案分塊上傳**：大檔案分塊處理
- **快取機制**：Redis 快取（可選）

### 3. 檔案處理

- **縮圖生成**：自動生成圖片縮圖
- **影片轉碼**：支援多種影片格式（可選）
- **檔案壓縮**：自動壓縮大檔案

## 部署規格

### 容器化架構

```yaml
# podman-compose.yml 概念
services:
  nginx:
    image: nginx:alpine
    ports:
      - "7001:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
  
  backend:
    build: ./backend
    volumes:
      - ./backend/data:/app/data
    environment:
      - DATABASE_PATH=/app/data/database.db
      - STORAGE_PATH=/app/data/storage
  
  frontend:
    build: ./frontend
    volumes:
      - ./frontend/dist:/usr/share/nginx/html
```

### 系統需求

- **最低硬體需求**：
  - CPU：2 核心
  - 記憶體：4GB
  - 儲存空間：20GB（不含媒體檔案）
- **推薦硬體配置**：
  - CPU：4 核心以上
  - 記憶體：8GB 以上
  - 儲存空間：100GB 以上

### 網路架構

- **對外端口**：僅開放 7001 端口
- **內部網路**：容器間私有網路通訊
- **SSL/TLS**：透過 Cloudflare 提供 HTTPS

## AI 任務執行規範

### 規格書衝突檢查機制

當 AI 助理接收到任務時，必須遵循以下檢查流程：

1. **規格書驗證**：
   - 檢查任務是否與本規格書中的設計原則、技術標準或功能定義產生衝突
   - 識別任何可能影響系統架構、安全性或用戶體驗的變更

2. **衝突警告**：
   - 若發現衝突，必須明確告知用戶具體的衝突點
   - 說明該變更可能造成的影響和風險
   - 提供替代解決方案或修改建議

3. **確認機制**：
   - 等待用戶明確確認是否要進行該變更
   - 用戶確認後，必須更新本規格書相關章節
   - 在 CHANGELOG.md 中記錄規格變更原因和影響

4. **執行原則**：
   - 所有變更必須符合專案的核心價值觀和設計原則
   - 維持代碼品質和系統安全性標準
   - 確保變更不會破壞現有功能

### 核心不可變原則

以下原則為專案核心，除非有重大業務需求否則不應修改：

1. **安全認證架構**：雙層認證機制（Cloudflare + 系統內部）
2. **資料隱私保護**：教會內部資料的保護機制
3. **Windows 11 設計語言**：整體視覺和交互設計標準
4. **TypeScript 類型安全**：所有代碼必須有完整類型定義
5. **RESTful API 設計**：API 端點和回應格式標準

### 變更記錄要求

每次規格書更新必須包含：
- 變更日期和執行者
- 變更原因和業務需求
- 影響範圍分析
- 相關代碼和文檔的同步更新

## 開發規範

### 代碼標準

- **TypeScript**：嚴格模式，完整型別定義
- **ESLint + Prettier**：代碼格式化和檢查
- **Git Hooks**：提交前自動檢查
- **單元測試**：重要功能要有測試覆蓋

### 版本控制

- **Git Flow**：採用 Git Flow 分支策略
- **語義化版本**：遵循 SemVer 規範
- **Changelog**：維護詳細的變更記錄

### 文檔標準

- **API 文檔**：使用 Swagger/OpenAPI
- **代碼註解**：關鍵功能要有詳細註解
- **部署指南**：完整的部署和維護文檔

## 測試策略

### 前端測試

- **單元測試**：Vue Test Utils + Vitest
- **組件測試**：自定義組件庫測試
- **E2E 測試**：Playwright 端對端測試

### 後端測試

- **單元測試**：Go 內建測試框架
- **API 測試**：Postman/Newman 自動化測試
- **效能測試**：Apache Bench 或 wrk

### 整合測試

- **容器測試**：docker-compose 環境測試
- **安全測試**：OWASP ZAP 安全掃描
- **相容性測試**：多瀏覽器支援測試

## 專案里程碑

### Phase 1：基礎架構（2週）

- [ ] 專案初始化和開發環境建置
- [ ] 基礎組件庫開發
- [ ] 用戶認證系統
- [ ] 基本檔案上傳/下載功能

### Phase 2：核心功能（3週）

- [ ] 檔案管理完整功能
- [ ] 資料夾操作和檔案組織
- [ ] 垃圾桶系統
- [ ] 用戶權限管理

### Phase 3：進階功能（2週）

- [ ] 檔案分享功能
- [ ] 搜尋和篩選功能
- [ ] 管理員後台
- [ ] 操作記錄和統計

### Phase 4：優化和部署（1週）

- [ ] 效能優化和測試
- [ ] 容器化部署
- [ ] 文檔完善
- [ ] 正式上線

## 維護和支援

### 監控策略

- **應用監控**：健康檢查端點
- **記錄管理**：結構化記錄和告警
- **備份監控**：自動備份驗證

### 升級策略

- **滾動更新**：零停機時間升級
- **資料庫遷移**：安全的 schema 變更
- **回滾計劃**：快速回滾機制

### 技術支援

- **用戶手冊**：詳細的使用說明
- **常見問題**：FAQ 和故障排除
- **技術文檔**：管理員操作指南

---

**文檔版本**：v1.0  
**創建日期**：2025-05-26  
**最後更新**：2025-05-26  
**負責人**：TARS AI Assistant  

> 本規格書將隨著專案進展持續更新，所有變更都會在 CHANGELOG.md 中詳細記錄。
