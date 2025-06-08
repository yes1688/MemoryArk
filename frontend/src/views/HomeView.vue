<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
import WelcomeHeader from '@/components/ui/dashboard/WelcomeHeader.vue'
import QuickActions from '@/components/ui/dashboard/QuickActions.vue'
import RecentFilesWidget from '@/components/ui/dashboard/RecentFilesWidget.vue'
import StorageStatsWidget from '@/components/ui/dashboard/StorageStatsWidget.vue'
import { AppAccessHistory, AppFavoriteManager } from '@/components/ui'
import type { FileInfo, AccessHistoryItem, RecentFile } from '@/types/files'

const fileStore = useFilesStore()
const authStore = useAuthStore()

// 狀態管理
const showFilePreview = ref(false)
const selectedFile = ref<FileInfo | null>(null)
const showFavorites = ref(false)
const showAccessHistory = ref(false)

// 方法
const handleFileSelected = (file: FileInfo | AccessHistoryItem | RecentFile) => {
  selectedFile.value = file
  showFilePreview.value = true
}

const handleActionPerformed = (action: string, data?: any) => {
  console.log('Dashboard action:', action, data)
  
  switch (action) {
    case 'files-uploaded':
      // 重新載入最近檔案
      loadDashboardData()
      break
    case 'folder-created':
      console.log('Folder created:', data)
      break
  }
}

const handleCleanupRequested = () => {
  // 打開清理檔案對話框
  console.log('Cleanup requested')
}

const handleManageStorage = () => {
  // 導航到儲存空間管理頁面
  console.log('Manage storage requested')
}

const loadDashboardData = async () => {
  try {
    // 載入儀表板相關數據
    await fileStore.fetchFiles()
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<template>
  <div class="home-view bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- 歡迎頭部 -->
      <WelcomeHeader />
      
      <!-- 快速操作區 -->
      <QuickActions @action-performed="handleActionPerformed" />
      
      <!-- 主要內容網格 -->
      <div class="dashboard-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 最近檔案 (占據兩列) -->
        <div class="lg:col-span-2">
          <RecentFilesWidget @file-selected="handleFileSelected" />
        </div>
        
        <!-- 儲存空間統計 -->
        <div class="lg:col-span-1">
          <StorageStatsWidget 
            @cleanup-requested="handleCleanupRequested"
            @manage-storage="handleManageStorage"
          />
        </div>
        
        <!-- 我的收藏小工具 -->
        <div class="lg:col-span-1">
          <div class="widget bg-white dark:bg-gray-800 rounded-win11 shadow-win11 border border-gray-200 dark:border-gray-700">
            <div class="widget-header flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 class="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                <svg class="w-5 h-5 text-church-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>我的收藏</span>
              </h3>
              <button
                @click="showFavorites = true"
                class="text-sm text-church-primary hover:text-church-primary-light font-medium"
              >
                查看全部
              </button>
            </div>
            <div class="widget-content p-4">
              <div class="text-center py-8">
                <div class="text-4xl mb-3">⭐</div>
                <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">尚無收藏檔案</h4>
                <p class="text-gray-600 dark:text-gray-400 text-sm">點擊檔案上的星星圖示來收藏檔案</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 快速訪問資料夾 -->
        <div class="lg:col-span-2">
          <div class="widget bg-white dark:bg-gray-800 rounded-win11 shadow-win11 border border-gray-200 dark:border-gray-700">
            <div class="widget-header flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 class="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                <svg class="w-5 h-5 text-church-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
                </svg>
                <span>快速訪問</span>
              </h3>
            </div>
            <div class="widget-content p-4">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <router-link
                  to="/shared"
                  class="folder-tile group bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400 rounded-win11 p-4 text-center transition-all duration-200"
                >
                  <div class="folder-icon bg-purple-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-600 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                  </div>
                  <span class="folder-name text-sm font-medium text-gray-900 dark:text-gray-100">共享資料夾</span>
                  <span class="file-count text-xs text-gray-500 dark:text-gray-400 block">245 個檔案</span>
                </router-link>
                
                <router-link
                  to="/sabbath"
                  class="folder-tile group bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 rounded-win11 p-4 text-center transition-all duration-200"
                >
                  <div class="folder-icon bg-green-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-green-600 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <span class="folder-name text-sm font-medium text-gray-900 dark:text-gray-100">安息日資料</span>
                  <span class="file-count text-xs text-gray-500 dark:text-gray-400 block">128 個檔案</span>
                </router-link>
                
                <router-link
                  to="/files"
                  class="folder-tile group bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 rounded-win11 p-4 text-center transition-all duration-200"
                >
                  <div class="folder-icon bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-600 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <span class="folder-name text-sm font-medium text-gray-900 dark:text-gray-100">所有檔案</span>
                  <span class="file-count text-xs text-gray-500 dark:text-gray-400 block">{{ fileStore.files.length }} 個檔案</span>
                </router-link>
                
                <button
                  @click="showAccessHistory = true"
                  class="folder-tile group bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 hover:border-amber-400 rounded-win11 p-4 text-center transition-all duration-200"
                >
                  <div class="folder-icon bg-amber-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-amber-600 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <span class="folder-name text-sm font-medium text-gray-900 dark:text-gray-100">訪問記錄</span>
                  <span class="file-count text-xs text-gray-500 dark:text-gray-400 block">查看歷史</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 收藏管理模態框 -->
    <div
      v-if="showFavorites"
      class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      @click="showFavorites = false"
    >
      <div @click.stop class="bg-white rounded-win11 shadow-win11 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">我的收藏</h3>
          <button
            @click="showFavorites = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-6">
          <p class="text-gray-600 text-center">收藏功能正在開發中...</p>
        </div>
      </div>
    </div>
    
    <!-- 訪問記錄模態框 -->
    <div
      v-if="showAccessHistory"
      class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      @click="showAccessHistory = false"
    >
      <div @click.stop class="bg-white rounded-win11 shadow-win11 max-w-4xl w-full max-h-96 overflow-hidden">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">訪問記錄</h3>
          <button
            @click="showAccessHistory = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="h-96 overflow-y-auto">
          <AppAccessHistory @file-selected="handleFileSelected" />
        </div>
      </div>
    </div>
  </div>
</template>
