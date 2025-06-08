#!/bin/bash

# 同步資料庫資料夾到檔案系統
echo "開始同步資料夾結構..."

# 資料庫路徑
DB_PATH="/home/davidliou/MyProject/MemoryArk2/data/memoryark.db"
UPLOAD_PATH="/home/davidliou/MyProject/MemoryArk2/backend/uploads/files"

# 建立基礎目錄
mkdir -p "$UPLOAD_PATH"

# 查詢所有資料夾並建立對應的實體目錄
sqlite3 "$DB_PATH" "SELECT id, name, parent_id FROM files WHERE is_directory = 1 ORDER BY parent_id;" | while IFS='|' read -r id name parent_id; do
    echo "處理資料夾: $name (ID: $id)"
    
    # 根據 parent_id 建立完整路徑
    if [ -z "$parent_id" ]; then
        # 根目錄資料夾
        folder_path="$UPLOAD_PATH/$name"
    else
        # 查詢父資料夾名稱並建立路徑
        parent_path=$(sqlite3 "$DB_PATH" "SELECT file_path FROM files WHERE id = $parent_id;")
        if [ -z "$parent_path" ]; then
            # 如果父資料夾沒有路徑，嘗試建立
            parent_name=$(sqlite3 "$DB_PATH" "SELECT name FROM files WHERE id = $parent_id;")
            folder_path="$UPLOAD_PATH/$parent_name/$name"
        else
            folder_path="$parent_path/$name"
        fi
    fi
    
    # 建立實體目錄
    mkdir -p "$folder_path"
    echo "建立目錄: $folder_path"
    
    # 更新資料庫中的 file_path
    sqlite3 "$DB_PATH" "UPDATE files SET file_path = '$folder_path' WHERE id = $id;"
done

echo "同步完成！"

# 顯示結果
echo ""
echo "資料夾結構："
tree -d "$UPLOAD_PATH" -L 3