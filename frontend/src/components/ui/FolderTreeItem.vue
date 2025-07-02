<template>
  <div>
    <div
      @click="selectFolder"
      :class="[
        'folder-item flex items-center p-2 cursor-pointer transition-all duration-200 border-b relative overflow-hidden',
        isSelected ? 'selected glass-medium' : 'hover:glass-light',
        isDisabled ? 'disabled opacity-50' : ''
      ]"
      :style="{ 
        paddingLeft: `${(level + 1) * 16 + 12}px`,
        borderColor: 'var(--glass-border-primary)'
      }"
    >
      <!-- 展開/摺疊按鈕 -->
      <button
        v-if="hasChildren"
        @click.stop="toggleExpand"
        class="mr-1 p-1 hover:glass-light rounded transition-all duration-150 flex-shrink-0"
      >
        <ChevronRightIcon 
          v-if="!isExpanded"
          class="w-3 h-3" 
        />
        <ChevronDownIcon 
          v-else
          class="w-3 h-3" 
        />
      </button>
      <div v-else class="w-5 flex-shrink-0"></div>
      
      <!-- 資料夾圖示和名稱 -->
      <FolderIcon class="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
      <span class="text-sm truncate">{{ folder.name }}</span>
    </div>
    
    <!-- 子資料夾 -->
    <template v-if="isExpanded && hasChildren">
      <FolderTreeItem
        v-for="child in folderChildren"
        :key="child.id"
        :folder="child"
        :selected-folder-id="selectedFolderId"
        :expanded-folders="expandedFolders"
        :disabled-folder-ids="disabledFolderIds"
        :level="level + 1"
        @select="(folderId, folderPath) => $emit('select', folderId, folderPath)"
        @toggle="$emit('toggle', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FolderIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import type { FileInfo } from '@/types/files'

interface Props {
  folder: FileInfo
  selectedFolderId: number | null
  expandedFolders: Set<number>
  disabledFolderIds: Set<number>
  level: number
}

interface Emits {
  (e: 'select', folderId: number, folderPath: string): void
  (e: 'toggle', folderId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 計算屬性
const isExpanded = computed(() => props.expandedFolders.has(props.folder.id))
const isSelected = computed(() => props.selectedFolderId === props.folder.id)
const isDisabled = computed(() => props.disabledFolderIds.has(props.folder.id))

const folderChildren = computed(() => {
  return props.folder.children?.filter(child => child.isDirectory) || []
})

const hasChildren = computed(() => folderChildren.value.length > 0)

// 方法
const selectFolder = () => {
  if (!isDisabled.value) {
    emit('select', props.folder.id, props.folder.virtualPath || props.folder.name)
  }
}

const toggleExpand = () => {
  emit('toggle', props.folder.id)
}
</script>

<style scoped>
.folder-item {
  position: relative;
}

/* 玻璃反光效果 */
.folder-item:not(.disabled):hover::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  pointer-events: none;
  transform: translateX(-100%);
  animation: shimmer 1s ease;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.folder-item.selected {
  @apply text-blue-700;
}

.folder-item.disabled {
  @apply cursor-not-allowed;
}

.folder-item.disabled:hover {
  @apply bg-transparent;
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .folder-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .folder-item.selected {
    background-color: rgba(59, 130, 246, 0.15);
    color: rgb(96, 165, 250);
  }
}
</style>