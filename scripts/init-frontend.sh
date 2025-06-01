#!/bin/bash

# MemoryArk 2.0 前端開發腳本（在容器內執行）

set -e

echo "🎨 初始化 Vue 3 前端開發環境..."

# 檢查是否在容器內
if [ ! -f /.dockerenv ] && [ "$container" != "podman" ]; then
    echo "❌ 此腳本應在開發容器內執行"
    echo "請先執行: ./scripts/dev-shell.sh"
    exit 1
fi

# 進入前端目錄
cd /app/frontend

# 檢查是否已初始化 npm 專案
if [ ! -f "package.json" ]; then
    echo "📦 初始化 Vue 3 專案..."
    npm create vue@latest . -- --typescript --router --pinia --eslint --prettier
    echo "✅ Vue 3 專案已初始化"
fi

# 安裝額外依賴
echo "📥 安裝額外依賴..."
npm install --save-dev @types/node
npm install element-plus @element-plus/icons-vue
npm install axios
npm install tailwindcss postcss autoprefixer
npm install @vueuse/core

# 初始化 Tailwind CSS
if [ ! -f "tailwind.config.js" ]; then
    echo "🎨 初始化 Tailwind CSS..."
    npx tailwindcss init -p
fi

echo "✅ 前端依賴安裝完成！"
echo ""
echo "🚀 開發命令："
echo "  啟動開發服務器: npm run dev"
echo "  構建專案: npm run build"
echo "  代碼檢查: npm run lint"
