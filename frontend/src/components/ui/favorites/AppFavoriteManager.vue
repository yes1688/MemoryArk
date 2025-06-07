<template>
  <div class="favorite-manager">
    <!-- 收藏資料夾管理 -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">收藏夾</h3>
        <AppButton
          @click="showCreateFolder = true"
          variant="ghost"
          size="small"
        >
          <template #icon-left>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
          </template>
          新增收藏夾
        </AppButton>
      </div>
      
      <!-- 收藏夾列表 -->
      <div class="space-y-2">
        <div
          v-for="folder in favoriteFolders"
          :key="folder.id"
          :class="[
            'flex items-center justify-between p-3 rounded-win11 border transition-colors duration-200',
            selectedFolderId === folder.id
              ? 'bg-church-primary/10 border-church-primary'
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
          ]"
        >
          <div class="flex items-center space-x-3">
            <div class="text-xl">{{ folder.icon || '📁' }}</div>
            <div>
              <div class="font-medium text-gray-900">{{ folder.name }}</div>
              <div class="text-sm text-gray-500">{{ folder.fileCount || 0 }} 個檔案</div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <button
              @click="selectFolder(folder.id)"
              :class="[
                'px-3 py-1 rounded text-sm transition-colors duration-200',
                selectedFolderId === folder.id
                  ? 'bg-church-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              {{ selectedFolderId === folder.id ? '已選擇' : '選擇' }}
            </button>
            
            <button
              @click="editFolder(folder)"
              class="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              title="編輯"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 預設收藏夾（不可刪除） -->
        <div
          :class="[
            'flex items-center justify-between p-3 rounded-win11 border transition-colors duration-200',
            selectedFolderId === null
              ? 'bg-church-primary/10 border-church-primary'
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
          ]"
        >
          <div class="flex items-center space-x-3">
            <div class="text-xl">⭐</div>
            <div>
              <div class="font-medium text-gray-900">預設收藏夾</div>
              <div class="text-sm text-gray-500">{{ defaultFavoriteCount }} 個檔案</div>
            </div>
          </div>
          
          <button
            @click="selectFolder(null)"
            :class="[
              'px-3 py-1 rounded text-sm transition-colors duration-200',
              selectedFolderId === null
                ? 'bg-church-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            {{ selectedFolderId === null ? '已選擇' : '選擇' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 收藏備註 -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">收藏備註（選填）</label>
      <textarea
        v-model="favoriteNote"
        rows="3"
        placeholder="為這個收藏添加備註..."
        class="w-full px-3 py-2 border border-gray-300 rounded-win11 focus:ring-2 focus:ring-church-primary focus:border-transparent resize-none"
      />
    </div>
    
    <!-- 操作按鈕 -->
    <div class="flex justify-end space-x-3">
      <AppButton
        @click="$emit('close')"
        variant="outline"
        size="medium"
      >
        取消
      </AppButton>
      
      <AppButton
        @click="saveFavorite"
        variant="primary"
        size="medium"
        :disabled="!canSave"
      >
        {{ isAlreadyFavorite ? '更新收藏' : '加入收藏' }}
      </AppButton>
    </div>
    
    <!-- 創建收藏夾彈窗 -->
    <AppDialog
      :visible="showCreateFolder"
      @close="showCreateFolder = false"
      title="創建收藏夾"
      size="medium"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">收藏夾名稱</label>
          <AppInput
            v-model="newFolderName"
            placeholder="輸入收藏夾名稱..."
            size="medium"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">選擇圖標</label>
          <div class="grid grid-cols-8 gap-2">
            <button
              v-for="icon in folderIcons"
              :key="icon"
              @click="newFolderIcon = icon"
              :class="[
                'p-2 text-xl rounded-win11 border transition-colors duration-200',
                newFolderIcon === icon
                  ? 'bg-church-primary/20 border-church-primary'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              ]"
            >
              {{ icon }}
            </button>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end space-x-3">
          <AppButton
            @click="showCreateFolder = false"
            variant="outline"
            size="medium"
          >
            取消
          </AppButton>
          
          <AppButton
            @click="createFolder"
            variant="primary"
            size="medium"
            :disabled="!newFolderName.trim()"
          >
            創建
          </AppButton>
        </div>
      </template>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AppButton, AppDialog, AppInput } from '@/components/ui'

interface FavoriteFolder {
  id: number
  name: string
  icon: string
  fileCount?: number
  sortOrder: number
  createdAt: string
}

interface Props {
  fileId: number
  fileName: string
  isAlreadyFavorite?: boolean
  currentFolderId?: number | null
  currentNote?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'favorite-added', data: { fileId: number, folderId: number | null, note: string }): void
  (e: 'favorite-updated', data: { fileId: number, folderId: number | null, note: string }): void
  (e: 'favorite-removed', fileId: number): void
}

const props = withDefaults(defineProps<Props>(), {
  isAlreadyFavorite: false,
  currentFolderId: null,
  currentNote: ''
})

const emit = defineEmits<Emits>()

// 狀態管理
const favoriteFolders = ref<FavoriteFolder[]>([])
const selectedFolderId = ref<number | null>(props.currentFolderId)
const favoriteNote = ref(props.currentNote)
const defaultFavoriteCount = ref(0)
const showCreateFolder = ref(false)
const newFolderName = ref('')
const newFolderIcon = ref('📁')
const isLoading = ref(false)

// 預定義圖標
const folderIcons = [
  '📁', '📂', '🗂️', '📋', '🏷️', '⭐', '❤️', '📌',
  '🎬', '🎵', '📄', '📊', '🖼️', '💼', '🔒', '🌟'
]

// 計算屬性
const canSave = computed(() => {
  return selectedFolderId.value !== undefined
})

// 方法
const loadFavoriteFolders = async () => {
  isLoading.value = true
  try {
    // 模擬 API 調用
    await new Promise(resolve => setTimeout(resolve, 300))
    
    favoriteFolders.value = [
      {
        id: 1,
        name: '工作資料',
        icon: '💼',
        fileCount: 12,
        sortOrder: 1,
        createdAt: '2024-01-15'
      },
      {
        id: 2,
        name: '講道影音',
        icon: '🎬',
        fileCount: 8,
        sortOrder: 2,
        createdAt: '2024-01-20'
      },
      {
        id: 3,
        name: '詩歌收藏',
        icon: '🎵',
        fileCount: 15,
        sortOrder: 3,
        createdAt: '2024-01-25'
      }
    ]
    
    defaultFavoriteCount.value = 24
  } catch (error) {
    console.error('Failed to load favorite folders:', error)
  } finally {
    isLoading.value = false
  }
}

const selectFolder = (folderId: number | null) => {
  selectedFolderId.value = folderId
}

const saveFavorite = async () => {
  try {
    const data = {
      fileId: props.fileId,
      folderId: selectedFolderId.value,
      note: favoriteNote.value.trim()
    }
    
    if (props.isAlreadyFavorite) {
      emit('favorite-updated', data)
    } else {
      emit('favorite-added', data)
    }
    
    emit('close')
  } catch (error) {
    console.error('Failed to save favorite:', error)
  }
}

const createFolder = async () => {
  const name = newFolderName.value.trim()
  if (!name) return
  
  try {
    // 模擬 API 創建收藏夾
    const newFolder: FavoriteFolder = {
      id: Date.now(),
      name,
      icon: newFolderIcon.value,
      fileCount: 0,
      sortOrder: favoriteFolders.value.length + 1,
      createdAt: new Date().toISOString()
    }
    
    favoriteFolders.value.push(newFolder)
    selectedFolderId.value = newFolder.id
    
    // 重置表單
    newFolderName.value = ''
    newFolderIcon.value = '📁'
    showCreateFolder.value = false
  } catch (error) {
    console.error('Failed to create folder:', error)
  }
}

const editFolder = (folder: FavoriteFolder) => {
  // TODO: 實作編輯收藏夾功能
  console.log('Edit folder:', folder)
}

// 生命週期
onMounted(() => {
  loadFavoriteFolders()
})
</script>

<style scoped>
.favorite-manager {
  min-width: 400px;
  max-width: 500px;
}
</style>