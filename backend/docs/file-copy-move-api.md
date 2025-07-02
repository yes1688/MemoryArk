# 檔案複製/移動 API 使用說明

## API 端點

### 複製檔案
- **URL**: `POST /api/files/copy`
- **認證**: 需要用戶認證
- **說明**: 複製一個或多個檔案/資料夾到指定位置

### 移動檔案
- **URL**: `POST /api/files/move`
- **認證**: 需要用戶認證
- **說明**: 移動一個或多個檔案/資料夾到指定位置

## 請求格式

```json
{
  "file_ids": [1, 2, 3],          // 要操作的檔案ID陣列
  "target_folder_id": 5,          // 目標資料夾ID（null表示根目錄）
  "operation_type": "copy"        // "copy" 或 "move"
}
```

### 參數說明
- `file_ids`: 必填，要操作的檔案ID陣列
- `target_folder_id`: 可選，目標資料夾ID，null 表示移動到根目錄
- `operation_type`: 必填，操作類型，必須是 "copy" 或 "move"

## 回應格式

```json
{
  "success": true,
  "data": {
    "success_count": 2,           // 成功操作的檔案數量
    "failed_count": 1,            // 失敗操作的檔案數量
    "total_count": 3,             // 總檔案數量
    "success_files": [            // 成功操作的檔案列表
      {
        "original_id": 1,
        "new_id": 10,             // 僅複製時有值
        "file_name": "document.pdf",
        "virtual_path": "/folder/document.pdf"
      }
    ],
    "failed_files": [             // 失敗操作的檔案列表
      {
        "original_id": 3,
        "file_name": "image.jpg",
        "error": "沒有權限移動此檔案"
      }
    ]
  }
}
```

## 使用範例

### 複製檔案到指定資料夾

```bash
curl -X POST http://localhost:8081/api/files/copy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "file_ids": [1, 2],
    "target_folder_id": 5,
    "operation_type": "copy"
  }'
```

### 移動檔案到根目錄

```bash
curl -X POST http://localhost:8081/api/files/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "file_ids": [3, 4],
    "target_folder_id": null,
    "operation_type": "move"
  }'
```

## 功能特色

### 批次操作
- 支援同時複製/移動多個檔案
- 每個檔案的操作結果獨立回報
- 部分失敗不會影響其他檔案的操作

### 遞迴處理
- 複製/移動資料夾時會自動包含所有子項目
- 保持完整的目錄結構

### 名稱衝突處理
- 自動檢測目標位置的重複名稱
- 自動重新命名：`filename (1).ext`, `filename (2).ext`
- 如果仍然衝突，使用時間戳：`filename_20250701_143052.ext`

### 去重機制
- 複製檔案時利用 SHA256 去重
- 不會建立重複的實體檔案，節省儲存空間
- 只建立新的資料庫記錄指向相同實體檔案

### 安全檢查
- 權限驗證：只能操作自己上傳的檔案
- 循環依賴檢查：防止將資料夾移動到自己的子目錄
- 事務保護：確保操作的原子性

### 虛擬路徑系統
- 自動更新所有受影響檔案的虛擬路徑
- 移動資料夾時遞迴更新所有子項目路徑
- 保持檔案系統的一致性

## 錯誤處理

### 常見錯誤
- `400 Bad Request`: 請求參數錯誤
- `401 Unauthorized`: 未認證
- `404 Not Found`: 檔案或目標資料夾不存在
- `403 Forbidden`: 沒有權限操作檔案

### 業務邏輯錯誤
- "目標資料夾不存在或無效"
- "不能將資料夾移動到自己的子目錄中"
- "沒有權限移動此檔案"
- "檔案不存在或已刪除"

## WebSocket 事件

操作完成後會廣播以下事件：
- `files_copied`: 檔案複製完成
- `files_moved`: 檔案移動完成

前端可以監聽這些事件來即時更新檔案列表。