<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            註冊申請
          </h1>
          <p class="text-gray-600">
            完成註冊申請以使用 MemoryArk
          </p>
        </div>

        <!-- 成功訊息 -->
        <div v-if="successMessage" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <p class="text-green-800 text-sm">{{ successMessage }}</p>
          </div>
        </div>

        <!-- 註冊表單 -->
        <form @submit.prevent="handleRegister" class="space-y-6">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
              姓名 <span class="text-red-500">*</span>
            </label>
            <input
              id="name"
              v-model="registerForm.name"
              type="text"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="請輸入您的姓名"
            />
          </div>

          <div>
            <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">
              電話號碼
            </label>
            <input
              id="phone"
              v-model="registerForm.phone"
              type="tel"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="請輸入您的電話號碼（選填）"
            />
          </div>

          <div>
            <label for="reason" class="block text-sm font-medium text-gray-700 mb-2">
              申請理由
            </label>
            <textarea
              id="reason"
              v-model="registerForm.reason"
              rows="4"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="請簡述您申請使用 MemoryArk 的理由（選填）"
            />
          </div>

          <!-- 錯誤訊息 -->
          <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
              <p class="text-red-800 text-sm">{{ errorMessage }}</p>
            </div>
          </div>

          <button
            type="submit"
            :disabled="isLoading || !registerForm.name"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
          >
            <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            {{ isLoading ? '送出中...' : '送出申請' }}
          </button>
        </form>

        <div class="mt-6 text-center">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
              <div class="text-left">
                <p class="text-blue-800 text-sm font-medium">注意事項</p>
                <p class="text-blue-700 text-sm mt-1">
                  提交申請後，管理員會審核您的申請。審核通過後您將收到通知並可以開始使用系統。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const registerForm = ref({
  name: '',
  phone: '',
  reason: ''
})

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleRegister = async () => {
  errorMessage.value = ''
  
  // 驗證表單
  if (!registerForm.value.name.trim()) {
    errorMessage.value = '請填寫姓名'
    return
  }

  isLoading.value = true

  const success = await authStore.register({
    name: registerForm.value.name.trim(),
    phone: registerForm.value.phone.trim() || undefined,
    reason: registerForm.value.reason.trim() || undefined
  })

  if (success) {
    successMessage.value = '註冊申請已成功送出！管理員會盡快審核您的申請。'
    // 清空表單
    registerForm.value = { name: '', phone: '', reason: '' }
    
    // 3秒後跳轉到等待審核頁面
    setTimeout(() => {
      router.push('/pending-approval')
    }, 3000)
  } else {
    // 直接使用 authStore.error，因為 register 函數已經設置了正確的錯誤訊息
    errorMessage.value = authStore.error || '送出申請時發生錯誤，請稍後再試'
  }
  
  isLoading.value = false
}

// 初始化時檢查是否已經通過 Cloudflare 認證
onMounted(async () => {
  if (!authStore.initialized) {
    await authStore.checkAuthStatus()
  }
  
  // 如果用戶已經完成註冊，重定向到適當頁面
  if (authStore.isAuthenticated) {
    router.push('/')
  } else if (authStore.pendingApproval) {
    router.push('/pending-approval')
  } else if (!authStore.hasCloudflareAccess) {
    router.push('/cloudflare-auth')
  }
})
</script>
