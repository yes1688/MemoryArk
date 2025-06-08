# MemoryArk 2.0 設計改進 PRD
## Product Requirements Document

### 專案概述
**目標**: 將 MemoryArk 2.0 的界面設計提升至具有賈伯斯精神理念的水準
**創建日期**: 2025-06-08
**負責人**: AI Assistant + 用戶

### 核心設計理念
基於賈伯斯的設計哲學，實現以下核心價值：
1. **簡約至上** - "Simplicity is the ultimate sophistication"
2. **完美細節** - "Design is not just what it looks like. Design is how it works"
3. **直覺操作** - "It just works"
4. **情感連結** - "Technology alone is not enough"

### 主要任務清單

#### 階段一：視覺層次重構 ✅
- [x] 分析現有界面問題
  - [x] 使用瀏覽器查看當前界面
  - [x] 識別視覺層次問題
  - [x] 制定改進優先級
- [x] 實施極簡主義設計
  - [x] 創建新的設計系統 (design-system.scss)
  - [x] 實現極簡側邊欄 (MinimalSidebar.vue)
  - [x] 重新設計首頁 (HomeView.vue)
  - [x] 更新主應用佈局 (App.vue)

#### 階段二：核心頁面重設計 ⏳
- [x] 首頁儀表板重構
  - [x] 簡化統計卡片設計
  - [x] 實現單一視覺焦點
  - [x] 優化信息層級
- [x] 檔案瀏覽頁面優化
  - [x] 實現極簡檔案瀏覽界面 (FilesView.vue)
  - [x] 添加流暢懸停動畫效果
  - [x] 優化檔案網格和列表視圖
- [ ] 其他頁面優化
  - [ ] 上傳頁面重設計
  - [ ] 管理員頁面優化

#### 階段三：交互體驗提升 ✨
- [ ] 實現微交互動畫
  - [ ] 按鈕懸停效果
  - [ ] 頁面過渡動畫
  - [ ] 載入狀態優化
- [ ] 手勢操作支援
  - [ ] 拖放功能增強
  - [ ] 滑動手勢支援
  - [ ] 右鍵菜單優化

#### 階段四：細節完善 💎
- [ ] 像素級對齊調整
- [ ] 字體系統優化
- [ ] 圖標重新設計
- [ ] 深色模式完善

### 具體改進項目

#### 1. 首頁設計問題與解決方案
**現有問題**：
- 四個彩色卡片過於搶眼，分散注意力
- 統計數據缺乏視覺層次
- 整體佈局過於擁擠

**解決方案**：
```
- 使用單色系設計，僅在互動時顯示顏色
- 採用卡片陰影而非邊框
- 增加元素間距至少 24px
- 使用 SF Pro 或 Inter 字體
```

#### 2. 導航系統優化
**現有問題**：
- 側邊欄視覺權重過重
- 圖標風格不統一
- 缺乏視覺反饋

**解決方案**：
```
- 採用 macOS 風格的半透明側邊欄
- 統一使用 SF Symbols 風格圖標
- 添加優雅的 hover 效果
```

#### 3. 色彩系統重構
**新色彩方案**：
```scss
// 主色調 - 更柔和優雅
$primary: #007AFF;      // iOS 藍
$secondary: #5856D6;    // 紫色
$success: #34C759;      // 綠色
$warning: #FF9500;      // 橙色
$danger: #FF3B30;       // 紅色

// 中性色 - 更細膩的層次
$gray-50: #F9FAFB;
$gray-100: #F2F2F7;
$gray-200: #E5E5EA;
$gray-300: #D1D1D6;
$gray-400: #C7C7CC;
$gray-500: #AEAEB2;
$gray-600: #8E8E93;
$gray-700: #636366;
$gray-800: #48484A;
$gray-900: #1C1C1E;
```

### 技術實施細節

#### 動畫系統
```css
/* 全局過渡動畫 */
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);

/* 彈性動畫 */
--spring-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--spring-smooth: cubic-bezier(0.4, 0, 0.2, 1);
```

#### 陰影系統
```css
/* 分層陰影 */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-base: 0 4px 6px -1px rgba(0, 0, 0, 0.06);
--shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
```

### 實施優先級
1. **P0 - 立即執行**
   - 簡化首頁設計
   - 優化色彩系統
   - 改進間距系統

2. **P1 - 短期目標**
   - 實現基礎動畫
   - 優化檔案瀏覽體驗
   - 完善響應式設計

3. **P2 - 長期優化**
   - 添加高級手勢
   - 實現 3D 效果
   - 性能優化

### 成功指標
- [ ] 視覺複雜度降低 50%
- [ ] 用戶操作步驟減少 30%
- [ ] 載入時間優化至 2 秒內
- [ ] 動畫流暢度達到 60fps

### 參考資源
- Apple Human Interface Guidelines
- iOS Design Resources
- macOS Big Sur Design System
- Steve Jobs Design Philosophy

### 更新記錄
- 2025-06-08: 初始版本創建，定義核心改進方向

---
**注意**: 此文檔將持續更新，確保任務不會因 token 限制而丟失。每次工作前請先查閱此文檔。