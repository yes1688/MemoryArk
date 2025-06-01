# Dockerfile
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Go 應用程序構建階段
FROM golang:1.21-alpine AS backend-builder

# 安裝必要的包
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# 複製 go mod 文件
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# 複製源代碼
COPY backend/ ./

# 構建應用程序
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# 生產階段
FROM alpine:latest

# 安裝運行時依賴
RUN apk --no-cache add ca-certificates tzdata sqlite ffmpeg

WORKDIR /app

# 創建非 root 用戶
RUN addgroup -g 1001 -S appuser && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G appuser appuser

# 創建必要的目錄
RUN mkdir -p /app/data /app/uploads /app/logs /app/static && \
    chown -R appuser:appuser /app

# 複製後端可執行文件
COPY --from=backend-builder /app/main .

# 複製前端構建文件
COPY --from=frontend-builder /app/frontend/dist ./static

# 複製配置文件模板
COPY backend/.env.example ./.env.example

# 設置權限
RUN chmod +x main

# 切換到非 root 用戶
USER appuser

# 暴露端口
EXPOSE 7001

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7001/health || exit 1

# 啟動命令
CMD ["./main"]
