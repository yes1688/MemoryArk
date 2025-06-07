# 任務 001：建立設計系統基礎

## 任務概述
建立符合 Windows 11 Files 設計語言的組件庫和設計系統，作為整個 UI 重構的基礎。

## 子任務詳細說明

### 1.1 建立組件庫結構

**目標**：創建統一的組件庫資料夾結構

**步驟**：
```
frontend/src/components/ui/
├── button/
│   ├── AppButton.vue
│   └── AppButton.stories.js
├── card/
│   ├── AppCard.vue
│   └── AppCard.stories.js
├── input/
│   ├── AppInput.vue
│   └── AppInput.stories.js
├── dialog/
│   ├── AppDialog.vue
│   └── AppDialog.stories.js
├── breadcrumb/
│   ├── AppBreadcrumb.vue
│   └── AppBreadcrumb.stories.js
├── context-menu/
│   ├── AppContextMenu.vue
│   └── AppContextMenu.stories.js
├── file-icon/
│   ├── AppFileIcon.vue
│   └── AppFileIcon.stories.js
└── index.ts  // 統一導出
```

### 1.2 AppButton 組件規格

**功能需求**：
- 支援多種變體：primary, secondary, danger, ghost
- 支援多種尺寸：small, medium, large
- 支援圖標（左側/右側）
- 支援載入狀態
- 支援禁用狀態
- Windows 11 風格的懸停和點擊效果

**樣式參考**：
```css
/* 主要按鈕 */
- 背景：藍色漸變
- 圓角：6px
- 陰影：輕微陰影
- 懸停：稍微變亮 + 陰影增強
- 點擊：按下效果

/* 次要按鈕 */
- 背景：透明
- 邊框：1px 灰色
- 懸停：背景變為淺灰
```

### 1.3 AppCard 組件規格

**功能需求**：
- 支援標題和內容區域
- 可選的頁腳區域
- 支援懸停效果
- 支援選中狀態
- 支援載入骨架屏

**樣式參考**：
```css
- 背景：白色
- 圓角：8px
- 陰影：0 2px 8px rgba(0,0,0,0.1)
- 邊框：1px solid #e5e5e5
- 懸停：陰影加深，邊框顏色變深
```

### 1.4 AppInput 組件規格

**功能需求**：
- 支援各種輸入類型
- 支援前綴/後綴圖標
- 支援錯誤狀態
- 支援清除按鈕
- 支援字數統計
- 支援自動完成

**樣式參考**：
```css
- 高度：40px (medium)
- 圓角：6px
- 邊框：2px solid transparent
- 聚焦：邊框變為藍色
- 錯誤：邊框變為紅色
```

### 1.5 AppDialog 組件規格

**功能需求**：
- 模糊背景遮罩
- 支援多種尺寸
- 支援頁頭、內容、頁腳
- 支援關閉動畫
- 支援確認對話框模式
- 支援全屏模式

**樣式參考**：
```css
- 背景遮罩：backdrop-blur(10px)
- 對話框背景：白色
- 圓角：12px
- 陰影：0 20px 40px rgba(0,0,0,0.2)
- 動畫：從上方滑入
```

### 1.6 AppBreadcrumb 組件規格

**功能需求**：
- 支援點擊導航
- 支援下拉選單（當路徑過長）
- 支援自定義分隔符
- 響應式（移動端自動收縮）

### 1.7 AppContextMenu 組件規格

**功能需求**：
- 右鍵觸發
- 支援多級選單
- 支援圖標和快捷鍵顯示
- 支援分隔線
- 支援禁用項目
- 自動定位防止超出視窗

### 1.8 AppFileIcon 組件規格

**功能需求**：
- 根據檔案類型顯示對應圖標
- 支援多種尺寸
- 支援自定義顏色
- 支援檔案夾展開/收起狀態
- 支援縮圖顯示（圖片類型）

**檔案類型對應**：
- 資料夾：📁 圖標
- 圖片：圖片圖標 + 縮圖
- 影片：影片圖標
- 音頻：音符圖標
- 文檔：根據具體類型（PDF、Word、Excel等）
- 壓縮檔：壓縮圖標
- 程式碼：程式碼圖標
- 其他：通用檔案圖標

## 實作順序

1. **第一天**：
   - 建立資料夾結構
   - 實作 AppButton 組件
   - 實作 AppCard 組件

2. **第二天**：
   - 實作 AppInput 組件
   - 實作 AppDialog 組件
   - 實作 AppFileIcon 組件

3. **第三天**：
   - 實作 AppBreadcrumb 組件
   - 實作 AppContextMenu 組件
   - 整合測試和文檔

## 測試要點

- 每個組件都要有對應的單元測試
- 測試不同 props 組合
- 測試事件處理
- 測試無障礙功能
- 測試響應式表現

## 相關資源

- [Fluent UI Design](https://www.microsoft.com/design/fluent/)
- [Windows 11 Design Principles](https://docs.microsoft.com/en-us/windows/apps/design/)
- [Tailwind CSS](https://tailwindcss.com/)

## 完成標準

- [x] 所有組件都已實作並通過測試 ✅
- [x] 組件支援所有列出的功能 ✅
- [x] 樣式符合 Windows 11 設計語言 ✅
- [x] 有完整的使用文檔 ✅
- [x] 代碼通過 ESLint 檢查 ✅
- [x] 在不同瀏覽器中測試通過 ✅

## ✅ 任務狀態：已完成

**完成日期：** 2025-01-07

**實作成果：**
- ✅ 建立完整的 UI 組件庫 (`src/components/ui/`)
- ✅ 8 個核心組件全部實作完成
- ✅ Tailwind 配置擴展支援 Windows 11 設計系統
- ✅ 教會配色方案整合
- ✅ TypeScript 類型安全
- ✅ 統一的設計規範和動畫系統