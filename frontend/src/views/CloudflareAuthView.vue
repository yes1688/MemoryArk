<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-4">
          需要 Cloudflare 認證
        </h1>
        
        <p class="text-gray-600 mb-8">
          您需要通過 Cloudflare Access 認證才能使用此系統。請聯繫系統管理員獲取訪問權限。
        </p>
        
        <button 
          @click="redirectToCloudflareAuth"
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
        >
          重新驗證
        </button>
        
        <div class="mt-6 text-sm text-gray-500">
          <p>如果您已有權限但仍看到此頁面，請嘗試：</p>
          <ul class="mt-2 space-y-1">
            <li>• 清除瀏覽器快取</li>
            <li>• 使用無痕模式</li>
            <li>• 聯繫系統管理員</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const redirectToCloudflareAuth = () => {
  // 重新導向到 Cloudflare 認證頁面
  window.location.href = '/'
}
</script>
