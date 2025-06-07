# 任務 005：重新設計首頁

## 任務概述
將首頁從簡單的檔案列表升級為功能豐富的儀表板，提供快速訪問、統計資訊和個人化內容。

## 依賴項目
- 任務 001：設計系統基礎（必須先完成）
- 任務 004：進階功能（建議先完成 - 需要最近訪問和收藏功能）

## 設計理念
- **個人化**：根據用戶使用習慣顯示相關內容
- **效率優先**：常用功能一鍵可達
- **資訊豐富**：展示有用的統計和洞察
- **視覺吸引**：使用圖表和動畫提升體驗

## 子任務詳細說明

### 5.1 首頁佈局設計

**整體結構**：
```vue
<template>
  <div class="home-view">
    <!-- 頂部歡迎區域 -->
    <WelcomeHeader />
    
    <!-- 快速操作區 -->
    <QuickActions />
    
    <!-- 主要內容網格 -->
    <div class="dashboard-grid">
      <!-- 最近檔案 -->
      <RecentFilesWidget />
      
      <!-- 收藏檔案 -->
      <FavoritesWidget />
      
      <!-- 儲存統計 -->
      <StorageStatsWidget />
      
      <!-- 活動時間線 -->
      <ActivityTimeline />
      
      <!-- 快速訪問資料夾 -->
      <QuickAccessFolders />
      
      <!-- 檔案類型分布 -->
      <FileTypeDistribution />
    </div>
  </div>
</template>

<style>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  grid-auto-flow: dense;
}

/* 不同大小的小工具 */
.widget-large { grid-column: span 2; }
.widget-tall { grid-row: span 2; }
.widget-full { grid-column: 1 / -1; }
</style>
```

### 5.2 歡迎頭部組件

**功能設計**：
```vue
<!-- WelcomeHeader.vue -->
<template>
  <div class="welcome-header">
    <div class="greeting-section">
      <h1 class="greeting">{{ greeting }}，{{ userName }}</h1>
      <p class="subtitle">{{ motivationalQuote }}</p>
    </div>
    
    <div class="quick-stats">
      <div class="stat-item">
        <Icon name="file" />
        <div>
          <p class="stat-value">{{ totalFiles }}</p>
          <p class="stat-label">總檔案數</p>
        </div>
      </div>
      
      <div class="stat-item">
        <Icon name="upload" />
        <div>
          <p class="stat-value">{{ todayUploads }}</p>
          <p class="stat-label">今日上傳</p>
        </div>
      </div>
      
      <div class="stat-item">
        <Icon name="users" />
        <div>
          <p class="stat-value">{{ activeUsers }}</p>
          <p class="stat-label">活躍用戶</p>
        </div>
      </div>
    </div>
    
    <!-- 天氣或教會資訊（可選） -->
    <div class="info-card">
      <ChurchInfo />
    </div>
  </div>
</template>

<script setup>
// 根據時間顯示不同問候語
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
})

// 教會相關的勵志話語
const motivationalQuotes = [
  '在主裡常常喜樂',
  '神的恩典夠我們用',
  '凡事謝恩',
  '愛是永不止息'
]
</script>
```

### 5.3 快速操作區

**設計理念**：一鍵完成常用操作

```vue
<!-- QuickActions.vue -->
<template>
  <div class="quick-actions">
    <button 
      class="action-card upload"
      @click="openUploadModal"
    >
      <div class="icon-wrapper">
        <Icon name="upload" size="lg" />
      </div>
      <span>上傳檔案</span>
      <p class="hint">拖放或點擊上傳</p>
    </button>
    
    <button 
      class="action-card folder"
      @click="createFolder"
    >
      <div class="icon-wrapper">
        <Icon name="folder-plus" size="lg" />
      </div>
      <span>新建資料夾</span>
    </button>
    
    <button 
      class="action-card scan"
      @click="scanDocument"
    >
      <div class="icon-wrapper">
        <Icon name="scan" size="lg" />
      </div>
      <span>掃描文件</span>
    </button>
    
    <button 
      class="action-card share"
      @click="quickShare"
    >
      <div class="icon-wrapper">
        <Icon name="share" size="lg" />
      </div>
      <span>快速分享</span>
    </button>
  </div>
</template>

<style scoped>
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.action-card {
  @apply p-6 rounded-xl border-2 border-transparent;
  @apply hover:border-blue-500 hover:shadow-lg;
  @apply transition-all duration-200;
  @apply bg-gradient-to-br;
}

.action-card.upload {
  @apply from-blue-50 to-blue-100;
}

.action-card.folder {
  @apply from-amber-50 to-amber-100;
}
</style>
```

### 5.4 最近檔案小工具

**增強版最近檔案顯示**：
```vue
<!-- RecentFilesWidget.vue -->
<template>
  <div class="widget recent-files-widget widget-large">
    <div class="widget-header">
      <h3>
        <Icon name="clock" />
        最近檔案
      </h3>
      <div class="view-toggles">
        <button 
          v-for="view in ['grid', 'list', 'timeline']"
          :key="view"
          @click="viewMode = view"
          :class="{ active: viewMode === view }"
        >
          <Icon :name="`view-${view}`" />
        </button>
      </div>
    </div>
    
    <div class="widget-content">
      <!-- 網格視圖 -->
      <div v-if="viewMode === 'grid'" class="files-grid">
        <FileCard 
          v-for="file in recentFiles"
          :key="file.id"
          :file="file"
          :show-time="true"
          compact
        />
      </div>
      
      <!-- 列表視圖 -->
      <div v-else-if="viewMode === 'list'" class="files-list">
        <FileListItem 
          v-for="file in recentFiles"
          :key="file.id"
          :file="file"
          :show-actions="true"
        />
      </div>
      
      <!-- 時間線視圖 -->
      <div v-else class="files-timeline">
        <div 
          v-for="group in timelineGroups"
          :key="group.date"
          class="timeline-group"
        >
          <h4>{{ group.label }}</h4>
          <div class="timeline-items">
            <TimelineItem 
              v-for="file in group.files"
              :key="file.id"
              :file="file"
              :time="file.accessedAt"
            />
          </div>
        </div>
      </div>
    </div>
    
    <div class="widget-footer">
      <router-link to="/files?view=recent" class="view-all">
        查看全部
        <Icon name="arrow-right" />
      </router-link>
    </div>
  </div>
</template>
```

### 5.5 儲存空間統計

**視覺化的儲存空間顯示**：
```vue
<!-- StorageStatsWidget.vue -->
<template>
  <div class="widget storage-widget">
    <div class="widget-header">
      <h3>
        <Icon name="hard-drive" />
        儲存空間
      </h3>
    </div>
    
    <div class="widget-content">
      <!-- 圓形進度圖 -->
      <div class="storage-chart">
        <CircularProgress 
          :value="usagePercentage"
          :size="120"
          :stroke-width="12"
        >
          <template #center>
            <div class="chart-center">
              <p class="percentage">{{ usagePercentage }}%</p>
              <p class="label">已使用</p>
            </div>
          </template>
        </CircularProgress>
      </div>
      
      <!-- 詳細資訊 -->
      <div class="storage-details">
        <div class="detail-item">
          <span class="label">已使用</span>
          <span class="value">{{ formatSize(usedSpace) }}</span>
        </div>
        <div class="detail-item">
          <span class="label">可用</span>
          <span class="value">{{ formatSize(freeSpace) }}</span>
        </div>
        <div class="detail-item">
          <span class="label">總容量</span>
          <span class="value">{{ formatSize(totalSpace) }}</span>
        </div>
      </div>
      
      <!-- 檔案類型分布 -->
      <div class="type-breakdown">
        <h4>類型分布</h4>
        <div class="type-bars">
          <div 
            v-for="type in fileTypes"
            :key="type.name"
            class="type-bar"
          >
            <div class="bar-info">
              <Icon :name="type.icon" />
              <span>{{ type.label }}</span>
              <span class="size">{{ formatSize(type.size) }}</span>
            </div>
            <div class="bar-track">
              <div 
                class="bar-fill"
                :style="{ 
                  width: `${type.percentage}%`,
                  backgroundColor: type.color 
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 5.6 活動時間線

**展示團隊活動**：
```vue
<!-- ActivityTimeline.vue -->
<template>
  <div class="widget activity-widget widget-tall">
    <div class="widget-header">
      <h3>
        <Icon name="activity" />
        最近活動
      </h3>
      <select v-model="filter">
        <option value="all">所有活動</option>
        <option value="uploads">上傳</option>
        <option value="downloads">下載</option>
        <option value="shares">分享</option>
      </select>
    </div>
    
    <div class="widget-content">
      <div class="timeline">
        <div 
          v-for="activity in filteredActivities"
          :key="activity.id"
          class="timeline-entry"
        >
          <div class="timeline-marker">
            <Icon :name="activity.icon" :class="activity.type" />
          </div>
          
          <div class="timeline-content">
            <div class="activity-header">
              <strong>{{ activity.userName }}</strong>
              <span class="action">{{ activity.action }}</span>
              <a :href="activity.fileUrl" class="file-link">
                {{ activity.fileName }}
              </a>
            </div>
            <div class="activity-meta">
              <time>{{ formatTime(activity.timestamp) }}</time>
              <span v-if="activity.details" class="details">
                {{ activity.details }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="widget-footer">
      <button @click="loadMore" v-if="hasMore">
        載入更多
      </button>
    </div>
  </div>
</template>
```

### 5.7 快速訪問資料夾

**智慧推薦常用資料夾**：
```vue
<!-- QuickAccessFolders.vue -->
<template>
  <div class="widget folders-widget">
    <div class="widget-header">
      <h3>
        <Icon name="folder-star" />
        快速訪問
      </h3>
      <button @click="customizeFolders">
        <Icon name="settings" />
      </button>
    </div>
    
    <div class="widget-content">
      <div class="folders-grid">
        <button 
          v-for="folder in quickFolders"
          :key="folder.id"
          @click="openFolder(folder)"
          class="folder-tile"
        >
          <div 
            class="folder-icon"
            :style="{ backgroundColor: folder.color }"
          >
            <Icon :name="folder.icon || 'folder'" />
          </div>
          <span class="folder-name">{{ folder.name }}</span>
          <span class="file-count">{{ folder.fileCount }} 個檔案</span>
        </button>
        
        <!-- 添加新資料夾 -->
        <button @click="addQuickFolder" class="folder-tile add-new">
          <div class="folder-icon">
            <Icon name="plus" />
          </div>
          <span>添加資料夾</span>
        </button>
      </div>
    </div>
  </div>
</template>
```

### 5.8 個人化設定

**讓用戶自定義首頁**：
```typescript
// 首頁配置存儲
interface HomePageConfig {
  widgets: {
    id: string
    type: string
    position: { x: number, y: number }
    size: { w: number, h: number }
    settings: Record<string, any>
  }[]
  theme: 'light' | 'dark' | 'auto'
  layout: 'grid' | 'list' | 'custom'
}

// 可用的小工具
const availableWidgets = [
  { id: 'recent-files', name: '最近檔案', icon: 'clock' },
  { id: 'favorites', name: '我的收藏', icon: 'star' },
  { id: 'storage', name: '儲存空間', icon: 'hard-drive' },
  { id: 'activity', name: '活動時間線', icon: 'activity' },
  { id: 'folders', name: '快速訪問', icon: 'folder' },
  { id: 'calendar', name: '教會行事曆', icon: 'calendar' },
  { id: 'weather', name: '天氣資訊', icon: 'cloud' },
  { id: 'verse', name: '每日經文', icon: 'book' }
]
```

## 響應式設計

**不同螢幕尺寸的適配**：
```scss
// 桌面版 (>1200px)
.dashboard-grid {
  grid-template-columns: repeat(4, 1fr);
}

// 平板 (768px - 1200px)
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .widget-large { grid-column: span 1; }
}

// 手機 (<768px)
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## 效能優化

1. **組件懶加載**：非關鍵小工具延遲加載
2. **數據快取**：使用 Pinia 快取首頁數據
3. **虛擬列表**：長列表使用虛擬滾動
4. **預加載**：預先加載可能訪問的數據

## 實作順序

1. **第一天**：
   - 建立首頁基本佈局
   - 實作歡迎頭部
   - 建立快速操作區

2. **第二天**：
   - 完成各個小工具組件
   - 實作響應式網格系統
   - 整合現有功能

## 測試要點

- [ ] 所有小工具正確顯示數據
- [ ] 響應式佈局在各裝置正常
- [ ] 個人化設定保存和載入
- [ ] 數據更新即時反映
- [ ] 載入效能符合預期

## 完成標準

- [ ] 首頁設計美觀且實用
- [ ] 所有小工具功能完整
- [ ] 支援個人化配置
- [ ] 響應式設計完善
- [ ] 效能達到要求