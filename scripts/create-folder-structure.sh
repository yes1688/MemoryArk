#!/bin/bash

# MemoryArk2 教會影音回憶錄系統 - 資料夾結構建立腳本
# 為真耶穌教會設計的實用檔案組織系統

set -e

# 基礎目錄路徑
BASE_DIR="uploads/files"
CURRENT_YEAR=$(date +%Y)

echo "🏛️  為 MemoryArk2 教會影音回憶錄系統建立資料夾結構..."
echo "📅 目前年份: $CURRENT_YEAR"
echo ""

# 創建主要分類目錄
create_main_categories() {
    echo "📁 建立主要分類目錄..."
    
    # 1. 按年份組織 (最近5年)
    for year in $(seq $((CURRENT_YEAR-2)) $((CURRENT_YEAR+2))); do
        mkdir -p "$BASE_DIR/按年份分類/$year年"
    done
    
    # 2. 按教會活動分類
    mkdir -p "$BASE_DIR/教會活動分類"
    
    # 3. 按內容類型分類
    mkdir -p "$BASE_DIR/按內容類型分類"
    
    # 4. 按部門分類
    mkdir -p "$BASE_DIR/按部門分類"
    
    # 5. 特殊分類
    mkdir -p "$BASE_DIR/特殊分類"
    
    echo "✅ 主要分類目錄創建完成"
}

# 創建教會活動子目錄
create_church_activities() {
    echo "📁 建立教會活動子目錄..."
    
    ACTIVITY_DIR="$BASE_DIR/教會活動分類"
    
    # 重要節期
    mkdir -p "$ACTIVITY_DIR/重要節期/聖誕節"
    mkdir -p "$ACTIVITY_DIR/重要節期/復活節"
    mkdir -p "$ACTIVITY_DIR/重要節期/逾越節"
    mkdir -p "$ACTIVITY_DIR/重要節期/五旬節"
    mkdir -p "$ACTIVITY_DIR/重要節期/住棚節"
    
    # 聖禮典
    mkdir -p "$ACTIVITY_DIR/聖禮典/洗禮"
    mkdir -p "$ACTIVITY_DIR/聖禮典/聖餐禮"
    mkdir -p "$ACTIVITY_DIR/聖禮典/洗腳禮"
    mkdir -p "$ACTIVITY_DIR/聖禮典/按手禮"
    
    # 聚會活動
    mkdir -p "$ACTIVITY_DIR/聚會活動/安息日聚會"
    mkdir -p "$ACTIVITY_DIR/聚會活動/週三聚會"
    mkdir -p "$ACTIVITY_DIR/聚會活動/禱告會"
    mkdir -p "$ACTIVITY_DIR/聚會活動/查經班"
    mkdir -p "$ACTIVITY_DIR/聚會活動/靈恩會"
    mkdir -p "$ACTIVITY_DIR/聚會活動/培靈會"
    
    # 特別聚會
    mkdir -p "$ACTIVITY_DIR/特別聚會/佈道會"
    mkdir -p "$ACTIVITY_DIR/特別聚會/感恩見證會"
    mkdir -p "$ACTIVITY_DIR/特別聚會/詩頌讚美會"
    mkdir -p "$ACTIVITY_DIR/特別聚會/年終感恩聚會"
    mkdir -p "$ACTIVITY_DIR/特別聚會/新年祈禱會"
    
    # 教會慶典
    mkdir -p "$ACTIVITY_DIR/教會慶典/建堂週年紀念"
    mkdir -p "$ACTIVITY_DIR/教會慶典/牧師就職典禮"
    mkdir -p "$ACTIVITY_DIR/教會慶典/獻堂典禮"
    mkdir -p "$ACTIVITY_DIR/教會慶典/重要紀念活動"
    
    echo "✅ 教會活動子目錄創建完成"
}

# 創建內容類型子目錄
create_content_types() {
    echo "📁 建立內容類型子目錄..."
    
    TYPE_DIR="$BASE_DIR/按內容類型分類"
    
    # 影音內容
    mkdir -p "$TYPE_DIR/影片/講道錄影"
    mkdir -p "$TYPE_DIR/影片/聚會實況"
    mkdir -p "$TYPE_DIR/影片/見證分享"
    mkdir -p "$TYPE_DIR/影片/詩歌讚美"
    mkdir -p "$TYPE_DIR/影片/教育訓練"
    mkdir -p "$TYPE_DIR/影片/活動紀錄"
    
    mkdir -p "$TYPE_DIR/音檔/講道錄音"
    mkdir -p "$TYPE_DIR/音檔/詩歌音樂"
    mkdir -p "$TYPE_DIR/音檔/禱告錄音"
    mkdir -p "$TYPE_DIR/音檔/見證分享"
    
    # 圖片內容
    mkdir -p "$TYPE_DIR/照片/聚會照片"
    mkdir -p "$TYPE_DIR/照片/活動照片"
    mkdir -p "$TYPE_DIR/照片/團契照片"
    mkdir -p "$TYPE_DIR/照片/教會建築"
    mkdir -p "$TYPE_DIR/照片/歷史照片"
    mkdir -p "$TYPE_DIR/照片/人物照片"
    
    # 文件資料
    mkdir -p "$TYPE_DIR/文件/講道稿"
    mkdir -p "$TYPE_DIR/文件/查經資料"
    mkdir -p "$TYPE_DIR/文件/教會公告"
    mkdir -p "$TYPE_DIR/文件/會議記錄"
    mkdir -p "$TYPE_DIR/文件/歷史文獻"
    mkdir -p "$TYPE_DIR/文件/教材講義"
    
    # 簡報投影片
    mkdir -p "$TYPE_DIR/簡報/講道簡報"
    mkdir -p "$TYPE_DIR/簡報/教學簡報"
    mkdir -p "$TYPE_DIR/簡報/活動簡報"
    mkdir -p "$TYPE_DIR/簡報/詩歌投影片"
    
    echo "✅ 內容類型子目錄創建完成"
}

# 創建部門分類子目錄
create_departments() {
    echo "📁 建立部門分類子目錄..."
    
    DEPT_DIR="$BASE_DIR/按部門分類"
    
    # 年齡部門
    mkdir -p "$DEPT_DIR/青年團契"
    mkdir -p "$DEPT_DIR/青年團契/青年聚會"
    mkdir -p "$DEPT_DIR/青年團契/青年活動"
    mkdir -p "$DEPT_DIR/青年團契/青年服事"
    
    mkdir -p "$DEPT_DIR/婦女團契"
    mkdir -p "$DEPT_DIR/婦女團契/婦女聚會"
    mkdir -p "$DEPT_DIR/婦女團契/婦女活動"
    mkdir -p "$DEPT_DIR/婦女團契/婦女服事"
    
    mkdir -p "$DEPT_DIR/兒童主日學"
    mkdir -p "$DEPT_DIR/兒童主日學/兒童聚會"
    mkdir -p "$DEPT_DIR/兒童主日學/兒童活動"
    mkdir -p "$DEPT_DIR/兒童主日學/教學資料"
    
    mkdir -p "$DEPT_DIR/少年團契"
    mkdir -p "$DEPT_DIR/少年團契/少年聚會"
    mkdir -p "$DEPT_DIR/少年團契/少年活動"
    mkdir -p "$DEPT_DIR/少年團契/少年服事"
    
    # 事工部門
    mkdir -p "$DEPT_DIR/詩班事工"
    mkdir -p "$DEPT_DIR/詩班事工/詩歌練習"
    mkdir -p "$DEPT_DIR/詩班事工/詩歌表演"
    mkdir -p "$DEPT_DIR/詩班事工/樂器訓練"
    
    mkdir -p "$DEPT_DIR/教育事工"
    mkdir -p "$DEPT_DIR/教育事工/成人教育"
    mkdir -p "$DEPT_DIR/教育事工/兒童教育"
    mkdir -p "$DEPT_DIR/教育事工/師資培訓"
    
    mkdir -p "$DEPT_DIR/傳道事工"
    mkdir -p "$DEPT_DIR/傳道事工/佈道活動"
    mkdir -p "$DEPT_DIR/傳道事工/訪問關懷"
    mkdir -p "$DEPT_DIR/傳道事工/福音工作"
    
    mkdir -p "$DEPT_DIR/關懷事工"
    mkdir -p "$DEPT_DIR/關懷事工/探訪記錄"
    mkdir -p "$DEPT_DIR/關懷事工/關懷活動"
    mkdir -p "$DEPT_DIR/關懷事工/社區服務"
    
    # 行政部門
    mkdir -p "$DEPT_DIR/執事會"
    mkdir -p "$DEPT_DIR/執事會/會議記錄"
    mkdir -p "$DEPT_DIR/執事會/決議事項"
    mkdir -p "$DEPT_DIR/執事會/年度報告"
    
    mkdir -p "$DEPT_DIR/財務組"
    mkdir -p "$DEPT_DIR/財務組/奉獻記錄"
    mkdir -p "$DEPT_DIR/財務組/支出記錄"
    mkdir -p "$DEPT_DIR/財務組/財務報表"
    
    echo "✅ 部門分類子目錄創建完成"
}

# 創建特殊分類子目錄
create_special_categories() {
    echo "📁 建立特殊分類子目錄..."
    
    SPECIAL_DIR="$BASE_DIR/特殊分類"
    
    # 歷史保存
    mkdir -p "$SPECIAL_DIR/歷史保存/教會創立歷史"
    mkdir -p "$SPECIAL_DIR/歷史保存/重要人物"
    mkdir -p "$SPECIAL_DIR/歷史保存/歷史文獻"
    mkdir -p "$SPECIAL_DIR/歷史保存/老照片珍藏"
    
    # 紀念專輯
    mkdir -p "$SPECIAL_DIR/紀念專輯/已故信徒紀念"
    mkdir -p "$SPECIAL_DIR/紀念專輯/牧師紀念專輯"
    mkdir -p "$SPECIAL_DIR/紀念專輯/重要事件紀念"
    
    # 培訓資源
    mkdir -p "$SPECIAL_DIR/培訓資源/講道訓練"
    mkdir -p "$SPECIAL_DIR/培訓資源/事奉訓練"
    mkdir -p "$SPECIAL_DIR/培訓資源/靈修資料"
    mkdir -p "$SPECIAL_DIR/培訓資源/查經指南"
    
    # 節慶活動
    mkdir -p "$SPECIAL_DIR/節慶活動/生日慶祝"
    mkdir -p "$SPECIAL_DIR/節慶活動/結婚典禮"
    mkdir -p "$SPECIAL_DIR/節慶活動/畢業典禮"
    mkdir -p "$SPECIAL_DIR/節慶活動/其他慶典"
    
    # 外展活動
    mkdir -p "$SPECIAL_DIR/外展活動/聯合聚會"
    mkdir -p "$SPECIAL_DIR/外展活動/教會間交流"
    mkdir -p "$SPECIAL_DIR/外展活動/宣教活動"
    mkdir -p "$SPECIAL_DIR/外展活動/社區服務"
    
    echo "✅ 特殊分類子目錄創建完成"
}

# 創建年度子目錄結構
create_yearly_structure() {
    echo "📁 為每個年份建立詳細子目錄..."
    
    for year in $(seq $((CURRENT_YEAR-2)) $((CURRENT_YEAR+2))); do
        YEAR_DIR="$BASE_DIR/按年份分類/$year年"
        
        # 按月份分類
        for month in {01..12}; do
            mkdir -p "$YEAR_DIR/按月份/$month月"
        done
        
        # 重要活動
        mkdir -p "$YEAR_DIR/重要活動/節期慶典"
        mkdir -p "$YEAR_DIR/重要活動/特別聚會"
        mkdir -p "$YEAR_DIR/重要活動/教會活動"
        
        # 定期聚會
        mkdir -p "$YEAR_DIR/定期聚會/安息日聚會"
        mkdir -p "$YEAR_DIR/定期聚會/週三聚會"
        mkdir -p "$YEAR_DIR/定期聚會/禱告會"
        
        # 年度總結
        mkdir -p "$YEAR_DIR/年度總結/年終報告"
        mkdir -p "$YEAR_DIR/年度總結/感恩見證"
        mkdir -p "$YEAR_DIR/年度總結/統計資料"
    done
    
    echo "✅ 年度子目錄結構創建完成"
}

# 創建說明文件
create_documentation() {
    echo "📁 創建資料夾使用說明文件..."
    
    # 主要說明文件
    cat > "$BASE_DIR/📖 資料夾使用說明.md" << 'EOF'
# MemoryArk2 教會影音回憶錄系統 - 資料夾使用指南

## 🏛️ 系統概述

本系統專為真耶穌教會設計，提供完整的影音檔案管理和組織功能。資料夾結構依照教會實際需求設計，方便信徒和同工快速找到所需資料。

## 📁 主要分類說明

### 1. 按年份分類
- **用途**：依照時間順序保存檔案，便於追溯歷史
- **結構**：年份 > 月份 > 具體活動
- **適用**：所有需要按時間查找的檔案

### 2. 教會活動分類
- **用途**：依照教會活動性質分類
- **包含**：重要節期、聖禮典、聚會活動、特別聚會、教會慶典
- **適用**：按活動類型查找檔案

### 3. 按內容類型分類
- **用途**：依照檔案格式和內容性質分類
- **包含**：影片、音檔、照片、文件、簡報
- **適用**：需要特定格式檔案時查找

### 4. 按部門分類
- **用途**：依照教會組織架構分類
- **包含**：各年齡團契、事工部門、行政部門
- **適用**：部門專屬檔案管理

### 5. 特殊分類
- **用途**：重要但不常見的檔案分類
- **包含**：歷史保存、紀念專輯、培訓資源、節慶活動、外展活動
- **適用**：特殊需求和長期保存

## 📝 命名規範建議

### 檔案命名格式
```
日期_活動名稱_內容描述_版本
例如：20250608_安息日聚會_講道錄影_v1.mp4
```

### 資料夾命名格式
```
年份/主要分類/次要分類/具體內容
例如：2025年/教會活動分類/聖禮典/洗禮
```

## 🎯 使用建議

### 上傳檔案時
1. 先確定檔案性質和用途
2. 選擇最合適的分類方式
3. 使用清楚的檔名描述
4. 添加相關標籤便於搜尋

### 查找檔案時
1. 優先使用搜尋功能
2. 根據記憶選擇分類方式
3. 利用篩選功能縮小範圍
4. 查看最近訪問記錄

### 管理檔案時
1. 定期整理和歸檔
2. 刪除重複或無用檔案
3. 更新檔案標籤和描述
4. 備份重要檔案

## 📞 技術支援

如有任何使用問題，請聯繫：
- 系統管理員
- 或參考系統內建的說明文檔

---
*建立日期：2025年6月8日*
*適用版本：MemoryArk 2.0*
EOF

    # 各分類專用說明
    cat > "$BASE_DIR/教會活動分類/📝 活動分類說明.md" << 'EOF'
# 教會活動分類使用說明

## 🎯 分類原則
按照真耶穌教會的活動性質和重要程度分類

## 📅 重要節期
- 聖誕節、復活節、逾越節、五旬節、住棚節
- 上傳相關慶祝活動的影音檔案

## ⛪ 聖禮典
- 洗禮、聖餐禮、洗腳禮、按手禮
- 記錄神聖時刻的珍貴影音

## 🙏 聚會活動
- 定期聚會：安息日聚會、週三聚會、禱告會
- 教育聚會：查經班、靈恩會、培靈會

## ✨ 特別聚會
- 佈道會、感恩見證會、詩頌讚美會
- 季節性聚會：年終感恩、新年祈禱

## 🏛️ 教會慶典
- 建堂週年、牧師就職、獻堂典禮
- 重要紀念活動和里程碑事件
EOF

    cat > "$BASE_DIR/按部門分類/📝 部門分類說明.md" << 'EOF'
# 按部門分類使用說明

## 👥 年齡分組
- **青年團契**：18-35歲信徒活動
- **婦女團契**：姊妹專屬聚會和服事
- **兒童主日學**：12歲以下兒童教育
- **少年團契**：13-17歲青少年活動

## 🎼 事工部門
- **詩班事工**：音樂、詩歌相關活動
- **教育事工**：教學、培訓相關內容
- **傳道事工**：佈道、宣教相關工作
- **關懷事工**：探訪、照顧相關服務

## 📋 行政部門
- **執事會**：教會治理相關文件
- **財務組**：奉獻、支出相關記錄

## 📂 檔案管理建議
1. 每個部門負責自己的檔案管理
2. 重要檔案需要備份到年份分類
3. 定期清理過期或重複檔案
4. 保持檔名的一致性和清晰度
EOF

    echo "✅ 說明文件創建完成"
}

# 創建示範檔案
create_sample_files() {
    echo "📁 創建示範子資料夾和說明..."
    
    # 在一些重要目錄中創建示範子目錄
    mkdir -p "$BASE_DIR/按年份分類/${CURRENT_YEAR}年/按月份/$(date +%m)月/本月重要活動"
    mkdir -p "$BASE_DIR/教會活動分類/聚會活動/安息日聚會/$(date +%Y)年記錄"
    mkdir -p "$BASE_DIR/按內容類型分類/影片/講道錄影/$(date +%Y)年"
    mkdir -p "$BASE_DIR/按部門分類/青年團契/青年聚會/$(date +%Y)年活動"
    
    # 創建README文件在關鍵目錄
    echo "# 本月重要活動檔案" > "$BASE_DIR/按年份分類/${CURRENT_YEAR}年/按月份/$(date +%m)月/本月重要活動/README.md"
    echo "請將本月的重要教會活動影音檔案上傳至此目錄" >> "$BASE_DIR/按年份分類/${CURRENT_YEAR}年/按月份/$(date +%m)月/本月重要活動/README.md"
    
    echo "✅ 示範檔案創建完成"
}

# 設置權限
set_permissions() {
    echo "🔐 設置目錄權限..."
    
    # 確保目錄可讀寫
    find "$BASE_DIR" -type d -exec chmod 755 {} \;
    find "$BASE_DIR" -type f -exec chmod 644 {} \;
    
    echo "✅ 權限設置完成"
}

# 主執行函數
main() {
    echo "🚀 開始建立 MemoryArk2 教會影音回憶錄系統資料夾結構"
    echo ""
    
    # 檢查基礎目錄是否存在
    if [ ! -d "uploads" ]; then
        mkdir -p uploads
    fi
    
    # 執行各項建立任務
    create_main_categories
    echo ""
    
    create_church_activities
    echo ""
    
    create_content_types
    echo ""
    
    create_departments
    echo ""
    
    create_special_categories
    echo ""
    
    create_yearly_structure
    echo ""
    
    create_documentation
    echo ""
    
    create_sample_files
    echo ""
    
    set_permissions
    echo ""
    
    echo "🎉 MemoryArk2 教會影音回憶錄系統資料夾結構建立完成！"
    echo ""
    echo "📊 統計資訊："
    echo "   - 主要分類: 5 個"
    echo "   - 子分類: $(find "$BASE_DIR" -type d | wc -l) 個目錄"
    echo "   - 說明文件: $(find "$BASE_DIR" -name "*.md" | wc -l) 個"
    echo ""
    echo "📍 資料夾位置: $BASE_DIR"
    echo "📖 使用說明: $BASE_DIR/📖 資料夾使用說明.md"
    echo ""
    echo "✨ 系統已準備就緒，可以開始上傳教會的珍貴影音回憶！"
}

# 執行主函數
main "$@"