# LINE Service Multi-Stage Dockerfile
# 基於 MemoryArk2 專案的容器化標準

# Stage 1: 建構階段
FROM node:20-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 安裝系統依賴 (建構時需要的工具)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# 複製 package 檔案
COPY package*.json ./
COPY tsconfig.json ./

# 安裝所有依賴 (包含 devDependencies)
RUN npm ci --only=production=false

# 複製原始碼
COPY src/ ./src/

# 建構 TypeScript
RUN npm run build

# 清理 devDependencies (只保留 production dependencies)
RUN npm ci --only=production && npm cache clean --force

# Stage 2: 生產階段
FROM node:20-alpine AS production

# 建立非 root 使用者 (安全性考量)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S lineservice -u 1001 -G nodejs

# 設定工作目錄
WORKDIR /app

# 安裝運行時系統依賴
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 從建構階段複製編譯後的程式碼和依賴
COPY --from=builder --chown=lineservice:nodejs /app/dist ./dist
COPY --from=builder --chown=lineservice:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=lineservice:nodejs /app/package*.json ./

# 建立必要的目錄並設定權限
RUN mkdir -p logs uploads temp && \
    chown -R lineservice:nodejs logs uploads temp

# 切換到非 root 使用者
USER lineservice

# 暴露埠號
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 使用 dumb-init 處理訊號
ENTRYPOINT ["dumb-init", "--"]

# 啟動指令
CMD ["node", "dist/index.js"]