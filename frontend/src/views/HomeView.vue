<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
import FileCard from '@/components/FileCard.vue'
import FileFilters from '@/components/FileFilters.vue'

const fileStore = useFilesStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const selectedCategory = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(20)

const filters = ref({
  category: '',
  search: ''
})

const handleSearch = () => {
  filters.value.search = searchQuery.value
  currentPage.value = 1
  loadFiles()
}

const handleCategoryChange = (category: string) => {
  selectedCategory.value = category
  filters.value.category = category
  currentPage.value = 1
  loadFiles()
}

const loadFiles = async () => {
  await fileStore.fetchFiles()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadFiles()
}

onMounted(() => {
  loadFiles()
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 頁面標題 -->
    <div class="bg-white border-b p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">檔案管理</h1>
          <p class="text-sm text-gray-600">瀏覽和管理您的媒體檔案</p>
        </div>
        <router-link
          to="/upload"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          上傳檔案
        </router-link>
      </div>
    </div>

    <!-- 搜尋和篩選 -->
    <div class="bg-white border-b px-6 py-4">
      <div class="flex items-center space-x-4">
        <div class="flex-1 max-w-lg">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜尋檔案名稱或描述..."
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              @keydown.enter="handleSearch"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        <button
          @click="handleSearch"
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          搜尋
        </button>
      </div>
    </div>

    <!-- 檔案篩選器 -->
    <FileFilters
      :selected-category="selectedCategory"
      @category-change="handleCategoryChange"
    />

    <!-- 檔案列表 -->
    <div class="flex-1 overflow-auto p-6">
      <div v-if="fileStore.isLoading" class="flex items-center justify-center h-64">
        <div class="flex flex-col items-center">
          <svg class="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-gray-500">載入中...</p>
        </div>
      </div>

      <div v-else-if="fileStore.error" class="text-center py-12">
        <div class="text-red-500 mb-2">{{ fileStore.error }}</div>
        <button
          @click="loadFiles"
          class="text-blue-600 hover:text-blue-500"
        >
          重新載入
        </button>
      </div>

      <div v-else-if="fileStore.files.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">沒有檔案</h3>
        <p class="mt-1 text-sm text-gray-500">開始上傳您的第一個檔案</p>
        <div class="mt-6">
          <router-link
            to="/upload"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            上傳檔案
          </router-link>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <FileCard
          v-for="file in fileStore.files"
          :key="file.id"
          :file="file"
          @delete="(fileId) => fileStore.deleteFiles([fileId])"
        />
      </div>
    </div>
  </div>
</template>
