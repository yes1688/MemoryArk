# 任務 002：重構檔案管理界面

## 任務概述
將現有的檔案管理界面升級為符合 Windows 11 Files 設計語言的專業界面，提升使用者體驗。

## 依賴項目
- 任務 001：設計系統基礎（必須先完成）

## 子任務詳細說明

### 2.1 重新設計 FilesView 佈局

**目標**：創建類似 Windows 11 檔案總管的界面佈局

**新增功能**：
1. **頂部工具列**
   - 新建資料夾按鈕
   - 上傳檔案按鈕
   - 檢視模式切換（格狀/清單/詳細）
   - 排序選項
   - 搜尋框

2. **側邊欄優化**
   - 快速訪問（收藏夾）
   - 最近使用
   - 共享資料夾
   - 安息日資料專區
   - 垃圾桶

3. **右側資訊面板**
   - 檔案預覽
   - 檔案詳細資訊
   - 檔案活動歷史
   - 快速操作按鈕

4. **主要內容區域**
   - 響應式網格佈局
   - 虛擬滾動（大量檔案時）
   - 拖放支援

### 2.2 FileCard 組件重構

**從現有的 emoji 風格升級為專業設計**

```vue
<!-- 新設計範例 -->
<AppCard 
  :selected="isSelected"
  :hoverable="true"
  @click="handleClick"
  @contextmenu="handleContextMenu"
>
  <template #header>
    <AppFileIcon 
      :file-type="file.mimeType" 
      :size="viewMode === 'grid' ? 'lg' : 'sm'"
      :thumbnail="file.thumbnailUrl"
    />
  </template>
  
  <template #content>
    <h3 class="file-name">{{ file.name }}</h3>
    <p class="file-info">{{ formatSize(file.size) }}</p>
  </template>
  
  <template #footer v-if="showDetails">
    <div class="file-meta">
      <span>{{ formatDate(file.updatedAt) }}</span>
      <span>{{ file.uploaderName }}</span>
    </div>
  </template>
</AppCard>
```

### 2.3 實作拖放功能

**功能需求**：
1. 檔案拖放上傳
2. 檔案/資料夾拖放移動
3. 多選拖放
4. 視覺反饋（拖放區域高亮）

**實作要點**：
```javascript
// 拖放區域組件
const DropZone = {
  setup() {
    const isDragging = ref(false)
    
    const handleDragOver = (e) => {
      e.preventDefault()
      isDragging.value = true
    }
    
    const handleDrop = async (e) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      await uploadFiles(files)
      isDragging.value = false
    }
    
    return { isDragging, handleDragOver, handleDrop }
  }
}
```

### 2.4 檔案預覽功能

**支援的預覽類型**：
1. **圖片**：縮圖 + 全尺寸預覽
2. **影片**：視頻播放器
3. **音頻**：音頻播放器
4. **PDF**：內嵌 PDF 查看器
5. **文字檔案**：語法高亮顯示
6. **Office 文件**：使用 Office Online Viewer

### 2.5 批量操作界面

**功能需求**：
1. 多選模式切換
2. 全選/取消全選
3. 批量操作工具列
   - 批量下載
   - 批量刪除
   - 批量移動
   - 批量添加標籤

### 2.6 搜尋和篩選增強

**新增功能**：
1. 即時搜尋（輸入時搜尋）
2. 進階篩選器
   - 檔案類型
   - 日期範圍
   - 檔案大小
   - 上傳者
   - 標籤
3. 搜尋歷史
4. 儲存的搜尋條件

## 實作順序

1. **第一天**：
   - 重構 FilesView 基本佈局
   - 實作新的工具列
   - 整合側邊欄

2. **第二天**：
   - 重構 FileCard 組件
   - 實作右側資訊面板
   - 整合檢視模式切換

3. **第三天**：
   - 實作拖放功能
   - 實作檔案預覽
   - 實作批量操作

4. **第四天**：
   - 實作進階搜尋篩選
   - 效能優化（虛擬滾動等）
   - 整合測試

## 效能考量

1. **虛擬滾動**：使用 vue-virtual-scroller 處理大量檔案
2. **懶加載**：圖片和縮圖懶加載
3. **防抖搜尋**：避免頻繁 API 請求
4. **快取策略**：快取檔案列表和縮圖

## 測試要點

- [ ] 不同檢視模式切換流暢
- [ ] 拖放功能在各瀏覽器正常運作
- [ ] 大量檔案（1000+）時效能良好
- [ ] 檔案預覽支援各種格式
- [ ] 批量操作正確執行
- [ ] 搜尋篩選結果準確

## 相關 API 需求

需要後端支援的新 API：
1. `GET /api/files/preview/:id` - 獲取檔案預覽
2. `POST /api/files/batch` - 批量操作
3. `GET /api/files/search` - 進階搜尋
4. `PUT /api/files/move` - 移動檔案/資料夾

## 完成標準

- [ ] 界面符合 Windows 11 設計語言
- [ ] 所有新功能正常運作
- [ ] 效能達到預期（載入 1000 個檔案 < 2 秒）
- [ ] 通過所有測試案例
- [ ] 響應式設計支援各種裝置