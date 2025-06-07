<template>
  <div
    :class="[
      'cursor-pointer select-none transition-all duration-200',
      isDragging ? 'opacity-50 scale-95' : '',
      canDrop ? 'scale-105' : ''
    ]"
    :draggable="!disabled"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <slot />
    
    <!-- 拖放指示器 -->
    <div 
      v-if="showDropIndicator && canDrop"
      class="absolute inset-0 border-2 border-primary-500 rounded-win11 bg-primary-100/20 pointer-events-none z-10"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileInfo } from '@/types/files'

interface Props {
  files: FileInfo[]
  disabled?: boolean
  allowFolderDrop?: boolean
  showDropIndicator?: boolean
}

interface Emits {
  (e: 'drag-start', files: FileInfo[]): void
  (e: 'drag-end'): void
  (e: 'files-dropped', data: { files: FileInfo[], targetFile?: FileInfo }): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  allowFolderDrop: true,
  showDropIndicator: true
})

const emit = defineEmits<Emits>()

const isDragging = ref(false)
const canDrop = ref(false)
const dragCounter = ref(0)

const handleDragStart = (e: DragEvent) => {
  if (props.disabled || props.files.length === 0) {
    e.preventDefault()
    return
  }
  
  isDragging.value = true
  
  // 設置拖放資料
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/memoryark-files', JSON.stringify(props.files.map(f => f.id)))
  }
  
  emit('drag-start', props.files)
}

const handleDragEnd = () => {
  isDragging.value = false
  emit('drag-end')
}

const handleDragEnter = (e: DragEvent) => {
  if (props.disabled) return
  
  dragCounter.value++
  
  // 檢查是否為檔案拖放
  const hasFiles = e.dataTransfer?.types.includes('application/memoryark-files')
  
  if (hasFiles) {
    // 檢查目標是否為資料夾（如果允許資料夾拖放）
    if (props.allowFolderDrop) {
      canDrop.value = true
    }
  }
}

const handleDragOver = (e: DragEvent) => {
  if (props.disabled || !canDrop.value) return
  
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

const handleDragLeave = () => {
  if (props.disabled) return
  
  dragCounter.value--
  
  if (dragCounter.value === 0) {
    canDrop.value = false
  }
}

const handleDrop = (e: DragEvent) => {
  if (props.disabled || !canDrop.value) return
  
  dragCounter.value = 0
  canDrop.value = false
  
  const filesData = e.dataTransfer?.getData('application/memoryark-files')
  
  if (filesData) {
    try {
      const draggedFileIds = JSON.parse(filesData) as number[]
      
      // 這裡需要從外部獲取完整的檔案資訊
      // 暫時發送 ID，讓父組件處理
      emit('files-dropped', { 
        files: draggedFileIds.map(id => ({ id } as FileInfo)),
        targetFile: props.files[0] 
      })
    } catch (error) {
      console.error('Failed to parse dragged files data:', error)
    }
  }
}
</script>