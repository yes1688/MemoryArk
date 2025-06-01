<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const registerForm = ref({
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  reason: ''
})

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleRegister = async () => {
  errorMessage.value = ''
  
  // 驗證表單
  if (!registerForm.value.email || !registerForm.value.password || !registerForm.value.name) {
    errorMessage.value = '請填寫所有必填欄位'
    return
  }

  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    errorMessage.value = '密碼確認不一致'
    return
  }

  if (registerForm.value.password.length < 6) {
    errorMessage.value = '密碼長度至少 6 個字元'
    return
  }

  isLoading.value = true

  const success = await authStore.register({
    email: registerForm.value.email,
    password: registerForm.value.password,
    name: registerForm.value.name,
    reason: registerForm.value.reason
  })

  if (success) {
    successMessage.value = '註冊申請已送出，請等待管理員審核'
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  } else {
    errorMessage.value = authStore.error || '註冊失敗'
  }

  isLoading.value = false
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          申請註冊
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          MemoryArk 2.0 使用權限申請
        </p>
      </div>

      <div v-if="successMessage" class="rounded-md bg-green-50 p-4">
        <div class="text-sm text-green-700">
          {{ successMessage }}
        </div>
      </div>
      
      <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <div class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">姓名</label>
            <input
              id="name"
              v-model="registerForm.name"
              name="name"
              type="text"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="請輸入您的姓名"
            />
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">電子郵件</label>
            <input
              id="email"
              v-model="registerForm.email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="請輸入您的電子郵件"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">密碼</label>
            <input
              id="password"
              v-model="registerForm.password"
              name="password"
              type="password"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="請輸入密碼（至少 6 個字元）"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">確認密碼</label>
            <input
              id="confirmPassword"
              v-model="registerForm.confirmPassword"
              name="confirmPassword"
              type="password"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="請再次輸入密碼"
            />
          </div>

          <div>
            <label for="reason" class="block text-sm font-medium text-gray-700">申請理由</label>
            <textarea
              id="reason"
              v-model="registerForm.reason"
              name="reason"
              rows="3"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="請簡述您的申請理由（選填）"
            />
          </div>
        </div>

        <div v-if="errorMessage" class="text-red-600 text-sm text-center">
          {{ errorMessage }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ isLoading ? '送出中...' : '送出申請' }}
          </button>
        </div>

        <div class="text-center">
          <router-link
            to="/login"
            class="text-sm text-blue-600 hover:text-blue-500"
          >
            已有帳號？前往登入
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>
