<template>
  <teleport to="body">
    <div
      v-if="isVisible"
      ref="contextMenu"
      :style="{ top: `${position.y}px`, left: `${position.x}px` }"
      class="fixed z-50 glass-heavy rounded-lg shadow-glass-lg py-1 min-w-48 overflow-hidden"
      @contextmenu.prevent
    >
      <template v-for="item in menuItems" :key="item.id">
        <!-- 分隔線 -->
        <div v-if="item.type === 'divider'" class="h-px my-1 mx-2" style="background: var(--glass-border-primary); opacity: 0.3;"></div>
        
        <!-- 選單項目 -->
        <button
          v-else
          :disabled="item.disabled"
          :class="[
            'w-full px-4 py-2 text-left text-sm transition-all duration-150 flex items-center relative overflow-hidden',
            item.disabled 
              ? 'text-gray-400 cursor-not-allowed opacity-50' 
              : item.danger 
                ? 'text-red-600 hover:glass-light hover:text-red-700' 
                : 'text-gray-700 hover:glass-light hover:text-gray-900'
          ]"
          @click="handleItemClick(item)"
        >
          <component 
            v-if="item.icon" 
            :is="item.icon" 
            class="w-4 h-4 mr-3" 
          />
          <span>{{ item.label }}</span>
          <span v-if="item.shortcut" class="ml-auto text-xs text-gray-400">
            {{ item.shortcut }}
          </span>
        </button>
      </template>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  EyeIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ScissorsIcon,
  ClipboardIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
  FolderPlusIcon,
  CloudArrowUpIcon,
  ArrowUturnLeftIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import type { FileInfo } from '@/types/files'

interface MenuItem {
  id: string
  type?: 'item' | 'divider'
  label?: string
  icon?: any
  shortcut?: string
  action?: string
  disabled?: boolean
  danger?: boolean
}

interface Props {
  isVisible: boolean
  position: { x: number; y: number }
  selectedFiles: FileInfo[]
  currentFolder?: FileInfo
  canPaste?: boolean
  isTrash?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'action', action: string, files?: FileInfo[]): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedFiles: () => [],
  currentFolder: undefined,
  canPaste: false,
  isTrash: false
})

const emit = defineEmits<Emits>()

const contextMenu = ref<HTMLElement>()

// 計算選單項目
const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = []
  const selectedCount = props.selectedFiles.length
  const hasSelection = selectedCount > 0
  const isMultiSelect = selectedCount > 1
  const selectedFile = hasSelection ? props.selectedFiles[0] : null
  const isDirectory = selectedFile?.isDirectory || false

  // 在垃圾桶中的選單
  if (props.isTrash) {
    if (hasSelection) {
      items.push({
        id: 'restore',
        label: isMultiSelect ? `還原 ${selectedCount} 個項目` : '還原',
        icon: ArrowUturnLeftIcon,
        action: 'restore'
      })
      items.push({
        id: 'delete-permanent',
        label: isMultiSelect ? `永久刪除 ${selectedCount} 個項目` : '永久刪除',
        icon: XMarkIcon,
        action: 'delete-permanent',
        danger: true
      })
    }
    return items
  }

  // 一般檔案選單
  if (hasSelection) {
    // 單檔案操作
    if (!isMultiSelect) {
      items.push({
        id: 'preview',
        label: '預覽',
        icon: EyeIcon,
        action: 'preview',
        disabled: isDirectory
      })
    }
    
    items.push({
      id: 'download',
      label: isMultiSelect ? `下載 ${selectedCount} 個項目` : '下載',
      icon: ArrowDownTrayIcon,
      action: 'download'
    })

    if (!isMultiSelect) {
      items.push({
        id: 'rename',
        label: '重新命名',
        icon: PencilIcon,
        action: 'rename',
        shortcut: 'F2'
      })
    }

    items.push({ id: 'divider-1', type: 'divider' })

    items.push({
      id: 'copy',
      label: isMultiSelect ? `複製 ${selectedCount} 個項目` : '複製',
      icon: DocumentDuplicateIcon,
      action: 'copy',
      shortcut: 'Ctrl+C'
    })

    items.push({
      id: 'cut',
      label: isMultiSelect ? `剪下 ${selectedCount} 個項目` : '剪下',
      icon: ScissorsIcon,
      action: 'cut',
      shortcut: 'Ctrl+X'
    })

    if (!isMultiSelect) {
      items.push({ id: 'divider-2', type: 'divider' })

      items.push({
        id: 'share',
        label: '分享',
        icon: ShareIcon,
        action: 'share',
        disabled: isDirectory
      })

      items.push({
        id: 'favorite',
        label: '加入最愛',
        icon: StarIcon,
        action: 'favorite'
      })
    }

    items.push({ id: 'divider-3', type: 'divider' })

    items.push({
      id: 'delete',
      label: isMultiSelect ? `刪除 ${selectedCount} 個項目` : '刪除',
      icon: TrashIcon,
      action: 'delete',
      danger: true,
      shortcut: 'Delete'
    })
  } else {
    // 空白區域選單
    items.push({
      id: 'upload',
      label: '上傳檔案',
      icon: CloudArrowUpIcon,
      action: 'upload'
    })

    items.push({
      id: 'new-folder',
      label: '新增資料夾',
      icon: FolderPlusIcon,
      action: 'new-folder'
    })

    if (props.canPaste) {
      items.push({ id: 'divider-4', type: 'divider' })
      
      items.push({
        id: 'paste',
        label: '貼上',
        icon: ClipboardIcon,
        action: 'paste',
        shortcut: 'Ctrl+V'
      })
    }
  }

  return items
})

// 處理選單項目點擊
const handleItemClick = (item: MenuItem) => {
  if (item.disabled || !item.action) return
  
  emit('action', item.action, props.selectedFiles)
  emit('close')
}

// 處理點擊外部關閉
const handleClickOutside = (event: MouseEvent) => {
  if (contextMenu.value && !contextMenu.value.contains(event.target as Node)) {
    emit('close')
  }
}

// 處理鍵盤事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close')
  }
}

// 調整選單位置避免超出視窗
const adjustPosition = () => {
  if (!contextMenu.value) return

  const menu = contextMenu.value
  const rect = menu.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let { x, y } = props.position

  // 調整水平位置
  if (x + rect.width > viewportWidth) {
    x = viewportWidth - rect.width - 8
  }

  // 調整垂直位置
  if (y + rect.height > viewportHeight) {
    y = viewportHeight - rect.height - 8
  }

  // 確保不會超出左上角
  x = Math.max(8, x)
  y = Math.max(8, y)

  menu.style.left = `${x}px`
  menu.style.top = `${y}px`
}

onMounted(() => {
  nextTick(() => {
    adjustPosition()
  })
  
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>
