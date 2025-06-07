<template>
  <button
    type="button"
    :class="itemClasses"
    :disabled="item.disabled"
    role="menuitem"
    :aria-disabled="item.disabled"
    @click="handleClick"
    @mouseover="handleMouseover"
    @focus="handleMouseover"
  >
    <!-- Icon -->
    <div v-if="item.icon" class="context-menu-item-icon">
      <component :is="item.icon" class="w-4 h-4" />
    </div>
    
    <!-- Label -->
    <span class="context-menu-item-label">{{ item.label }}</span>
    
    <!-- Shortcut -->
    <span v-if="item.shortcut" class="context-menu-item-shortcut">
      {{ item.shortcut }}
    </span>
    
    <!-- Submenu indicator -->
    <div v-if="hasSubmenu" class="context-menu-item-arrow">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ContextMenuItem } from './AppContextMenu.vue'

interface Props {
  item: ContextMenuItem
  index: number
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false
})

const emit = defineEmits<{
  click: [item: ContextMenuItem, index: number]
  mouseover: [index: number]
}>()

// Check if item has submenu
const hasSubmenu = computed(() => 
  props.item.children && props.item.children.length > 0
)

// Item classes
const itemClasses = computed(() => {
  const baseClasses = [
    'w-full',
    'flex',
    'items-center',
    'px-3',
    'py-2',
    'text-left',
    'text-sm',
    'text-gray-700',
    'transition-colors',
    'duration-150',
    'focus:outline-none'
  ]
  
  const stateClasses = []
  
  if (props.item.disabled) {
    stateClasses.push(
      'text-gray-400',
      'cursor-not-allowed'
    )
  } else {
    stateClasses.push(
      'hover:bg-gray-100',
      'hover:text-gray-900',
      'focus:bg-gray-100',
      'focus:text-gray-900'
    )
  }
  
  if (props.active) {
    stateClasses.push(
      'bg-primary-50',
      'text-primary-900'
    )
  }
  
  return [...baseClasses, ...stateClasses]
})

// Event handlers
const handleClick = () => {
  if (!props.item.disabled) {
    emit('click', props.item, props.index)
  }
}

const handleMouseover = () => {
  if (!props.item.disabled) {
    emit('mouseover', props.index)
  }
}
</script>

<style scoped>
.context-menu-item-icon {
  @apply flex-shrink-0 mr-3;
}

.context-menu-item-label {
  @apply flex-1 truncate;
}

.context-menu-item-shortcut {
  @apply flex-shrink-0 ml-3 text-xs text-gray-500;
}

.context-menu-item-arrow {
  @apply flex-shrink-0 ml-2 text-gray-400;
}
</style>