<template>
  <div class="folder-selector">
    <!-- 玻璃化當前路徑顯示 -->
    <div class="path-display glass-light p-3 border border-glass-border rounded-lg mb-4">
      <div class="flex items-center text-sm text-gray-700 dark:text-gray-300">
        <FolderIcon class="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
        <span>目標位置：{{ selectedFolderPath || '根目錄' }}</span>
      </div>
    </div>

    <!-- 玻璃化資料夾樹狀結構 -->
    <div class="folder-tree max-h-64 overflow-y-auto glass-light border border-glass-border rounded-lg">
      <!-- 玻璃化根目錄選項 -->
      <div
        @click="selectFolder(null, '根目錄')"
        :class="[
          'folder-item flex items-center p-3 cursor-pointer transition-all duration-200 ease-glass border-b border-glass-border hover:glass-medium',
          selectedFolderId === null ? 'selected glass-medium' : ''
        ]"
      >
        <HomeIcon class="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">根目錄</span>
      </div>

      <!-- 玻璃化載入中狀態 -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="w-5 h-5 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">載入中...</span>
      </div>

      <!-- 資料夾列表 -->
      <template v-else>
        <div
          v-for="folder in folderTree"
          :key="folder.id"
          class="folder-group"
        >
          <FolderTreeItem
            :folder="folder"
            :selected-folder-id="selectedFolderId"
            :expanded-folders="expandedFolders"
            :disabled-folder-ids="disabledFolderIds"
            :level="0"
            @select="selectFolder"
            @toggle="toggleFolder"
          />
        </div>
      </template>

      <!-- 玻璃化空狀態 -->
      <div v-if="!loading && folderTree.length === 0" class="text-center py-8">
        <FolderIcon class="w-8 h-8 mx-auto mb-2 opacity-50 text-gray-400 dark:text-gray-500" />
        <p class="text-sm text-gray-500 dark:text-gray-400">暫無資料夾</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { FolderIcon, HomeIcon } from '@heroicons/vue/24/outline'
import { fileApi } from '@/api/files'
import type { FileInfo } from '@/types/files'
import FolderTreeItem from './ui/FolderTreeItem.vue'

interface Props {
  // 已選中的資料夾ID
  modelValue?: number | null
  // 需要禁用的資料夾ID集合（例如移動時禁用目標本身和其子資料夾）
  disabledFolderIds?: Set<number>
}

interface Emits {
  (e: 'update:modelValue', value: number | null): void
  (e: 'select', folderId: number | null, folderPath: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  disabledFolderIds: () => new Set()
})

const emit = defineEmits<Emits>()

// 狀態
const loading = ref(false)
const folders = ref<FileInfo[]>([])
const expandedFolders = ref<Set<number>>(new Set())
const selectedFolderId = ref<number | null>(props.modelValue)
const selectedFolderPath = ref<string>('')

// 構建樹狀結構
const folderTree = computed(() => {
  const buildTree = (items: FileInfo[], parentId: number | null = null): FileInfo[] => {
    return items
      .filter(item => item.parentId === parentId && item.isDirectory)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id)
      }))
  }
  
  return buildTree(folders.value)
})

// 載入資料夾列表
const loadFolders = async () => {
  try {
    loading.value = true
    const response = await fileApi.getFiles({
      limit: 1000, // 載入更多資料夾以構建完整樹狀結構
      includeDeleted: false
    })
    folders.value = response.files.filter(f => f.isDirectory)
  } catch (error) {
    console.error('載入資料夾列表失敗:', error)
  } finally {
    loading.value = false
  }
}

// 選擇資料夾
const selectFolder = (folderId: number | null, folderPath: string) => {
  selectedFolderId.value = folderId
  selectedFolderPath.value = folderPath
  emit('update:modelValue', folderId)
  emit('select', folderId, folderPath)
}

// 切換資料夾展開狀態
const toggleFolder = (folderId: number) => {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  } else {
    expandedFolders.value.add(folderId)
  }
}

// 根據路徑查找資料夾名稱
const findFolderPath = (folderId: number): string => {
  const findFolder = (items: FileInfo[], id: number): FileInfo | null => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = findFolder(item.children, id)
        if (found) return found
      }
    }
    return null
  }
  
  const folder = findFolder(folderTree.value, folderId)
  return folder?.virtualPath || folder?.name || ''
}

// 初始化
onMounted(() => {
  loadFolders()
  
  // 如果有預設選中的資料夾，設定路徑
  if (props.modelValue) {
    selectedFolderId.value = props.modelValue
    // 等資料夾載入完成後再設定路徑
    setTimeout(() => {
      selectedFolderPath.value = findFolderPath(props.modelValue!)
    }, 100)
  }
})
</script>

<style scoped>
/* 玻璃化資料夾選擇器樣式 */
.path-display {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.folder-tree {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.folder-item {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.folder-item:hover {
  transform: translateX(2px);
}

.folder-item.selected {
  background: linear-gradient(135deg, 
    rgba(59, 130, 246, 0.15), 
    rgba(37, 99, 235, 0.1)
  );
  border-left: 3px solid theme('colors.blue.500');
  transform: translateX(4px);
}

@media (prefers-color-scheme: dark) {
  .folder-item.selected {
    background: linear-gradient(135deg, 
      rgba(59, 130, 246, 0.2), 
      rgba(37, 99, 235, 0.15)
    );
    border-left-color: theme('colors.blue.400');
  }
}

.folder-item.disabled {
  @apply opacity-50 cursor-not-allowed;
  filter: grayscale(0.5);
}

.folder-item.disabled:hover {
  background: transparent;
  transform: none;
}

/* 玻璃化滾動條樣式 */
.folder-tree::-webkit-scrollbar {
  width: 6px;
}

.folder-tree::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.folder-tree::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.folder-tree::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

@media (prefers-color-scheme: dark) {
  .folder-tree::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }
  
  .folder-tree::-webkit-scrollbar-thumb {
    background: rgba(107, 114, 128, 0.5);
  }
  
  .folder-tree::-webkit-scrollbar-thumb:hover {
    background: rgba(107, 114, 128, 0.7);
  }
}

/* 減少動畫偏好設定 */
@media (prefers-reduced-motion: reduce) {
  .folder-item,
  .folder-item:hover,
  .folder-item.selected {
    transform: none;
    transition: none;
  }
}

/* 高對比度模式支援 */
@media (prefers-contrast: high) {
  .path-display,
  .folder-tree {
    border: 2px solid theme('colors.gray.900');
    background: rgba(255, 255, 255, 1);
  }
  
  .folder-item.selected {
    background: theme('colors.blue.100');
    border-left-color: theme('colors.blue.700');
  }
  
  @media (prefers-color-scheme: dark) {
    .path-display,
    .folder-tree {
      background: rgba(0, 0, 0, 1);
      border-color: theme('colors.gray.100');
    }
    
    .folder-item.selected {
      background: theme('colors.blue.900');
      border-left-color: theme('colors.blue.300');
    }
  }
}
</style>