<template>
  <nav :class="breadcrumbClasses" aria-label="路徑導航">
    <ol class="breadcrumb-list rounded-lg px-3 py-2" style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.2);">
      <!-- Home/Root item -->
      <li class="breadcrumb-item">
        <button
          type="button"
          class="breadcrumb-link"
          :class="{ 'breadcrumb-link-active': items.length === 0 }"
          @click="handleItemClick(null, 0)"
          :aria-current="items.length === 0 ? 'page' : undefined"
        >
          <component :is="homeIcon" class="w-4 h-4" />
          <span v-if="showLabels || items.length === 0" class="breadcrumb-text">
            {{ homeLabel }}
          </span>
        </button>
      </li>

      <!-- Collapse indicator for long paths -->
      <li v-if="shouldCollapse && collapsedItems.length > 0" class="breadcrumb-item">
        <span class="breadcrumb-separator" aria-hidden="true">{{ separator }}</span>
        <button
          type="button"
          class="breadcrumb-collapse"
          @click="toggleCollapsed"
          :aria-expanded="!isCollapsed"
          aria-label="展開完整路徑"
        >
          ...
        </button>
      </li>

      <!-- Visible breadcrumb items -->
      <template v-for="(item, index) in visibleItems" :key="item.key || index">
        <li class="breadcrumb-item">
          <span class="breadcrumb-separator" aria-hidden="true">{{ separator }}</span>
          
          <!-- Clickable item -->
          <button
            v-if="item.href || item.to || item.clickable !== false"
            type="button"
            class="breadcrumb-link"
            :class="{ 'breadcrumb-link-active': index === visibleItems.length - 1 }"
            @click="handleItemClick(item, getOriginalIndex(index))"
            :aria-current="index === visibleItems.length - 1 ? 'page' : undefined"
          >
            <component
              v-if="item.icon"
              :is="item.icon"
              class="w-4 h-4"
            />
            <span class="breadcrumb-text">{{ item.label }}</span>
          </button>
          
          <!-- Non-clickable item -->
          <span
            v-else
            class="breadcrumb-text breadcrumb-text-disabled"
            :aria-current="index === visibleItems.length - 1 ? 'page' : undefined"
          >
            <component
              v-if="item.icon"
              :is="item.icon"
              class="w-4 h-4"
            />
            {{ item.label }}
          </span>
        </li>
      </template>

      <!-- Dropdown for collapsed items -->
      <div
        v-if="shouldCollapse && isCollapsed && collapsedItems.length > 0"
        class="breadcrumb-dropdown"
        v-click-outside="() => dropdownOpen = false"
      >
        <button
          type="button"
          class="breadcrumb-dropdown-trigger"
          @click="dropdownOpen = !dropdownOpen"
          :aria-expanded="dropdownOpen"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <ul v-if="dropdownOpen" class="breadcrumb-dropdown-menu">
          <li v-for="(item, index) in collapsedItems" :key="item.key || index">
            <button
              type="button"
              class="breadcrumb-dropdown-item"
              @click="handleItemClick(item, index + 1)"
            >
              <component
                v-if="item.icon"
                :is="item.icon"
                class="w-4 h-4"
              />
              <span>{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </div>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface BreadcrumbItem {
  label: string
  href?: string
  to?: string | object
  icon?: any
  clickable?: boolean
  key?: string | number
  meta?: Record<string, any>
}

interface Props {
  items?: BreadcrumbItem[]
  separator?: string
  maxItems?: number
  showLabels?: boolean
  homeLabel?: string
  homeIcon?: any
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'pills' | 'underline'
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  separator: '/',
  maxItems: 4,
  showLabels: true,
  homeLabel: '首頁',
  size: 'medium',
  variant: 'default'
})

const emit = defineEmits<{
  itemClick: [item: BreadcrumbItem | null, index: number]
}>()

const isCollapsed = ref(true)
const dropdownOpen = ref(false)

// Default home icon
const homeIcon = computed(() => props.homeIcon || {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  `
})

// Check if we should collapse the breadcrumb
const shouldCollapse = computed(() => props.items.length > props.maxItems)

// Items that are collapsed (hidden)
const collapsedItems = computed(() => {
  if (!shouldCollapse.value || !isCollapsed.value) return []
  return props.items.slice(1, props.items.length - (props.maxItems - 2))
})

// Items that are visible
const visibleItems = computed(() => {
  if (!shouldCollapse.value || !isCollapsed.value) return props.items
  
  const start = props.items.slice(0, 1) // First item after home
  const end = props.items.slice(-(props.maxItems - 2)) // Last items
  return [...start, ...end]
})

// Get original index for collapsed navigation
const getOriginalIndex = (visibleIndex: number) => {
  if (!shouldCollapse.value || !isCollapsed.value) return visibleIndex + 1
  
  if (visibleIndex === 0) return 1 // First visible item
  // Calculate offset for end items
  return props.items.length - (props.maxItems - 2) + visibleIndex
}

// Breadcrumb container classes
const breadcrumbClasses = computed(() => {
  const baseClasses = ['breadcrumb']
  
  const sizeClasses = {
    small: 'breadcrumb-sm',
    medium: 'breadcrumb-md',
    large: 'breadcrumb-lg'
  }
  
  const variantClasses = {
    default: 'breadcrumb-default',
    pills: 'breadcrumb-pills',
    underline: 'breadcrumb-underline'
  }
  
  return [
    ...baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant]
  ]
})

// Event handlers
const handleItemClick = (item: BreadcrumbItem | null, index: number) => {
  emit('itemClick', item, index)
  dropdownOpen.value = false
}

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
  dropdownOpen.value = false
}

// Click outside directive
const vClickOutside = {
  mounted(el: HTMLElement & { _clickOutsideHandler?: (event: Event) => void }, binding: any) {
    el._clickOutsideHandler = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutsideHandler)
  },
  unmounted(el: HTMLElement & { _clickOutsideHandler?: (event: Event) => void }) {
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler)
    }
  }
}
</script>

<style scoped>
.breadcrumb {
  @apply flex items-center;
}

.breadcrumb-list {
  @apply flex items-center flex-wrap gap-1;
}

.breadcrumb-item {
  @apply flex items-center;
}

.breadcrumb-separator {
  @apply mx-2 select-none;
  color: var(--text-tertiary);
  opacity: 0.5;
}

.breadcrumb-link {
  @apply flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-gray-900 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.breadcrumb-link-active {
  @apply text-gray-900 font-medium;
  background: rgba(59, 130, 246, 0.2);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.breadcrumb-text {
  @apply truncate max-w-[200px];
}

.breadcrumb-text-disabled {
  @apply text-gray-500 cursor-default;
}

.breadcrumb-collapse {
  @apply px-2 py-1 text-gray-500 hover:text-gray-700 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(4px);
}

/* Dropdown */
.breadcrumb-dropdown {
  @apply relative inline-block;
}

.breadcrumb-dropdown-trigger {
  @apply p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1;
}

.breadcrumb-dropdown-menu {
  @apply absolute top-full left-0 mt-1 py-1 rounded-lg z-10 min-w-[200px] max-h-[300px] overflow-y-auto;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.breadcrumb-dropdown-item {
  @apply w-full px-3 py-2 text-left text-gray-700 focus:outline-none flex items-center space-x-2 transition-all duration-150;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
}

/* Size variants */
.breadcrumb-sm .breadcrumb-link,
.breadcrumb-sm .breadcrumb-collapse {
  @apply px-1.5 py-0.5 text-sm;
}

.breadcrumb-sm .breadcrumb-text {
  @apply max-w-[150px];
}

.breadcrumb-lg .breadcrumb-link,
.breadcrumb-lg .breadcrumb-collapse {
  @apply px-3 py-2 text-base;
}

.breadcrumb-lg .breadcrumb-text {
  @apply max-w-[250px];
}

/* Variant styles */
.breadcrumb-pills .breadcrumb-link {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.breadcrumb-pills .breadcrumb-link-active {
  background: rgba(59, 130, 246, 0.2);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: var(--color-primary);
}

.breadcrumb-underline .breadcrumb-link {
  @apply border-b-2 border-transparent hover:border-gray-300 rounded-none px-1 py-2;
}

.breadcrumb-underline .breadcrumb-link-active {
  @apply border-primary-500;
}

/* Responsive */
@media (max-width: 640px) {
  .breadcrumb-text {
    @apply max-w-[100px];
  }
  
  .breadcrumb-separator {
    @apply mx-1;
  }
}
</style>