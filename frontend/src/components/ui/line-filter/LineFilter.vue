<template>
  <div class="line-filter-container">
    <!-- LINE 檔案開關 -->
    <div class="filter-item">
      <label class="switch-container">
        <input
          type="checkbox"
          :checked="showLineOnly"
          @change="handleLineOnlyToggle"
          class="switch-input"
        />
        <span class="switch-slider"></span>
        <span class="switch-label">只顯示 LINE 檔案</span>
      </label>
    </div>
    
    <!-- LINE 群組篩選 -->
    <div class="filter-item" v-if="lineGroups.length > 0">
      <label class="select-label">LINE 群組</label>
      <select
        :value="selectedGroupId"
        @change="handleGroupChange"
        class="group-select"
      >
        <option value="">所有群組</option>
        <option
          v-for="group in lineGroups"
          :key="group.id"
          :value="group.id"
        >
          {{ group.name }} ({{ group.fileCount }} 個檔案)
        </option>
      </select>
    </div>
    
    <!-- 統計資訊 -->
    <div class="stats-info" v-if="showStats">
      <span class="stats-text">
        <svg class="stats-icon" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        共 {{ totalLineFiles }} 個 LINE 檔案
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface LineGroup {
  id: string
  name: string
  fileCount: number
}

interface Props {
  showLineOnly?: boolean
  selectedGroupId?: string
  showStats?: boolean
}

interface Emits {
  (e: 'update:showLineOnly', value: boolean): void
  (e: 'update:selectedGroupId', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  showLineOnly: false,
  selectedGroupId: '',
  showStats: true
})

const emit = defineEmits<Emits>()

// 本地狀態
const lineGroups = ref<LineGroup[]>([])
const totalLineFiles = ref(0)

// 事件處理
function handleLineOnlyToggle(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:showLineOnly', target.checked)
}

function handleGroupChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:selectedGroupId', target.value)
}

// 載入 LINE 群組資料
async function loadLineGroups() {
  try {
    // 這裡可以呼叫 API 獲取 LINE 群組列表
    // const response = await lineApi.getGroups()
    // lineGroups.value = response.data
    
    // 暫時使用模擬資料
    lineGroups.value = [
      { id: 'group1', name: '教會主群', fileCount: 25 },
      { id: 'group2', name: '青年團契', fileCount: 18 },
      { id: 'group3', name: '詩班練習', fileCount: 12 }
    ]
    
    totalLineFiles.value = lineGroups.value.reduce((sum, group) => sum + group.fileCount, 0)
  } catch (error) {
    console.error('載入 LINE 群組失敗:', error)
  }
}

onMounted(() => {
  loadLineGroups()
})
</script>

<style scoped>
.line-filter-container {
  @apply flex flex-wrap items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg;
}

.dark .line-filter-container {
  @apply bg-gray-800 border-gray-700;
}

.filter-item {
  @apply flex items-center gap-2;
}

/* 開關樣式 */
.switch-container {
  @apply flex items-center gap-2 cursor-pointer;
}

.switch-input {
  @apply sr-only;
}

.switch-slider {
  @apply relative inline-block w-11 h-6 bg-gray-200 rounded-full transition-colors;
}

.switch-slider::before {
  @apply content-[''] absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform;
}

.switch-input:checked + .switch-slider {
  @apply bg-green-600;
}

.switch-input:checked + .switch-slider::before {
  @apply translate-x-5;
}

.dark .switch-slider {
  @apply bg-gray-600;
}

.dark .switch-input:checked + .switch-slider {
  @apply bg-green-500;
}

.switch-label {
  @apply text-sm font-medium text-gray-700;
}

.dark .switch-label {
  @apply text-gray-300;
}

/* 選擇器樣式 */
.select-label {
  @apply text-sm font-medium text-gray-700;
}

.dark .select-label {
  @apply text-gray-300;
}

.group-select {
  @apply px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.dark .group-select {
  @apply bg-gray-700 border-gray-600 text-gray-200;
}

/* 統計資訊 */
.stats-info {
  @apply flex items-center gap-1.5 text-sm text-gray-600;
}

.dark .stats-info {
  @apply text-gray-400;
}

.stats-icon {
  @apply w-4 h-4;
}

.stats-text {
  @apply flex items-center gap-1;
}
</style>