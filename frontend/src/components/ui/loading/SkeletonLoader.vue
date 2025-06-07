<template>
  <div class="skeleton-loader" :class="[`skeleton-${type}`, { 'dark-mode': isDark }]">
    <!-- 卡片骨架 -->
    <div v-if="type === 'card'" class="skeleton-card">
      <div class="skeleton-image shimmer" :style="{ height: imageHeight }"></div>
      <div class="skeleton-content">
        <div class="skeleton-title shimmer" :style="{ width: titleWidth }"></div>
        <div class="skeleton-text shimmer" :style="{ width: '90%' }"></div>
        <div class="skeleton-text shimmer" :style="{ width: textWidth }"></div>
        <div v-if="showActions" class="skeleton-actions">
          <div class="skeleton-button shimmer"></div>
          <div class="skeleton-button shimmer"></div>
        </div>
      </div>
    </div>
    
    <!-- 列表骨架 -->
    <div v-else-if="type === 'list'" class="skeleton-list">
      <div v-for="i in rows" :key="i" class="skeleton-list-item">
        <div class="skeleton-avatar shimmer"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line shimmer" :style="{ width: '80%' }"></div>
          <div class="skeleton-line shimmer" :style="{ width: '60%' }"></div>
        </div>
        <div v-if="showActions" class="skeleton-actions-mini">
          <div class="skeleton-icon shimmer"></div>
          <div class="skeleton-icon shimmer"></div>
        </div>
      </div>
    </div>
    
    <!-- 表格骨架 -->
    <div v-else-if="type === 'table'" class="skeleton-table">
      <div class="skeleton-table-header">
        <div v-for="i in columns" :key="i" class="skeleton-cell shimmer header-cell"></div>
      </div>
      <div v-for="i in rows" :key="i" class="skeleton-table-row">
        <div v-for="j in columns" :key="j" class="skeleton-cell shimmer"></div>
      </div>
    </div>
    
    <!-- 文字段落骨架 -->
    <div v-else-if="type === 'text'" class="skeleton-text-block">
      <div v-for="i in paragraphs" :key="i" class="skeleton-paragraph">
        <div v-for="j in linesPerParagraph" :key="j" 
             class="skeleton-line shimmer" 
             :style="{ width: j === linesPerParagraph ? '70%' : '100%' }">
        </div>
      </div>
    </div>
    
    <!-- 網格骨架 -->
    <div v-else-if="type === 'grid'" class="skeleton-grid">
      <div v-for="i in gridItems" :key="i" class="skeleton-grid-item">
        <div class="skeleton-grid-image shimmer"></div>
        <div class="skeleton-grid-title shimmer"></div>
        <div class="skeleton-grid-subtitle shimmer"></div>
      </div>
    </div>
    
    <!-- 儀表板骨架 -->
    <div v-else-if="type === 'dashboard'" class="skeleton-dashboard">
      <div class="skeleton-dashboard-header">
        <div class="skeleton-title shimmer large"></div>
        <div class="skeleton-subtitle shimmer"></div>
      </div>
      <div class="skeleton-dashboard-content">
        <div class="skeleton-widget shimmer"></div>
        <div class="skeleton-widget shimmer"></div>
        <div class="skeleton-widget shimmer wide"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: 'card' | 'list' | 'table' | 'text' | 'grid' | 'dashboard'
  rows?: number
  columns?: number
  paragraphs?: number
  linesPerParagraph?: number
  gridItems?: number
  showActions?: boolean
  imageHeight?: string
  titleWidth?: string
  textWidth?: string
  isDark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'card',
  rows: 3,
  columns: 4,
  paragraphs: 2,
  linesPerParagraph: 3,
  gridItems: 6,
  showActions: true,
  imageHeight: '200px',
  titleWidth: '75%',
  textWidth: '65%',
  isDark: false
})
</script>

<style scoped>
.skeleton-loader {
  @apply animate-pulse;
}

/* 閃爍動畫 */
.shimmer {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #f8f8f8 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 0.375rem;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* 深色模式 */
.dark-mode .shimmer {
  background: linear-gradient(
    90deg,
    #374151 25%,
    #4b5563 50%,
    #374151 75%
  );
  background-size: 200% 100%;
}

/* 卡片骨架 */
.skeleton-card {
  @apply bg-white rounded-lg shadow border border-gray-200 overflow-hidden;
}

.dark-mode .skeleton-card {
  @apply bg-gray-800 border-gray-700;
}

.skeleton-image {
  @apply w-full bg-gray-200;
}

.skeleton-content {
  @apply p-4 space-y-3;
}

.skeleton-title {
  @apply h-4 bg-gray-200 rounded;
}

.skeleton-text {
  @apply h-3 bg-gray-200 rounded;
}

.skeleton-actions {
  @apply flex space-x-2 mt-4;
}

.skeleton-button {
  @apply h-8 bg-gray-200 rounded flex-1;
}

/* 列表骨架 */
.skeleton-list {
  @apply space-y-3;
}

.skeleton-list-item {
  @apply flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200;
}

.dark-mode .skeleton-list-item {
  @apply bg-gray-800 border-gray-700;
}

.skeleton-avatar {
  @apply w-12 h-12 bg-gray-200 rounded-full flex-shrink-0;
}

.skeleton-lines {
  @apply flex-1 space-y-2;
}

.skeleton-line {
  @apply h-3 bg-gray-200 rounded;
}

.skeleton-actions-mini {
  @apply flex space-x-2;
}

.skeleton-icon {
  @apply w-6 h-6 bg-gray-200 rounded;
}

/* 表格骨架 */
.skeleton-table {
  @apply bg-white rounded-lg border border-gray-200 overflow-hidden;
}

.dark-mode .skeleton-table {
  @apply bg-gray-800 border-gray-700;
}

.skeleton-table-header {
  @apply flex bg-gray-50 border-b border-gray-200;
}

.dark-mode .skeleton-table-header {
  @apply bg-gray-700 border-gray-600;
}

.skeleton-table-row {
  @apply flex border-b border-gray-100 last:border-b-0;
}

.dark-mode .skeleton-table-row {
  @apply border-gray-700;
}

.skeleton-cell {
  @apply flex-1 h-4 bg-gray-200 m-4;
}

.skeleton-cell.header-cell {
  @apply h-5 bg-gray-300;
}

/* 文字骨架 */
.skeleton-text-block {
  @apply space-y-6;
}

.skeleton-paragraph {
  @apply space-y-3;
}

/* 網格骨架 */
.skeleton-grid {
  @apply grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4;
}

.skeleton-grid-item {
  @apply bg-white rounded-lg border border-gray-200 p-4;
}

.dark-mode .skeleton-grid-item {
  @apply bg-gray-800 border-gray-700;
}

.skeleton-grid-image {
  @apply w-full h-32 bg-gray-200 rounded mb-3;
}

.skeleton-grid-title {
  @apply h-4 bg-gray-200 rounded mb-2;
}

.skeleton-grid-subtitle {
  @apply h-3 bg-gray-200 rounded w-3/4;
}

/* 儀表板骨架 */
.skeleton-dashboard {
  @apply space-y-6;
}

.skeleton-dashboard-header {
  @apply space-y-2;
}

.skeleton-title.large {
  @apply h-8 bg-gray-200 rounded w-1/3;
}

.skeleton-subtitle {
  @apply h-4 bg-gray-200 rounded w-1/2;
}

.skeleton-dashboard-content {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.skeleton-widget {
  @apply h-64 bg-gray-200 rounded-lg;
}

.skeleton-widget.wide {
  @apply md:col-span-2;
}

/* 響應式設計 */
@media (max-width: 640px) {
  .skeleton-grid {
    @apply grid-cols-1;
  }
  
  .skeleton-dashboard-content {
    @apply grid-cols-1;
  }
  
  .skeleton-widget.wide {
    @apply col-span-1;
  }
  
  .skeleton-list-item {
    @apply p-3;
  }
  
  .skeleton-avatar {
    @apply w-10 h-10;
  }
}

/* 無障礙 */
@media (prefers-reduced-motion: reduce) {
  .shimmer {
    animation: none;
  }
  
  .skeleton-loader {
    animation: none;
  }
}

/* 高對比度 */
@media (prefers-contrast: high) {
  .shimmer {
    background: linear-gradient(
      90deg,
      #000000 25%,
      #404040 50%,
      #000000 75%
    );
  }
}
</style>