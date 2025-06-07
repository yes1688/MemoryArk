<template>
  <div class="tag-manager">
    <!-- 標籤輸入區 -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">檔案標籤</label>
      <div class="flex items-center space-x-2">
        <AppInput
          v-model="newTagName"
          placeholder="輸入新標籤..."
          size="small"
          @keydown.enter="addNewTag"
          @input="onTagInput"
          class="flex-1"
        />
        <AppButton
          variant="ghost"
          size="small"
          @click="showTagPicker = !showTagPicker"
          title="選擇標籤"
        >
          <template #icon-left>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
          </template>
        </AppButton>
      </div>
    </div>
    
    <!-- 已選標籤 -->
    <div v-if="selectedTags.length > 0" class="mb-4">
      <div class="flex flex-wrap gap-2">
        <span 
          v-for="tag in selectedTags" 
          :key="tag.id"
          :style="{ backgroundColor: tag.color }"
          class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white space-x-1"
        >
          <component v-if="tag.icon" :is="getIconComponent(tag.icon)" class="w-3 h-3" />
          <span>{{ tag.name }}</span>
          <button
            @click="removeTag(tag)"
            class="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors duration-200"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </span>
      </div>
    </div>
    
    <!-- 標籤選擇器 -->
    <div v-if="showTagPicker" class="tag-picker">
      <div class="bg-white border border-gray-200 rounded-win11 shadow-win11 p-4 space-y-4">
        <!-- 搜尋框 -->
        <AppInput
          v-model="tagSearchQuery"
          placeholder="搜尋標籤..."
          size="small"
          clearable
        >
          <template #prefix>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </template>
        </AppInput>
        
        <!-- 熱門標籤 -->
        <div v-if="filteredPopularTags.length > 0">
          <h4 class="text-sm font-medium text-gray-700 mb-2">熱門標籤</h4>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in filteredPopularTags"
              :key="tag.id"
              @click="selectTag(tag)"
              :class="[
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium space-x-1 transition-colors duration-200',
                isTagSelected(tag) 
                  ? 'bg-church-primary text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              <component v-if="tag.icon" :is="getIconComponent(tag.icon)" class="w-3 h-3" />
              <span>{{ tag.name }}</span>
            </button>
          </div>
        </div>
        
        <!-- 所有標籤 -->
        <div v-if="filteredAllTags.length > 0">
          <h4 class="text-sm font-medium text-gray-700 mb-2">所有標籤</h4>
          <div class="max-h-40 overflow-y-auto space-y-1">
            <button
              v-for="tag in filteredAllTags"
              :key="tag.id"
              @click="selectTag(tag)"
              :class="[
                'w-full flex items-center justify-between px-3 py-2 rounded-win11 text-sm transition-colors duration-200',
                isTagSelected(tag) 
                  ? 'bg-church-primary text-white' 
                  : 'hover:bg-gray-50 text-gray-700'
              ]"
            >
              <div class="flex items-center space-x-2">
                <component v-if="tag.icon" :is="getIconComponent(tag.icon)" class="w-4 h-4" />
                <span>{{ tag.name }}</span>
              </div>
              <span class="text-xs opacity-75">{{ tag.usageCount || 0 }}</span>
            </button>
          </div>
        </div>
        
        <!-- 創建新標籤 -->
        <div v-if="newTagName && !tagExists(newTagName)">
          <div class="border-t border-gray-200 pt-3">
            <button
              @click="createNewTag"
              class="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-church-primary text-white rounded-win11 hover:bg-church-primary-light transition-colors duration-200"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              <span>創建 "{{ newTagName }}"</span>
            </button>
          </div>
        </div>
        
        <!-- 快速關閉 -->
        <div class="flex justify-end pt-2 border-t border-gray-200">
          <AppButton
            variant="ghost"
            size="small"
            @click="showTagPicker = false"
          >
            關閉
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { AppInput, AppButton } from '@/components/ui'

export interface Tag {
  id: number
  name: string
  color: string
  icon?: string
  usageCount?: number
  createdBy?: number
  createdAt?: string
}

interface Props {
  selectedTags?: Tag[]
  fileId?: number
  disabled?: boolean
}

interface Emits {
  (e: 'update:selectedTags', tags: Tag[]): void
  (e: 'tagsChanged', tags: Tag[]): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedTags: () => [],
  disabled: false
})

const emit = defineEmits<Emits>()

// 響應式狀態
const newTagName = ref('')
const tagSearchQuery = ref('')
const showTagPicker = ref(false)
const allTags = ref<Tag[]>([])
const popularTags = ref<Tag[]>([])
const isLoading = ref(false)

// 本地選中的標籤
const selectedTags = ref<Tag[]>([...props.selectedTags])

// 計算屬性
const filteredPopularTags = computed(() => {
  if (!tagSearchQuery.value) return popularTags.value
  return popularTags.value.filter(tag => 
    tag.name.toLowerCase().includes(tagSearchQuery.value.toLowerCase())
  )
})

const filteredAllTags = computed(() => {
  const query = tagSearchQuery.value.toLowerCase()
  return allTags.value.filter(tag => 
    tag.name.toLowerCase().includes(query) &&
    !popularTags.value.some(popular => popular.id === tag.id)
  )
})

// 方法
const loadTags = async () => {
  isLoading.value = true
  try {
    // 模擬 API 調用
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 預設標籤資料
    allTags.value = [
      { id: 1, name: '重要', color: '#EF4444', icon: 'star', usageCount: 45 },
      { id: 2, name: '工作', color: '#3B82F6', icon: 'briefcase', usageCount: 32 },
      { id: 3, name: '個人', color: '#10B981', icon: 'user', usageCount: 28 },
      { id: 4, name: '待處理', color: '#F59E0B', icon: 'clock', usageCount: 22 },
      { id: 5, name: '已完成', color: '#6B7280', icon: 'check', usageCount: 18 },
      { id: 6, name: '講道', color: '#8B5CF6', icon: 'microphone', usageCount: 15 },
      { id: 7, name: '詩歌', color: '#F59E0B', icon: 'musical-note', usageCount: 12 },
      { id: 8, name: '見證', color: '#EC4899', icon: 'heart', usageCount: 10 },
      { id: 9, name: '查經', color: '#06B6D4', icon: 'book-open', usageCount: 8 },
      { id: 10, name: '團契', color: '#84CC16', icon: 'users', usageCount: 6 }
    ]
    
    popularTags.value = allTags.value
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5)
  } catch (error) {
    console.error('Failed to load tags:', error)
  } finally {
    isLoading.value = false
  }
}

const selectTag = (tag: Tag) => {
  if (isTagSelected(tag)) {
    removeTag(tag)
  } else {
    selectedTags.value.push(tag)
    emit('update:selectedTags', selectedTags.value)
    emit('tagsChanged', selectedTags.value)
  }
}

const removeTag = (tag: Tag) => {
  const index = selectedTags.value.findIndex(t => t.id === tag.id)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
    emit('update:selectedTags', selectedTags.value)
    emit('tagsChanged', selectedTags.value)
  }
}

const isTagSelected = (tag: Tag): boolean => {
  return selectedTags.value.some(t => t.id === tag.id)
}

const tagExists = (name: string): boolean => {
  return allTags.value.some(tag => 
    tag.name.toLowerCase() === name.toLowerCase()
  )
}

const addNewTag = () => {
  if (newTagName.value.trim()) {
    createNewTag()
  }
}

const createNewTag = async () => {
  const name = newTagName.value.trim()
  if (!name || tagExists(name)) return
  
  try {
    // 模擬 API 調用創建標籤
    const newTag: Tag = {
      id: Date.now(), // 臨時 ID
      name,
      color: getRandomColor(),
      usageCount: 0
    }
    
    allTags.value.push(newTag)
    selectTag(newTag)
    newTagName.value = ''
    showTagPicker.value = false
  } catch (error) {
    console.error('Failed to create tag:', error)
  }
}

const onTagInput = () => {
  if (!showTagPicker.value && newTagName.value.trim()) {
    showTagPicker.value = true
  }
}

const getRandomColor = (): string => {
  const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
  return colors[Math.floor(Math.random() * colors.length)]
}

const getIconComponent = (iconName?: string) => {
  // 返回圖標組件的名稱，這裡簡化處理
  return 'div' // 實際應該根據 iconName 返回對應的圖標組件
}

// 監聽 props 變化
watch(() => props.selectedTags, (newTags) => {
  selectedTags.value = [...newTags]
}, { deep: true })

// 生命週期
onMounted(() => {
  loadTags()
})
</script>

<style scoped>
.tag-picker {
  position: relative;
  z-index: 50;
}
</style>