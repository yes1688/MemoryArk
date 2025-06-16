<template>
  <div class="chunk-upload-tester p-6 max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold mb-4">分塊上傳測試器</h2>
    
    <!-- 檔案選擇區域 -->
    <div class="mb-6">
      <input 
        ref="fileInput" 
        type="file" 
        @change="handleFileSelect" 
        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      >
    </div>

    <!-- 檔案資訊 -->
    <div v-if="selectedFile" class="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 class="font-semibold mb-2">檔案資訊：</h3>
      <p><strong>檔名：</strong>{{ selectedFile.name }}</p>
      <p><strong>大小：</strong>{{ formatFileSize(selectedFile.size) }}</p>
      <p><strong>類型：</strong>{{ selectedFile.type }}</p>
      <p><strong>分塊數量：</strong>{{ totalChunks }}</p>
      <p><strong>分塊大小：</strong>{{ formatFileSize(chunkSize) }}</p>
    </div>

    <!-- 網路狀態 -->
    <div v-if="networkStatus" class="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 class="font-semibold mb-2">網路狀態：</h3>
      <p><strong>連線狀態：</strong>{{ networkStatus.isOnline ? '線上' : '離線' }}</p>
      <p><strong>連線類型：</strong>{{ networkStatus.connectionType }}</p>
      <p><strong>連線品質：</strong>{{ networkStatus.effectiveType }}</p>
    </div>

    <!-- 控制按鈕 -->
    <div class="mb-6 space-x-4">
      <button 
        @click="startUpload" 
        :disabled="!selectedFile || isUploading"
        class="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        {{ isUploading ? '上傳中...' : '開始上傳' }}
      </button>
      
      <button 
        @click="pauseUpload" 
        :disabled="!isUploading"
        class="px-4 py-2 bg-yellow-500 text-white rounded disabled:bg-gray-300"
      >
        暫停
      </button>
      
      <button 
        @click="cancelUpload" 
        :disabled="!isUploading && !isPaused"
        class="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
      >
        取消
      </button>
    </div>

    <!-- 上傳進度 -->
    <div v-if="uploadProgress > 0" class="mb-6">
      <div class="flex justify-between mb-2">
        <span>上傳進度</span>
        <span>{{ Math.round(uploadProgress) }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
          :style="{ width: uploadProgress + '%' }"
        ></div>
      </div>
      
      <div class="mt-2 text-sm text-gray-600">
        <p>已上傳分塊：{{ completedChunks.length }} / {{ totalChunks }}</p>
        <p v-if="uploadSpeed > 0">上傳速度：{{ formatFileSize(uploadSpeed) }}/s</p>
        <p v-if="remainingTime > 0">剩餘時間：{{ formatTime(remainingTime) }}</p>
      </div>
    </div>

    <!-- 錯誤信息 -->
    <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-red-700">❌ {{ errorMessage }}</p>
    </div>

    <!-- 成功信息 -->
    <div v-if="successMessage" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <p class="text-green-700">✅ {{ successMessage }}</p>
    </div>

    <!-- 上傳日誌 -->
    <div v-if="logs.length > 0" class="mb-6">
      <h3 class="font-semibold mb-2">上傳日誌：</h3>
      <div class="max-h-40 overflow-y-auto bg-gray-50 p-4 rounded-lg text-sm font-mono">
        <div v-for="(log, index) in logs" :key="index" class="mb-1">
          [{{ formatLogTime(log.timestamp) }}] {{ log.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { UploadQueueService } from '@/services/uploadQueue'
import type { UploadEvent, UploadEventHandler } from '@/types/upload'

// 響應式數據
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const isUploading = ref(false)
const isPaused = ref(false)
const uploadProgress = ref(0)
const completedChunks = ref<string[]>([])
const errorMessage = ref('')
const successMessage = ref('')
const logs = ref<{ message: string; timestamp: Date }[]>([])
const networkStatus = ref<any>(null)
const uploadSpeed = ref(0)
const remainingTime = ref(0)

// 配置
const chunkSize = ref(5 * 1024 * 1024) // 5MB
let uploadQueue: UploadQueueService | null = null

// 計算屬性
const totalChunks = computed(() => {
  if (!selectedFile.value) return 0
  return Math.ceil(selectedFile.value.size / chunkSize.value)
})

// 處理檔案選擇
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
    resetUploadState()
    addLog('已選擇檔案: ' + target.files[0].name)
  }
}

// 重置上傳狀態
const resetUploadState = () => {
  isUploading.value = false
  isPaused.value = false
  uploadProgress.value = 0
  completedChunks.value = []
  errorMessage.value = ''
  successMessage.value = ''
  uploadSpeed.value = 0
  remainingTime.value = 0
}

// 添加日誌
const addLog = (message: string) => {
  logs.value.push({ message, timestamp: new Date() })
  console.log(`[ChunkUploadTester] ${message}`)
}

// 開始上傳
const startUpload = async () => {
  if (!selectedFile.value) return

  try {
    isUploading.value = true
    isPaused.value = false
    errorMessage.value = ''
    successMessage.value = ''

    addLog('開始上傳檔案...')

    // 初始化上傳隊列
    if (!uploadQueue) {
      uploadQueue = new UploadQueueService({ chunkSize: chunkSize.value })
      uploadQueue.addEventListener(handleUploadEvent)
    }

    // 添加檔案到隊列
    await uploadQueue.addFiles([selectedFile.value])

    addLog('檔案已添加到上傳隊列')

  } catch (error) {
    console.error('上傳失敗:', error)
    errorMessage.value = (error as Error).message
    isUploading.value = false
    addLog('上傳失敗: ' + (error as Error).message)
  }
}

// 暫停上傳
const pauseUpload = async () => {
  if (uploadQueue) {
    await uploadQueue.pauseQueue()
    isPaused.value = true
    addLog('上傳已暫停')
  }
}

// 取消上傳
const cancelUpload = async () => {
  if (uploadQueue) {
    uploadQueue.destroy()
    uploadQueue = null
  }
  resetUploadState()
  addLog('上傳已取消')
}

// 處理上傳事件
const handleUploadEvent: UploadEventHandler = (event: UploadEvent) => {
  addLog(`收到事件: ${event.type}`)

  switch (event.type) {
    case 'queue-started':
      addLog('隊列開始處理')
      break

    case 'file-progress':
      if (event.data) {
        uploadProgress.value = event.data.progress
        if (event.data.uploadedBytes) {
          // 計算上傳速度（簡化版）
          const now = Date.now()
          if (event.data.lastTime) {
            const timeDiff = (now - event.data.lastTime) / 1000
            const bytesDiff = event.data.uploadedBytes - (event.data.lastBytes || 0)
            if (timeDiff > 0) {
              uploadSpeed.value = bytesDiff / timeDiff
            }
          }
          event.data.lastTime = now
          event.data.lastBytes = event.data.uploadedBytes
        }
      }
      break

    case 'file-completed':
      uploadProgress.value = 100
      isUploading.value = false
      successMessage.value = '檔案上傳完成！'
      addLog('檔案上傳完成')
      break

    case 'file-error':
      isUploading.value = false
      errorMessage.value = event.data?.error || '上傳失敗'
      addLog('上傳錯誤: ' + errorMessage.value)
      break

    case 'queue-completed':
      isUploading.value = false
      successMessage.value = '所有檔案上傳完成！'
      addLog('隊列處理完成')
      break

    case 'network-change':
      if (event.data) {
        networkStatus.value = event.data.newStatus || event.data
        addLog(`網路狀態變化: ${event.data.isOnline ? '上線' : '離線'}`)
      }
      break
  }
}

// 格式化檔案大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化時間
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 格式化日誌時間
const formatLogTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString()
}

// 生命周期
onMounted(() => {
  addLog('分塊上傳測試器已載入')
})

onUnmounted(() => {
  if (uploadQueue) {
    uploadQueue.destroy()
  }
})
</script>

<style scoped>
.chunk-upload-tester {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>