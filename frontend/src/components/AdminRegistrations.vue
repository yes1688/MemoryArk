<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '@/api/admin'

interface RegistrationRequest {
  id: number
  username: string
  email: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
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
  if (selectedStatus.value === 'all') {
    return registrations.value
  }
  return registrations.value.filter(reg => reg.status === selectedStatus.value)
})

const loadRegistrations = async () => {
  isLoading.value = true
  try {
    const response = await adminApi.getRegistrations()
    registrations.value = response.data.registrations
  } catch (error) {
    console.error('載入註冊申請失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const approveRegistration = async (id: number) => {
  try {
    await adminApi.approveRegistration(id)
    await loadRegistrations()
  } catch (error) {
    console.error('通過註冊申請失敗:', error)
  }
}

const rejectRegistration = async (id: number, reason: string = '') => {
  const rejectionReason = reason || prompt('請輸入拒絕原因（選填）：')
  
  try {
    await adminApi.rejectRegistration(id, rejectionReason || '')
    await loadRegistrations()
  } catch (error) {
    console.error('拒絕註冊申請失敗:', error)
  }
}

const getStatusColor = (status: string) => {
  const option = statusOptions.find(opt => opt.value === status)
  return option?.color || 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (status: string) => {
  const option = statusOptions.find(opt => opt.value === status)
  return option?.label || status
}

onMounted(() => {
  loadRegistrations()
})
</script>

<template>
  <div class="space-y-6">
    <!-- 狀態篩選 -->
    <div class="bg-white p-4 rounded-lg border">
      <div class="flex flex-wrap gap-2">
        <button
          @click="selectedStatus = 'all'"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            selectedStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          ]"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- 註冊申請列表 -->
    <div class="bg-white rounded-lg border overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">載入中...</p>
      </div>

      <div v-else-if="filteredRegistrations.length === 0" class="p-8 text-center text-gray-500">
        <p>沒有找到符合條件的註冊申請</p>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="registration in filteredRegistrations"
          :key="registration.id"
          class="p-6 hover:bg-gray-50"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <div class="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <span class="text-gray-600 font-medium">
                      {{ registration.username.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-medium text-gray-900">
                    {{ registration.username }}
                  </h3>
                  <p class="text-sm text-gray-500">{{ registration.email }}</p>
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

              <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-900 mb-2">申請原因：</h4>
                <p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                  {{ registration.reason || '未提供申請原因' }}
                </p>
              </div>

              <div class="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>申請時間：{{ new Date(registration.createdAt).toLocaleString() }}</span>
                <span v-if="registration.updatedAt !== registration.createdAt">
                  處理時間：{{ new Date(registration.updatedAt).toLocaleString() }}
                </span>
              </div>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div v-if="registration.status === 'pending'" class="mt-4 flex space-x-3">
            <button
              @click="approveRegistration(registration.id)"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              通過申請
            </button>
            <button
              @click="rejectRegistration(registration.id)"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
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
