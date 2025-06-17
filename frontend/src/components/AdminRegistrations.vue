<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '@/api/admin'

interface RegistrationRequest {
  id: number
  name: string
  email: string
  phone?: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  rejection_history?: string
  processed_by?: number
  processed_at?: string
  created_at: string
  processed_by_user?: {
    id: number
    email: string
    name: string
    role: string
  }
}

const registrations = ref<RegistrationRequest[]>([])
const isLoading = ref(false)
const selectedStatus = ref('pending')

const statusOptions = [
  { value: 'pending', label: '待審核', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: '已通過', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: '已拒絕', color: 'bg-red-100 text-red-800' }
]

const filteredRegistrations = computed(() => {
  // 確保 registrations.value 是陣列
  if (!Array.isArray(registrations.value)) {
    return []
  }
  
  if (selectedStatus.value === 'all') {
    return registrations.value
  }
  return registrations.value.filter(reg => reg.status === selectedStatus.value)
})

const loadRegistrations = async () => {
  isLoading.value = true
  try {
    const response = await adminApi.getRegistrations()
    registrations.value = response.data?.registrations || []
  } catch (error) {
    console.error('載入註冊申請失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const approveRegistration = async (id: number) => {
  if (!confirm('確定要通過這個註冊申請嗎？')) {
    return
  }
  
  try {
    await adminApi.approveRegistration(id)
    await loadRegistrations()
    alert('註冊申請已通過！')
  } catch (error) {
    console.error('通過註冊申請失敗:', error)
    alert('通過註冊申請失敗，請稍後再試')
  }
}

const rejectRegistration = async (id: number, reason: string = '') => {
  const rejectionReason = reason || prompt('請輸入拒絕原因（選填）：')
  if (rejectionReason === null) {
    return // 用戶取消
  }
  
  try {
    await adminApi.rejectRegistration(id, rejectionReason || '')
    await loadRegistrations()
    alert('註冊申請已拒絕！')
  } catch (error) {
    console.error('拒絕註冊申請失敗:', error)
    alert('拒絕註冊申請失敗，請稍後再試')
  }
}

const getStatusColor = (status: string) => {
  const option = statusOptions.find(opt => opt.value === status)
  return option?.color || 'admin-reason-text'
}

const getStatusLabel = (status: string) => {
  const option = statusOptions.find(opt => opt.value === status)
  return option?.label || status
}

onMounted(() => {
  loadRegistrations()
})
</script>

<style scoped>
/* 管理員面板樣式 */
.admin-panel {
  background: var(--bg-elevated);
  border-color: var(--border-light);
}

/* 篩選按鈕樣式 */
.admin-filter-active {
  background: var(--color-primary);
  color: white;
}

.admin-filter-inactive {
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: all var(--duration-fast) var(--ease-smooth);
}

.admin-filter-inactive:hover {
  background: var(--bg-primary);
  border-color: var(--color-primary);
}

/* 註冊申請列表樣式 */
.admin-registration-list {
  border-top: 1px solid var(--border-light);
}

.admin-registration-item {
  border-bottom: 1px solid var(--border-light);
  transition: background-color var(--duration-fast) var(--ease-smooth);
}

.admin-registration-item:hover {
  background: var(--bg-secondary);
}

/* 頭像樣式 */
.admin-avatar {
  background: var(--bg-secondary);
  border: 2px solid var(--border-light);
}

.admin-avatar-text {
  color: var(--text-primary);
  font-weight: 600;
}

/* 申請原因文字樣式 */
.admin-reason-text {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 元數據文字樣式 */
.admin-meta-text {
  color: var(--text-tertiary);
}

/* 操作按鈕樣式 */
.admin-approve-btn {
  background: var(--color-success);
  color: white;
  border: 1px solid transparent;
  transition: all var(--duration-fast) var(--ease-smooth);
}

.admin-approve-btn:hover {
  background: var(--color-success-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.admin-reject-btn {
  background: var(--color-danger);
  color: white;
  border: 1px solid transparent;
  transition: all var(--duration-fast) var(--ease-smooth);
}

.admin-reject-btn:hover {
  background: var(--color-danger-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>

<template>
  <div class="space-y-6">
    <!-- 狀態篩選 -->
    <div class="p-4 rounded-lg border admin-panel">
      <div class="flex flex-wrap gap-2">
        <button
          @click="selectedStatus = 'all'"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            selectedStatus === 'all'
              ? 'admin-filter-active'
              : 'admin-filter-inactive'
          ]"
        >
          全部
        </button>
        <button
          v-for="option in statusOptions"
          :key="option.value"
          @click="selectedStatus = option.value"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            selectedStatus === option.value
              ? 'admin-filter-active'
              : 'admin-filter-inactive'
          ]"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- 註冊申請列表 -->
    <div class="admin-panel rounded-lg border overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto"></div>
        <p class="mt-2 admin-meta-text">載入中...</p>
      </div>

      <div v-else-if="filteredRegistrations.length === 0" class="p-8 text-center admin-meta-text">
        <p>沒有找到符合條件的註冊申請</p>
      </div>

      <div v-else class="admin-registration-list">
        <div
          v-for="registration in filteredRegistrations"
          :key="registration.id"
          class="admin-registration-item p-6"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <div class="h-10 w-10 rounded-full admin-avatar flex items-center justify-center">
                    <span class="admin-avatar-text font-medium">
                      {{ registration.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-medium">
                    {{ registration.name }}
                  </h3>
                  <p class="text-sm admin-meta-text">{{ registration.email }}</p>
                </div>
                <div>
                  <span :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(registration.status)
                  ]">
                    {{ getStatusLabel(registration.status) }}
                  </span>
                </div>
              </div>

              <div class="mt-4" v-if="registration.phone">
                <h4 class="text-sm font-medium mb-2">聯絡電話：</h4>
                <p class="text-sm admin-reason-text p-3 rounded-md">
                  {{ registration.phone }}
                </p>
              </div>

              <!-- 申請理由 - 這是重要的資訊！ -->
              <div class="mt-4" v-if="registration.reason">
                <h4 class="text-sm font-medium mb-2" style="color: var(--color-primary);">申請理由：</h4>
                <div class="text-sm admin-reason-text p-3 rounded-md border-l-4" 
                     style="border-left-color: var(--color-primary); background: var(--bg-secondary);">
                  {{ registration.reason }}
                </div>
              </div>

              <!-- 如果沒有填寫申請理由，顯示提示 -->
              <div class="mt-4" v-else>
                <h4 class="text-sm font-medium mb-2 text-gray-500">申請理由：</h4>
                <div class="text-sm p-3 rounded-md bg-gray-50 text-gray-500 italic">
                  使用者未填寫申請理由
                </div>
              </div>
              
              <div class="mt-4" v-if="registration.rejection_reason">
                <h4 class="text-sm font-medium mb-2 text-red-600">拒絕原因：</h4>
                <p class="text-sm p-3 rounded-md bg-red-50 text-red-700">
                  {{ registration.rejection_reason }}
                </p>
              </div>

              <div class="mt-4" v-if="registration.rejection_history">
                <h4 class="text-sm font-medium mb-2 text-orange-600">歷史拒絕記錄：</h4>
                <div class="text-sm p-3 rounded-md bg-orange-50 text-orange-700 space-y-1">
                  <div v-for="(line, index) in registration.rejection_history.split('\n')" :key="index">
                    {{ line }}
                  </div>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between text-xs admin-meta-text">
                <span>申請時間：{{ new Date(registration.created_at).toLocaleString() }}</span>
                <span v-if="registration.processed_at">
                  處理時間：{{ new Date(registration.processed_at).toLocaleString() }}
                </span>
                <span v-if="registration.processed_by_user">
                  處理者：{{ registration.processed_by_user.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div v-if="registration.status === 'pending'" class="mt-4 flex space-x-3">
            <button
              @click="approveRegistration(registration.id)"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md admin-approve-btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              通過申請
            </button>
            <button
              @click="rejectRegistration(registration.id)"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md admin-reject-btn focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              拒絕申請
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
