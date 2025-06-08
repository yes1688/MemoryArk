<template>
  <div class="quick-actions grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <!-- 上傳檔案 -->
    <button 
      @click="openUploadModal"
      class="action-card upload bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 hover:border-blue-400"
    >
      <div class="icon-wrapper bg-blue-500 text-white">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
      </div>
      <div class="content">
        <span class="title">上傳檔案</span>
        <p class="hint">拖放或點擊上傳</p>
      </div>
    </button>
    
    <!-- 新建資料夾 -->
    <button 
      @click="createFolder"
      class="action-card folder bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 border-2 border-amber-200 hover:border-amber-400"
    >
      <div class="icon-wrapper bg-amber-500 text-white">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
      </div>
      <div class="content">
        <span class="title">新建資料夾</span>
        <p class="hint">整理檔案</p>
      </div>
    </button>
    
    <!-- 共享資料夾 -->
    <button 
      @click="openSharedFolder"
      class="action-card shared bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200 hover:border-purple-400"
    >
      <div class="icon-wrapper bg-purple-500 text-white">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      </div>
      <div class="content">
        <span class="title">共享資料夾</span>
        <p class="hint">教會資源</p>
      </div>
    </button>
    
    <!-- 安息日資料 -->
    <button 
      @click="openSabbathData"
      class="action-card sabbath bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-2 border-green-200 hover:border-green-400"
    >
      <div class="icon-wrapper bg-green-500 text-white">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
      <div class="content">
        <span class="title">安息日資料</span>
        <p class="hint">講道影音</p>
      </div>
    </button>
  </div>
  
  <!-- 上傳模態框 -->
  <UploadModal
    :isVisible="showUploadModal"
    @close="showUploadModal = false"
    @files-uploaded="handleFilesUploaded"
  />
  
  <!-- 創建資料夾模態框 -->
  <CreateFolderModal
    :isVisible="showCreateFolderModal"
    @close="showCreateFolderModal = false"
    @folder-created="handleFolderCreated"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UploadModal from '@/components/UploadModal.vue'
import CreateFolderModal from '@/components/CreateFolderModal.vue'

const router = useRouter()

// 狀態管理
const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)

interface Emits {
  (e: 'action-performed', action: string, data?: any): void
}

const emit = defineEmits<Emits>()

// 方法
const openUploadModal = () => {
  showUploadModal.value = true
  emit('action-performed', 'upload-modal-opened')
}

const createFolder = () => {
  showCreateFolderModal.value = true
  emit('action-performed', 'create-folder-modal-opened')
}

const openSharedFolder = () => {
  router.push('/shared')
  emit('action-performed', 'navigate-to-shared')
}

const openSabbathData = () => {
  router.push('/sabbath')
  emit('action-performed', 'navigate-to-sabbath')
}

const handleFilesUploaded = (files: any[]) => {
  showUploadModal.value = false
  emit('action-performed', 'files-uploaded', files)
  
  // 顯示成功通知
  console.log(`成功上傳 ${files.length} 個檔案`)
}

const handleFolderCreated = (folder: any) => {
  showCreateFolderModal.value = false
  emit('action-performed', 'folder-created', folder)
  
  // 顯示成功通知
  console.log(`成功創建資料夾：${folder.name}`)
}
</script>

<style scoped>
.action-card {
  @apply p-6 rounded-xl transition-all duration-200;
  @apply hover:shadow-lg hover:scale-105;
  @apply focus:outline-none focus:ring-2 focus:ring-church-primary;
  @apply flex flex-col items-center text-center space-y-3;
  min-height: 120px;
}

.icon-wrapper {
  @apply w-12 h-12 rounded-full flex items-center justify-center;
  @apply shadow-md;
}

.content {
  @apply flex-1 flex flex-col justify-center;
}

.title {
  @apply font-semibold text-gray-900 text-sm;
}

.hint {
  @apply text-xs text-gray-600 mt-1;
}

/* 不同卡片的主題色 */
.action-card.upload:hover .icon-wrapper {
  @apply bg-blue-600;
}

.action-card.folder:hover .icon-wrapper {
  @apply bg-amber-600;
}

.action-card.shared:hover .icon-wrapper {
  @apply bg-purple-600;
}

.action-card.sabbath:hover .icon-wrapper {
  @apply bg-green-600;
}

/* 響應式設計 */
@media (max-width: 640px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  
  .action-card {
    padding: 1rem;
    min-height: 100px;
  }
  
  .icon-wrapper {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  .icon-wrapper svg {
    width: 1.25rem;
    height: 1.25rem;
  }
  
  .title {
    font-size: 0.75rem;
  }
  
  .hint {
    display: none;
  }
}

@media (max-width: 480px) {
  .action-card {
    padding: 0.75rem;
    min-height: 80px;
    space-y: 0.5rem;
  }
}

/* 動畫效果 */
.action-card {
  transform: translateY(0);
}

.action-card:hover {
  transform: translateY(-2px);
}

.action-card:active {
  transform: translateY(0);
}

/* 聚焦狀態 */
.action-card:focus {
  @apply ring-2 ring-church-primary ring-offset-2;
}

/* 加載狀態 */
.action-card.loading {
  @apply opacity-75 cursor-not-allowed;
  transform: none !important;
}

.action-card.loading:hover {
  transform: none !important;
}
</style>