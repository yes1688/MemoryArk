<template>
  <div 
    :class="[
      'relative transition-colors duration-200',
      isDragging ? 'bg-primary-50 border-primary-300' : 'bg-transparent',
      showDropZone ? 'border-2 border-dashed border-gray-300 rounded-win11-lg' : ''
    ]"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- 拖放覆蓋層 -->
    <div 
      v-if="isDragging && showDropZone"
      class="absolute inset-0 bg-primary-100/50 border-2 border-dashed border-primary-500 rounded-win11-lg z-50 flex items-center justify-center"
    >
      <div class="text-center">
        <svg class="w-16 h-16 text-primary-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        <p class="text-lg font-medium text-primary-700">{{ dropText }}</p>
        <p class="text-sm text-primary-600 mt-2">支援拖放檔案和資料夾</p>
      </div>
    </div>
    
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  disabled?: boolean
  acceptTypes?: string[]
  maxFileSize?: number // in bytes
  showDropZone?: boolean
  dropText?: string
}

interface Emits {
  (e: 'files-dropped', files: File[]): void
  (e: 'drag-enter'): void
  (e: 'drag-leave'): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  acceptTypes: () => [],
  maxFileSize: 100 * 1024 * 1024, // 100MB
  showDropZone: true,
  dropText: '鬆開以上傳檔案'
})

const emit = defineEmits<Emits>()

const isDragging = ref(false)
const dragCounter = ref(0)

const handleDragEnter = (e: DragEvent) => {
  if (props.disabled) return
  
  dragCounter.value++
  
  if (e.dataTransfer?.types.includes('Files')) {
    isDragging.value = true
    emit('drag-enter')
  }
}

const handleDragOver = (e: DragEvent) => {
  if (props.disabled) return
  
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

const handleDragLeave = (e: DragEvent) => {
  if (props.disabled) return
  
  dragCounter.value--
  
  if (dragCounter.value === 0) {
    isDragging.value = false
    emit('drag-leave')
  }
}

const handleDrop = async (e: DragEvent) => {
  if (props.disabled) return
  
  dragCounter.value = 0
  isDragging.value = false
  
  const files = Array.from(e.dataTransfer?.files || [])
  
  if (files.length === 0) return
  
  // 過濾檔案類型（如果有指定）
  const filteredFiles = props.acceptTypes.length > 0
    ? files.filter(file => props.acceptTypes.some(type => file.type.includes(type)))
    : files
  
  // 過濾檔案大小
  const validFiles = filteredFiles.filter(file => file.size <= props.maxFileSize)
  
  if (validFiles.length > 0) {
    emit('files-dropped', validFiles)
  }
  
  // 如果有檔案被過濾掉，可以顯示警告（未來可擴展）
  if (validFiles.length < files.length) {
    console.warn('Some files were filtered out due to type or size restrictions')
  }
}
</script>