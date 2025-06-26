# Task 1.2: 開發環境準備

## 📋 任務描述

建立 Node.js 開發環境，安裝必要的依賴套件，設定開發工具。

**預估時間**：1 天  
**難度**：簡單  
**責任者**：DevOps + 開發者

## 🎯 具體步驟

### Step 1: Node.js 環境安裝 (0.3 天)

#### 1.1 安裝 Node.js 20 LTS
```bash
# 使用 nvm 安裝 (推薦)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# 驗證安裝
node --version  # 應該顯示 v20.x.x
npm --version   # 應該顯示 10.x.x
```

#### 1.2 安裝 TypeScript 和開發工具
```bash
# 全域安裝 TypeScript
npm install -g typescript ts-node nodemon

# 驗證安裝
tsc --version   # 應該顯示 5.x.x
```

### Step 2: 專案結構建立 (0.4 天)

#### 2.1 建立專案目錄
```bash
# 在 MemoryArk2 根目錄下建立
mkdir -p line-service
cd line-service

# 初始化 npm 專案
npm init -y
```

#### 2.2 安裝核心依賴
```bash
# 核心依賴
npm install express @line/bot-sdk cors helmet morgan dotenv
npm install bull redis ioredis axios form-data
npm install winston winston-daily-rotate-file

# 開發依賴
npm install -D typescript @types/node @types/express @types/cors
npm install -D @types/morgan nodemon ts-node eslint prettier
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

#### 2.3 建立專案結構
```bash
mkdir -p src/{config,controllers,services,middleware,types,utils,queues}
mkdir -p tests/{unit,integration,fixtures}
mkdir -p logs
touch src/index.ts
touch .env.example .env.local
touch .gitignore .dockerignore
```

### Step 3: 配置檔案設定 (0.3 天)

#### 3.1 TypeScript 配置
建立 `tsconfig.json`：
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "removeComments": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/config/*": ["config/*"],
      "@/controllers/*": ["controllers/*"],
      "@/services/*": ["services/*"],
      "@/middleware/*": ["middleware/*"],
      "@/types/*": ["types/*"],
      "@/utils/*": ["utils/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist", "coverage"]
}
```

#### 3.2 ESLint 配置
建立 `.eslintrc.js`：
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'warn',
  },
};
```

#### 3.3 Prettier 配置
建立 `.prettierrc`：
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

#### 3.4 Package.json 腳本
更新 `package.json`：
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts"
  }
}
```

### Step 4: 基本應用程式框架 (0.3 天)

#### 4.1 建立基本 Express 應用
建立 `src/index.ts`：
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

// 載入環境變數
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'line-service',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 基本路由
app.get('/', (req, res) => {
  res.json({
    message: 'LINE Service is running',
    endpoints: {
      health: '/health',
      webhook: '/webhook/line'
    }
  });
});

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// 錯誤處理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 啟動伺服器
const server = createServer(app);
server.listen(PORT, () => {
  console.log(`🚀 LINE Service running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});

// 優雅關閉
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});
```

#### 4.2 建立配置管理
建立 `src/config/index.ts`：
```typescript
export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // LINE API
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelId: process.env.LINE_CHANNEL_ID,
  },
  
  // MemoryArk API
  memoryark: {
    apiUrl: process.env.MEMORYARK_API_URL || 'http://localhost:8081',
    apiToken: process.env.MEMORYARK_API_TOKEN,
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
};

// 驗證必要配置
export function validateConfig() {
  const required = [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'MEMORYARK_API_URL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

## ✅ 驗收標準

### 環境檢查
- [ ] Node.js 20.x 安裝成功
- [ ] TypeScript 編譯正常
- [ ] 所有依賴套件安裝完成
- [ ] ESLint 和 Prettier 配置正確

### 應用程式測試
```bash
# 開發環境啟動
npm run dev

# 編譯測試
npm run build

# 程式碼品質檢查
npm run lint
npm run format
```

### 功能驗證
- [ ] `http://localhost:3000/health` 回傳正確的健康狀態
- [ ] `http://localhost:3000/` 回傳 API 資訊
- [ ] 404 頁面正確處理
- [ ] 環境變數載入正常

### 檔案結構檢查
```
line-service/
├── package.json ✓
├── tsconfig.json ✓
├── .eslintrc.js ✓
├── .prettierrc ✓
├── .env.example ✓
├── .gitignore ✓
├── src/
│   ├── index.ts ✓
│   ├── config/
│   │   └── index.ts ✓
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── types/
│   ├── utils/
│   └── queues/
└── tests/
    ├── unit/
    └── integration/
```

## 🚨 注意事項

### 安全性
- 確保 `.env` 檔案不被 Git 追蹤
- 所有敏感資訊使用環境變數
- 生產環境禁用詳細錯誤訊息

### 效能
- 啟用 gzip 壓縮
- 設定適當的 CORS 政策
- 使用 Helmet 提升安全性

### 開發體驗
- 配置自動重新載入
- 設定程式碼格式化工具
- 建立清晰的錯誤處理

## 📞 常見問題

### Q: Node.js 版本衝突
```bash
# 使用 nvm 管理多版本
nvm list
nvm use 20
```

### Q: 權限問題
```bash
# 修復 npm 權限
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Q: TypeScript 編譯錯誤
```bash
# 清除快取重新編譯
rm -rf node_modules dist
npm install
npm run build
```

---

**狀態**：⏳ 待開始  
**指派給**：待分配  
**前置任務**：Task 1.1 (LINE 帳號設定)  
**檢查者**：技術主管