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
    'context-menu-item',
    'w-full',
    'flex',
    'items-center',
    'px-3',
    'py-2',
    'text-left',
    'text-sm',
    'transition-all',
    'duration-150',
    'focus:outline-none',
    'relative',
    'overflow-hidden'
  ]
  
  const stateClasses = []
  
  if (props.item.disabled) {
    stateClasses.push(
      'text-gray-400',
      'cursor-not-allowed',
      'opacity-50'
    )
  } else {
    stateClasses.push(
      'hover:glass-light',
      'focus:glass-light',
      'text-gray-700',
      'hover:text-gray-900'
    )
  }
  
  if (props.active) {
    stateClasses.push(
      'glass-light',
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
  position: relative;
  z-index: 1;
}

.context-menu-item-label {
  @apply flex-1 truncate;
  position: relative;
  z-index: 1;
}

.context-menu-item-shortcut {
  @apply flex-shrink-0 ml-3 text-xs;
  color: var(--text-tertiary);
  opacity: 0.7;
  position: relative;
  z-index: 1;
}

.context-menu-item-arrow {
  @apply flex-shrink-0 ml-2;
  color: var(--text-tertiary);
  position: relative;
  z-index: 1;
}

/* 玻璃反光效果 */
.context-menu-item:not([disabled]):hover::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  pointer-events: none;
  opacity: 0;
  animation: shimmer 0.8s ease;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>