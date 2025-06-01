# MemoryArk 2.0 Makefile for Podman Development

.PHONY: help dev-start dev-stop dev-shell dev-logs init-backend init-frontend clean

# 默認目標設為 help
.DEFAULT_GOAL := help

# 幫助信息
help:
	@echo "🚀 MemoryArk 2.0 開發命令"
	@echo ""
	@echo "基本命令:"
	@echo "  make dev-start     - 啟動開發環境"
	@echo "  make dev-stop      - 停止開發環境"
	@echo "  make dev-shell     - 進入開發容器"
	@echo "  make dev-logs      - 查看容器日誌"
	@echo ""
	@echo "初始化命令:"
	@echo "  make init-backend  - 初始化後端環境"
	@echo "  make init-frontend - 初始化前端環境"
	@echo "  make init-all      - 初始化完整開發環境"
	@echo ""
	@echo "工具命令:"
	@echo "  make clean         - 清理開發環境"
	@echo "  make rebuild       - 重建開發鏡像"

# 啟動開發環境
dev-start:
	@./scripts/dev-start.sh

# 停止開發環境  
dev-stop:
	@./scripts/dev-stop.sh

# 進入開發容器
dev-shell:
	@./scripts/dev-shell.sh

# 查看容器日誌
dev-logs:
	@podman logs -f memoryark-dev

# 初始化後端
init-backend:
	@echo "🔧 在容器內初始化後端..."
	@podman exec -it memoryark-dev /app/scripts/init-backend.sh

# 初始化前端
init-frontend:
	@echo "🎨 在容器內初始化前端..."
	@podman exec -it memoryark-dev /app/scripts/init-frontend.sh

# 初始化完整環境
init-all: init-backend init-frontend
	@echo "✅ 完整開發環境初始化完成！"

# 清理開發環境
clean:
	@echo "🧹 清理開發環境..."
	@podman stop memoryark-dev || true
	@podman rm memoryark-dev || true
	@podman volume rm memoryark-go-modules || true
	@podman volume rm memoryark-node-modules || true
	@echo "✅ 清理完成"

# 重建開發鏡像
rebuild: clean
	@echo "🔨 重建開發鏡像..."
	@podman rmi memoryark-dev:latest || true
	@make dev-start
