<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  selectedCategory: string
}

interface Emits {
  (e: 'category-change', category: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const categories = [
  { id: '', name: '全部', icon: '📁', count: 0 },
  { id: 'image', name: '圖片', icon: '🖼️', count: 0 },
  { id: 'video', name: '影片', icon: '🎥', count: 0 },
  { id: 'audio', name: '音檔', icon: '🎵', count: 0 },
  { id: 'document', name: '文件', icon: '📄', count: 0 },
  { id: 'other', name: '其他', icon: '📎', count: 0 }
]

const handleCategoryChange = (categoryId: string) => {
  emit('category-change', categoryId)
}
</script>

<template>
  <div class="bg-white border-b px-6 py-4">
    <div class="flex items-center space-x-6">
      <span class="text-sm font-medium text-gray-700">分類：</span>
      <div class="flex space-x-4">
        <button
          v-for="category in categories"
          :key="category.id"
          @click="handleCategoryChange(category.id)"
          :class="[
            'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            selectedCategory === category.id
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'text-gray-600 hover:bg-gray-100'
          ]"
        >
          <span>{{ category.icon }}</span>
          <span>{{ category.name }}</span>
          <span v-if="category.count > 0" class="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
            {{ category.count }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
