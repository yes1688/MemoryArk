<template>
  <div class="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-4">
          等待審核中
        </h1>
        
        <p class="text-gray-600 mb-6">
          您的註冊申請已提交，正在等待管理員審核。審核通過後您將可以使用系統功能。
        </p>
        
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-yellow-800">
                <strong>請耐心等待</strong><br>
                管理員會盡快處理您的申請。如有緊急需求，請聯繫系統管理員。
              </p>
            </div>
          </div>
        </div>
        
        <button 
          @click="refreshStatus"
          :disabled="isRefreshing"
          class="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <span v-if="isRefreshing">檢查中...</span>
          <span v-else>重新檢查狀態</span>
        </button>
        
        <div class="mt-6 text-sm text-gray-500">
          <p>申請時間：{{ formatDate(new Date()) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const isRefreshing = ref(false)

const refreshStatus = async () => {
  isRefreshing.value = true
  try {
    const status = await authStore.refreshAuth()
    if (status?.authenticated && !status.pendingApproval) {
      router.push('/')
    }
  } catch (error) {
    console.error('Failed to refresh auth status:', error)
  } finally {
    isRefreshing.value = false
  }
}

const formatDate = (date: Date) => {
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
