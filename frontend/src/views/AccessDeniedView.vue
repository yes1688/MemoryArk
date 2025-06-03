<template>
  <div class="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"/>
          </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-4">
          訪問被拒絕
        </h1>
        
        <p class="text-gray-600 mb-6">
          抱歉，您沒有權限訪問此頁面或功能。請聯繫系統管理員獲取適當的權限。
        </p>
        
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-800">
                <strong>可能的原因：</strong><br>
                • 您的帳戶尚未獲得批准<br>
                • 您沒有執行此操作的權限<br>
                • 您的帳戶已被停用
              </p>
            </div>
          </div>
        </div>
        
        <div class="space-y-3">
          <button 
            @click="goHome"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            返回首頁
          </button>
          
          <button 
            @click="checkStatus"
            :disabled="isChecking"
            class="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <span v-if="isChecking">檢查中...</span>
            <span v-else>重新檢查權限</span>
          </button>
        </div>
        
        <div class="mt-6 text-sm text-gray-500">
          <p>如需協助，請聯繫系統管理員</p>
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
const isChecking = ref(false)

const goHome = () => {
  router.push('/')
}

const checkStatus = async () => {
  isChecking.value = true
  try {
    const status = await authStore.refreshAuth()
    if (status?.authenticated && !status.needsRegistration && !status.pendingApproval) {
      router.push('/')
    }
  } catch (error) {
    console.error('Failed to check status:', error)
  } finally {
    isChecking.value = false
  }
}
</script>
