#!/bin/bash

# LINE 環境變數設定腳本
# 用於安全地設定 LINE API 憑證

set -e

echo "========================================="
echo "LINE API 環境變數設定工具"
echo "========================================="
echo ""

# 檢查是否已存在 .env 檔案
if [ -f ".env" ]; then
    echo "⚠️  發現已存在的 .env 檔案"
    read -p "是否要備份現有的 .env 檔案? (y/n): " backup_choice
    if [ "$backup_choice" = "y" ]; then
        backup_file=".env.backup.$(date +%Y%m%d_%H%M%S)"
        cp .env "$backup_file"
        echo "✅ 已備份至: $backup_file"
    fi
    echo ""
fi

# 檢查是否有範本檔案
if [ ! -f ".env.line.example" ]; then
    echo "❌ 錯誤: 找不到 .env.line.example 範本檔案"
    exit 1
fi

# 複製範本
cp .env.line.example .env.tmp

echo "請輸入您的 LINE API 憑證資訊："
echo "（提示：這些資訊可在 LINE Developers Console 中找到）"
echo ""

# 讀取 Channel Access Token
echo "1. Channel Access Token"
echo "   (一個很長的字串，通常超過 100 個字元)"
read -p "   請輸入: " channel_access_token
if [ -n "$channel_access_token" ]; then
    sed -i.bak "s|LINE_CHANNEL_ACCESS_TOKEN=.*|LINE_CHANNEL_ACCESS_TOKEN=$channel_access_token|" .env.tmp
fi

echo ""

# 讀取 Channel Secret
echo "2. Channel Secret"
echo "   (32 個字元的十六進位字串)"
read -p "   請輸入: " channel_secret
if [ -n "$channel_secret" ]; then
    sed -i.bak "s|LINE_CHANNEL_SECRET=.*|LINE_CHANNEL_SECRET=$channel_secret|" .env.tmp
fi

echo ""

# 讀取 Channel ID
echo "3. Channel ID"
echo "   (10 位數字)"
read -p "   請輸入: " channel_id
if [ -n "$channel_id" ]; then
    sed -i.bak "s|LINE_CHANNEL_ID=.*|LINE_CHANNEL_ID=$channel_id|" .env.tmp
fi

echo ""

# 讀取 Official Account ID
echo "4. Official Account ID"
echo "   (以 @ 開頭的 ID，例如: @123abcde)"
read -p "   請輸入: " official_account_id
if [ -n "$official_account_id" ]; then
    sed -i.bak "s|LINE_OFFICIAL_ACCOUNT_ID=.*|LINE_OFFICIAL_ACCOUNT_ID=$official_account_id|" .env.tmp
fi

echo ""

# 確認 Webhook URL
echo "5. Webhook URL"
echo "   預設: https://line.94work.net/webhook/line"
read -p "   是否使用預設值? (y/n): " use_default_webhook
if [ "$use_default_webhook" != "y" ]; then
    read -p "   請輸入自訂 Webhook URL: " webhook_url
    if [ -n "$webhook_url" ]; then
        sed -i.bak "s|LINE_WEBHOOK_URL=.*|LINE_WEBHOOK_URL=$webhook_url|" .env.tmp
    fi
fi

echo ""

# 清理暫存檔案
rm -f .env.tmp.bak

# 合併或創建 .env 檔案
if [ -f ".env" ]; then
    echo "正在合併 LINE 設定到現有的 .env 檔案..."
    
    # 移除現有的 LINE 相關設定
    grep -v "^LINE_" .env > .env.filtered || true
    
    # 只提取 LINE 相關設定
    grep "^LINE_" .env.tmp > .env.line || true
    
    # 合併檔案
    cat .env.filtered .env.line > .env.new
    mv .env.new .env
    
    # 清理暫存檔案
    rm -f .env.filtered .env.line .env.tmp
else
    echo "正在創建新的 .env 檔案..."
    mv .env.tmp .env
fi

echo ""
echo "========================================="
echo "✅ 環境變數設定完成！"
echo "========================================="
echo ""
echo "下一步："
echo "1. 檢查 .env 檔案確認設定正確"
echo "2. 重啟 Docker 容器以載入新設定："
echo "   docker-compose down && docker-compose up -d"
echo ""
echo "⚠️  安全提醒："
echo "- .env 檔案包含敏感資訊，請勿提交到 Git"
echo "- 請確保 .gitignore 包含 .env"
echo "- 定期更新您的 API 憑證"
echo ""

# 驗證 .gitignore
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo "⚠️  警告: .gitignore 可能未包含 .env"
    read -p "是否要將 .env 加入 .gitignore? (y/n): " add_gitignore
    if [ "$add_gitignore" = "y" ]; then
        echo ".env" >> .gitignore
        echo "✅ 已將 .env 加入 .gitignore"
    fi
fi

# 設定檔案權限
chmod 600 .env
echo "✅ 已設定 .env 檔案權限為 600 (僅擁有者可讀寫)"

echo ""
echo "完成！"