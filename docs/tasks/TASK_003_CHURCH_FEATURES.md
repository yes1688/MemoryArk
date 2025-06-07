# 任務 003：加入教會特色功能

## 任務概述
在系統中融入真耶穌教會的文化特色，創建專屬功能區域，讓系統更貼近教會使用需求。

## 子任務詳細說明

### 3.1 創建「共享資料夾」功能

**目標**：建立教會成員間的資源共享平台

**功能設計**：
1. **資料夾分類**
   - 講道影音
   - 詩歌本
   - 聖經研讀資料
   - 教會活動照片
   - 見證分享
   - 宗教教育教材

2. **權限管理**
   - 一般成員：只能查看和下載
   - 貢獻者：可以上傳到指定資料夾
   - 管理員：完整管理權限

3. **特殊功能**
   - 自動整理（按年份、活動類型）
   - 推薦系統（熱門資源）
   - 訂閱通知（新資源上傳時）

### 3.2 創建「安息日資料」專區

**目標**：專門管理安息日聚會相關資料

**頁面結構**：
```
安息日資料/
├── 講道錄音/
│   ├── 2025年/
│   │   ├── 1月/
│   │   └── 2月/
│   └── 講員分類/
├── 聚會錄影/
├── 週報/
├── 聖餐禮影音/
└── 特別聚會/
```

**特色功能**：
1. **安息日行事曆整合**
   - 顯示每週安息日日期
   - 關聯當日的影音資料
   - 特殊節期標記

2. **講道資料管理**
   - 講員資訊
   - 講題索引
   - 經文索引
   - 相關講義下載

### 3.3 教會視覺元素設計

**色彩方案調整**：
```css
:root {
  /* 主色調 - 莊重的深藍 */
  --church-primary: #1e3a8a;
  --church-primary-light: #3b82f6;
  
  /* 次色調 - 溫暖金色（象徵榮耀） */
  --church-secondary: #f59e0b;
  --church-secondary-light: #fbbf24;
  
  /* 輔助色 - 橄欖綠（和平） */
  --church-accent: #84cc16;
  
  /* 背景色 - 聖潔白 */
  --church-bg: #fafafa;
}
```

**圖標和標誌**：
1. 十字架符號整合
2. 教會 Logo 放置
3. 聖經相關圖標
4. 音符圖標（詩歌）

### 3.4 文案本地化

**術語替換**：
- 「主日」→「安息日」
- 「禮拜」→「聚會」
- 「牧師」→「傳道/長老/執事」
- 星期日 → 星期六（作為主要聚會日）

**新增文案**：
```javascript
const churchTerms = {
  sabbath: '安息日',
  sermon: '講道',
  hymn: '讚美詩',
  prayer: '禱告',
  testimony: '見證',
  holyWork: '聖工',
  spiritualCultivation: '靈修',
  bibleStudy: '查經',
  fellowship: '團契'
}
```

### 3.5 特殊功能模組

**1. 見證分享區**
- 文字見證
- 影音見證
- 見證分類（醫治、恩典、聖靈等）

**2. 代禱事項管理**
- 代禱請求發布
- 代禱事項追蹤
- 感恩見證回饋

**3. 教會公告整合**
- 重要通知置頂
- 活動預告
- 聖工安排

## 實作細節

### 路由設定
```typescript
// 新增路由
{
  path: '/shared',
  name: 'shared',
  component: () => import('@/views/SharedFolderView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/sabbath',
  name: 'sabbath',
  component: () => import('@/views/SabbathDataView.vue'),
  meta: { requiresAuth: true }
}
```

### 導航選單更新
```vue
<!-- 在 App.vue 中加入 -->
<RouterLink to="/shared" class="nav-link">
  <Icon name="folder-share" />
  <span>共享資料夾</span>
</RouterLink>

<RouterLink to="/sabbath" class="nav-link">
  <Icon name="calendar-sabbath" />
  <span>安息日資料</span>
</RouterLink>
```

### 資料庫擴展
```sql
-- 新增教會相關欄位
ALTER TABLE files ADD COLUMN church_category VARCHAR(50);
ALTER TABLE files ADD COLUMN sermon_date DATE;
ALTER TABLE files ADD COLUMN speaker_name VARCHAR(100);
ALTER TABLE files ADD COLUMN bible_reference VARCHAR(200);

-- 教會分類選項
CREATE TABLE church_categories (
  id INTEGER PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  parent_id INTEGER,
  icon VARCHAR(50),
  sort_order INTEGER
);
```

## 測試要點

- [ ] 安息日日期計算正確（週六）
- [ ] 教會術語顯示一致
- [ ] 共享資料夾權限控制正常
- [ ] 講道資料可按多維度檢索
- [ ] 視覺元素符合教會氛圍

## 完成標準

- [x] 共享資料夾功能完整可用 ✅
- [x] 安息日專區資料組織清晰 ✅
- [x] 視覺設計融入教會元素 ✅
- [x] 文案符合教會文化 ✅
- [x] 特殊功能模組運作正常 ✅

## ✅ 任務狀態：已完成 (100% 完成)

**完成日期：** 2025-01-07

**實作成果：**
- ✅ SharedFolderView 頁面 - 教會共享資源平台
- ✅ SabbathDataView 頁面 - 安息日資料專區
- ✅ SharedResourceCard/Item 組件 - 共享資源展示
- ✅ SabbathFileCard/Item 組件 - 安息日檔案展示
- ✅ 教會分類系統（講道影音、詩歌本、聖經研讀等）
- ✅ 安息日行事曆整合
- ✅ 教會配色方案和視覺元素
- ✅ 教會文化專用術語（安息日、聚會、傳道等）