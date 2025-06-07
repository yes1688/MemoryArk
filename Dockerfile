# 後端建構階段
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN go build -o server ./cmd/server

# 最終運行階段
FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app

# 複製後端執行檔
COPY --from=backend-builder /app/server ./

# 暴露端口
EXPOSE 8080

# 啟動後端服務
CMD ["./server"]