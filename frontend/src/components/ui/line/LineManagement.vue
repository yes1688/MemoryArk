<template>
  <div class="line-management">
    <!-- 標題區 -->
    <div class="management-header">
      <h1 class="page-title">LINE 信徒照片管理</h1>
      <p class="page-description">管理 LINE 群組上傳的照片、用戶和統計資料</p>
    </div>

    <!-- 功能標籤頁 -->
    <div class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
      >
        <i :class="tab.icon"></i>
        {{ tab.label }}
        <span v-if="tab.count" class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- 標籤頁內容 -->
    <div class="tab-content">
      <!-- 上傳記錄 -->
      <div v-if="activeTab === 'uploads'" class="tab-panel">
        <LineUploadsPanel
          :uploads="uploads"
          :loading="uploadsLoading"
          @refresh="loadUploadRecords"
          @delete="deleteUploadRecord"
          @batch-delete="batchDeleteRecords"
        />
      </div>

      <!-- 用戶管理 -->
      <!-- <div v-if="activeTab === 'users'" class="tab-panel">
        <LineUsersPanel
          :users="users"
          :loading="usersLoading"
          @refresh="loadUsers"
          @update-status="updateUserStatus"
        />
      </div> -->

      <!-- <div v-if="activeTab === 'groups'" class="tab-panel">
        <LineGroupsPanel
          :groups="groups"
          :loading="groupsLoading"
          @refresh="loadGroups"
        />
      </div> -->

      <!-- <div v-if="activeTab === 'statistics'" class="tab-panel">
        <LineStatisticsPanel
          :statistics="statistics"
          :loading="statisticsLoading"
          @refresh="loadStatistics"
        />
      </div> -->

      <!-- <div v-if="activeTab === 'settings'" class="tab-panel">
        <LineSettingsPanel
          :settings="settings"
          :loading="settingsLoading"
          @refresh="loadSettings"
          @update="updateSetting"
        />
      </div> -->

      <!-- <div v-if="activeTab === 'logs'" class="tab-panel">
        <LineLogsPanel
          :logs="webhookLogs"
          :loading="logsLoading"
          @refresh="loadWebhookLogs"
        />
      </div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import LineUploadsPanel from './LineUploadsPanel.vue'
// import LineUsersPanel from './LineUsersPanel.vue'
// import LineGroupsPanel from './LineGroupsPanel.vue'
// import LineStatisticsPanel from './LineStatisticsPanel.vue'
// import LineSettingsPanel from './LineSettingsPanel.vue'
// import LineLogsPanel from './LineLogsPanel.vue'
import { lineApi } from '@/api'
import type { 
  LineUploadRecord, 
  LineUser, 
  LineGroup, 
  LineStatistics, 
  LineSetting, 
  LineWebhookLog 
} from '@/types/line'

const router = useRouter()

// 響應式狀態
const activeTab = ref('uploads')
const uploads = ref<LineUploadRecord[]>([])
const users = ref<LineUser[]>([])
const groups = ref<LineGroup[]>([])
const statistics = ref<LineStatistics | null>(null)
const settings = ref<LineSetting[]>([])
const webhookLogs = ref<LineWebhookLog[]>([])

// 載入狀態
const uploadsLoading = ref(false)
const usersLoading = ref(false)
const groupsLoading = ref(false)
const statisticsLoading = ref(false)
const settingsLoading = ref(false)
const logsLoading = ref(false)

// 標籤頁配置
const tabs = computed(() => [
  {
    id: 'uploads',
    label: '上傳記錄',
    icon: 'fas fa-cloud-upload-alt',
    count: uploads.value.length || null
  },
  {
    id: 'users',
    label: '用戶管理',
    icon: 'fas fa-users',
    count: users.value.length || null
  },
  {
    id: 'groups',
    label: '群組管理',
    icon: 'fas fa-comments',
    count: groups.value.length || null
  },
  {
    id: 'statistics',
    label: '統計分析',
    icon: 'fas fa-chart-bar',
    count: null
  },
  {
    id: 'settings',
    label: '系統設定',
    icon: 'fas fa-cog',
    count: null
  },
  {
    id: 'logs',
    label: 'Webhook 日誌',
    icon: 'fas fa-file-alt',
    count: webhookLogs.value.length || null
  }
])

// API 方法
const loadUploadRecords = async () => {
  uploadsLoading.value = true
  try {
    const response = await lineApi.getUploadRecords()
    uploads.value = response.data.records || []
  } catch (error) {
    console.error('載入上傳記錄失敗:', error)
  } finally {
    uploadsLoading.value = false
  }
}

const loadUsers = async () => {
  usersLoading.value = true
  try {
    const response = await lineApi.getUsers()
    users.value = response.data.users || []
  } catch (error) {
    console.error('載入用戶列表失敗:', error)
  } finally {
    usersLoading.value = false
  }
}

const loadGroups = async () => {
  groupsLoading.value = true
  try {
    const response = await lineApi.getGroups()
    groups.value = response.data.groups || []
  } catch (error) {
    console.error('載入群組列表失敗:', error)
  } finally {
    groupsLoading.value = false
  }
}

const loadStatistics = async () => {
  statisticsLoading.value = true
  try {
    const response = await lineApi.getStatistics()
    statistics.value = response.data
  } catch (error) {
    console.error('載入統計資料失敗:', error)
  } finally {
    statisticsLoading.value = false
  }
}

const loadSettings = async () => {
  settingsLoading.value = true
  try {
    const response = await lineApi.getSettings()
    settings.value = response.data || []
  } catch (error) {
    console.error('載入設定失敗:', error)
  } finally {
    settingsLoading.value = false
  }
}

const loadWebhookLogs = async () => {
  logsLoading.value = true
  try {
    const response = await lineApi.getWebhookLogs()
    webhookLogs.value = response.data.logs || []
  } catch (error) {
    console.error('載入日誌失敗:', error)
  } finally {
    logsLoading.value = false
  }
}

// 操作方法
const deleteUploadRecord = async (id: string) => {
  try {
    await lineApi.deleteUploadRecord(id)
    await loadUploadRecords()
  } catch (error) {
    console.error('刪除上傳記錄失敗:', error)
  }
}

const batchDeleteRecords = async (ids: string[]) => {
  try {
    await lineApi.batchDeleteUploadRecords(ids)
    await loadUploadRecords()
  } catch (error) {
    console.error('批量刪除失敗:', error)
  }
}

const updateUserStatus = async (lineUserId: string, updates: any) => {
  try {
    await lineApi.updateUserStatus(lineUserId, updates)
    await loadUsers()
  } catch (error) {
    console.error('更新用戶狀態失敗:', error)
  }
}

const updateSetting = async (settingKey: string, value: string, description?: string) => {
  try {
    await lineApi.updateSetting(settingKey, { setting_value: value, description })
    await loadSettings()
  } catch (error) {
    console.error('更新設定失敗:', error)
  }
}

// 初始化
onMounted(async () => {
  // 預載入統計資料
  await loadStatistics()
  
  // 根據預設標籤載入對應資料
  switch (activeTab.value) {
    case 'uploads':
      await loadUploadRecords()
      break
    case 'users':
      await loadUsers()
      break
    case 'groups':
      await loadGroups()
      break
    case 'settings':
      await loadSettings()
      break
    case 'logs':
      await loadWebhookLogs()
      break
  }
})

// 監聽標籤切換
const handleTabChange = async (tabId: string) => {
  activeTab.value = tabId
  
  // 延遲載入對應資料
  switch (tabId) {
    case 'uploads':
      if (uploads.value.length === 0) await loadUploadRecords()
      break
    case 'users':
      if (users.value.length === 0) await loadUsers()
      break
    case 'groups':
      if (groups.value.length === 0) await loadGroups()
      break
    case 'settings':
      if (settings.value.length === 0) await loadSettings()
      break
    case 'logs':
      if (webhookLogs.value.length === 0) await loadWebhookLogs()
      break
  }
}
</script>

<style scoped>
.line-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.management-header {
  margin-bottom: 2rem;
  text-align: center;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a365d;
  margin-bottom: 0.5rem;
}

.page-description {
  font-size: 1.1rem;
  color: #718096;
  margin-bottom: 0;
}

.tab-navigation {
  display: flex;
  background: white;
  border-radius: 12px;
  padding: 0.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  gap: 0.5rem;
  overflow-x: auto;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  color: #718096;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: fit-content;
}

.tab-button:hover {
  background: #edf2f7;
  color: #2d3748;
}

.tab-button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.tab-count {
  background: rgba(255, 255, 255, 0.3);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.tab-button.active .tab-count {
  background: rgba(255, 255, 255, 0.25);
}

.tab-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tab-panel {
  padding: 2rem;
  min-height: 500px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .line-management {
    padding: 1rem;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .tab-navigation {
    padding: 0.25rem;
    gap: 0.25rem;
  }
  
  .tab-button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  .tab-panel {
    padding: 1rem;
  }
}
</style>