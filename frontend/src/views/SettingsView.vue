<template>
  <div class="settings-view">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="page-title">設定</h1>
      <p class="page-subtitle">管理您的帳戶和應用程式偏好設定</p>
    </div>

    <!-- 設定區塊容器 -->
    <div class="settings-container">
      <!-- 外觀設定 -->
      <div class="settings-section">
        <h2 class="section-title">外觀</h2>
        <div class="settings-group">
          <!-- 主題設定 -->
          <div class="setting-item">
            <div class="setting-info">
              <h3 class="setting-title">主題</h3>
              <p class="setting-description">選擇應用程式的視覺主題</p>
            </div>
            <div class="setting-control">
              <div class="theme-selector">
                <button
                  v-for="option in themeOptions"
                  :key="option.value"
                  @click="setTheme(option.value)"
                  :class="['theme-option', { active: theme === option.value }]"
                  :title="option.label"
                >
                  <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path v-if="option.icon === 'sun'" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41M12 6a6 6 0 100 12 6 6 0 000-12z" />
                    <path v-else-if="option.icon === 'moon'" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    <path v-else d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span class="theme-label">{{ option.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 帳戶設定 -->
      <div class="settings-section">
        <h2 class="section-title">帳戶資訊</h2>
        <div class="settings-group">
          <!-- 使用者資訊 -->
          <div class="setting-item">
            <div class="setting-info">
              <h3 class="setting-title">個人資訊</h3>
              <p class="setting-description">您的帳戶基本資訊</p>
            </div>
            <div class="user-info">
              <div class="info-row">
                <span class="info-label">姓名：</span>
                <span class="info-value">{{ user?.name || '載入中...' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">電子郵件：</span>
                <span class="info-value">{{ user?.email || '載入中...' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">角色：</span>
                <span class="info-value">{{ getRoleLabel(user?.role) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">加入時間：</span>
                <span class="info-value">{{ formatDate(user?.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 儲存空間設定 -->
      <div class="settings-section">
        <h2 class="section-title">儲存空間</h2>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h3 class="setting-title">空間使用狀況</h3>
              <p class="setting-description">查看您的儲存空間使用情況</p>
            </div>
            <div class="storage-info">
              <div class="storage-bar-container">
                <div class="storage-bar">
                  <div 
                    class="storage-fill"
                    :style="{ width: storagePercent + '%' }"
                    :class="{ warning: storagePercent > 80, danger: storagePercent > 95 }"
                  ></div>
                </div>
                <div class="storage-text">
                  <span>{{ formatStorage(storageUsed) }} / {{ formatStorage(storageTotal) }}</span>
                  <span class="storage-percent">{{ Math.round(storagePercent) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 關於 -->
      <div class="settings-section">
        <h2 class="section-title">關於</h2>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h3 class="setting-title">MemoryArk</h3>
              <p class="setting-description">教會影音回憶錄系統</p>
            </div>
            <div class="about-info">
              <p class="about-text">版本：2.0.11</p>
              <p class="about-text">為真耶穌教會的數位化服務而設計</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFilesStore } from '@/stores/files'
import { useTheme } from '@/composables/useTheme'
import { storageApi } from '@/api'
import type { StorageStats } from '@/api'

const authStore = useAuthStore()
const filesStore = useFilesStore()
const { theme, setTheme } = useTheme()

// 使用者資訊
const user = computed(() => authStore.user)

// 主題選項
const themeOptions = [
  { value: 'light' as const, label: '淺色', icon: 'sun' },
  { value: 'dark' as const, label: '深色', icon: 'moon' },
  { value: 'auto' as const, label: '自動', icon: 'auto' }
]

// 儲存空間狀態
const storageStats = ref<StorageStats | null>(null)
const storageUsed = computed(() => storageStats.value?.used_space || 0)
const storageTotal = computed(() => storageStats.value?.total_space || 0)
const storagePercent = computed(() => storageStats.value?.usage_percent || 0)

// 載入儲存統計
const loadStorageStats = async () => {
  try {
    const response = await storageApi.getStats()
    if (response.success && response.data) {
      storageStats.value = response.data
    }
  } catch (error) {
    console.error('Failed to load storage stats:', error)
  }
}

// 格式化函數
const getRoleLabel = (role?: string) => {
  const roles: Record<string, string> = {
    admin: '管理員',
    user: '一般用戶'
  }
  return roles[role || ''] || '一般用戶'
}

const formatDate = (date?: string) => {
  if (!date) return '未知'
  return new Date(date).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatStorage = (bytes: number): string => {
  if (!bytes) return '0 GB'
  const gb = bytes / (1024 * 1024 * 1024)
  return gb.toFixed(1) + ' GB'
}

// 生命週期
onMounted(() => {
  loadStorageStats()
})
</script>

<style scoped>
.settings-view {
  padding: 2rem;
  max-width: 1024px;
  margin: 0 auto;
}

/* 頁面標題 */
.page-header {
  margin-bottom: 3rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 300;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
}

/* 設定容器 */
.settings-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 設定區塊 */
.settings-section {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl);
  padding: 2rem;
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
}

/* 設定項目 */
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  padding: 1rem 0;
}

.setting-item:not(:last-child) {
  border-bottom: 1px solid var(--border-light);
}

.setting-info {
  flex: 1;
}

.setting-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.setting-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* 主題選擇器 */
.theme-selector {
  display: flex;
  gap: 0.5rem;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-smooth);
}

.theme-option:hover {
  background: var(--bg-tertiary);
}

.theme-option.active {
  border-color: var(--color-primary);
  background: var(--color-primary-alpha);
}

.theme-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--text-primary);
}

.theme-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* 使用者資訊 */
.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.info-label {
  color: var(--text-secondary);
  min-width: 80px;
}

.info-value {
  color: var(--text-primary);
}

/* 儲存空間 */
.storage-bar-container {
  width: 300px;
}

.storage-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.storage-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--duration-normal) var(--ease-smooth);
}

.storage-fill.warning {
  background: var(--color-warning);
}

.storage-fill.danger {
  background: var(--color-error);
}

.storage-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.storage-percent {
  font-weight: 500;
  color: var(--text-primary);
}

/* 關於資訊 */
.about-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.about-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .settings-view {
    padding: 1rem;
  }
  
  .settings-section {
    padding: 1.5rem;
  }
  
  .setting-item {
    flex-direction: column;
    gap: 1rem;
  }
  
  .storage-bar-container {
    width: 100%;
  }
}
</style>