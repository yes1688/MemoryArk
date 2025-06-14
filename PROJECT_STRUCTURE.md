# MemoryArk 2.0 項目結構

## 📁 根目錄結構

```
MemoryArk2/
├── 📋 配置文件
│   ├── docker-compose.yml      # Docker 部署配置
│   ├── nginx.conf              # Nginx 配置
│   ├── Dockerfile              # Docker 構建文件
│   └── .gitignore              # Git 忽略文件
│
├── 🚀 部署腳本
│   └── deploy.sh               # 統一部署腳本
│
├── 📚 文檔
│   ├── README.md               # 項目說明
│   ├── CLAUDE.md               # AI 助理指南
│   ├── CHANGELOG.md            # 更新日誌
│   ├── SPECIFICATION.md        # 技術規格
│   ├── LICENSE                 # 授權條款
│   └── docs/                   # 詳細文檔
│       ├── deployment/         # 部署相關
│       ├── architecture/       # 架構設計
│       ├── development/        # 開發指南
│       ├── operations/         # 運維指南
│       └── testing/            # 測試指南
│
├── 🔧 後端 (Go)
│   └── backend/
│       ├── cmd/server/         # 主程序入口
│       ├── internal/           # 內部包
│       │   ├── api/            # API 處理器
│       │   ├── auth/           # 認證模組
│       │   ├── config/         # 配置管理
│       │   ├── database/       # 數據庫操作
│       │   ├── middleware/     # 中間件
│       │   ├── models/         # 數據模型
│       │   └── services/       # 業務邏輯
│       ├── pkg/                # 公共包
│       ├── migrations/         # 數據庫遷移
│       ├── go.mod              # Go 模組定義
│       └── go.sum              # 依賴鎖定
│
├── 🎨 前端 (Vue 3 + TypeScript)
│   └── frontend/
│       ├── src/
│       │   ├── api/            # API 調用
│       │   ├── components/     # Vue 組件
│       │   │   └── ui/         # UI 組件庫
│       │   ├── composables/    # Vue 組合式函數
│       │   ├── router/         # 路由配置
│       │   ├── stores/         # 狀態管理 (Pinia)
│       │   ├── styles/         # 樣式文件
│       │   ├── types/          # TypeScript 類型
│       │   ├── utils/          # 工具函數
│       │   └── views/          # 頁面組件
│       ├── public/             # 靜態資源
│       ├── package.json        # Node.js 依賴
│       ├── vite.config.ts      # Vite 配置
│       ├── tailwind.config.js  # Tailwind CSS 配置
│       └── tsconfig.json       # TypeScript 配置
│
├── 🧪 測試
│   └── testing/
│       ├── frontend/           # 前端測試
│       ├── integration-tests/  # 整合測試
│       ├── performance-tests/  # 性能測試
│       ├── security-tests/     # 安全測試
│       ├── unit-tests/         # 單元測試
│       └── utils/              # 測試工具
│
├── 🏃‍♂️ 運行時 (運行時生成，不納入版控)
│   ├── data/                   # 數據庫文件
│   ├── uploads/                # 上傳文件
│   └── logs/                   # 日誌文件
│
└── 📦 其他
    ├── config/                 # 環境配置
    └── Makefile                # 構建腳本
```

## 🎯 核心文件說明

### 部署相關
- **deploy.sh**: 統一部署腳本，自動檢測環境（Docker/Podman）
- **docker-compose.yml**: 容器編排配置，支持開發和生產環境
- **nginx.conf**: Web 服務器配置，處理前端和 API 代理

### 後端核心
- **cmd/server/main.go**: 應用程序入口點
- **internal/api/**: REST API 實現
- **internal/middleware/**: 認證、日誌等中間件
- **internal/models/**: 數據模型定義

### 前端核心
- **src/main.ts**: Vue 應用入口
- **src/router/**: Vue Router 路由配置
- **src/stores/**: Pinia 狀態管理
- **src/components/ui/**: 可重用 UI 組件

### 配置文件
- **CLAUDE.md**: AI 助理的項目指南和約束
- **.gitignore**: Git 版本控制忽略規則
- **package.json**: 前端依賴和腳本定義

## 🚀 快速開始

1. **部署生產環境**:
   ```bash
   ./deploy.sh up production
   ```

2. **啟動開發環境**:
   ```bash
   ./deploy.sh up dev
   ```

3. **查看服務狀態**:
   ```bash
   ./deploy.sh status
   ```

4. **故障診斷**:
   ```bash
   ./deploy.sh diagnose
   ```

## 📝 開發規範

### 文件命名
- **組件**: PascalCase (如 `FileCard.vue`)
- **工具函數**: camelCase (如 `formatFileSize.ts`)
- **常量**: UPPER_SNAKE_CASE (如 `API_BASE_URL`)

### 目錄組織
- **按功能分組**: 相關文件放在同一目錄
- **層次清晰**: 避免過深的嵌套
- **命名明確**: 目錄名稱能清楚表達其用途

### 版本控制
- **不提交**: 運行時文件、構建產物、環境配置
- **備份檔案**: 以 `.backup` 結尾的文件不納入版控
- **敏感信息**: SSL 證書、私鑰等存放在 `.env` 或專門的配置文件中