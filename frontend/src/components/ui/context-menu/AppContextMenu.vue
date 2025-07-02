<template>
  <Teleport to="body">
    <Transition
      name="context-menu"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="visible"
        ref="menuRef"
        :class="menuClasses"
        :style="menuStyle"
        role="menu"
        @keydown="handleKeydown"
        @click="handleMenuClick"
        tabindex="-1"
      >
        <template v-for="(item, index) in items" :key="item.key || index">
          <!-- Separator -->
          <div
            v-if="item.type === 'separator'"
            class="context-menu-separator"
            role="separator"
          />
          
          <!-- Menu group -->
          <div
            v-else-if="item.type === 'group'"
            class="context-menu-group"
            role="group"
            :aria-labelledby="`group-${index}`"
          >
            <div v-if="item.label" :id="`group-${index}`" class="context-menu-group-label">
              {{ item.label }}
            </div>
            <template v-for="(subItem, subIndex) in item.children" :key="subItem.key || subIndex">
              <AppContextMenuItem
                :item="subItem"
                :index="getItemIndex(index, subIndex)"
                @click="handleItemClick"
                @mouseover="handleItemHover"
              />
            </template>
          </div>
          
          <!-- Regular menu item -->
          <AppContextMenuItem
            v-else
            :item="item"
            :index="index"
            @click="handleItemClick"
            @mouseover="handleItemHover"
          />
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'

export interface ContextMenuItem {
  key?: string | number
  type?: 'item' | 'separator' | 'group'
  label?: string
  icon?: any
  shortcut?: string
  disabled?: boolean
  visible?: boolean
  children?: ContextMenuItem[]
  action?: () => void
  meta?: Record<string, any>
}

interface Props {
  visible?: boolean
  items?: ContextMenuItem[]
  x?: number
  y?: number
  minWidth?: number
  maxWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  items: () => [],
  x: 0,
  y: 0,
  minWidth: 180,
  maxWidth: 300
})

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  itemClick: [item: ContextMenuItem, index: number]
  close: []
}>()

const menuRef = ref<HTMLElement>()
const activeIndex = ref(-1)

// Calculate menu position and size
const menuStyle = computed(() => {
  const style: Record<string, string> = {
    minWidth: `${props.minWidth}px`,
    maxWidth: `${props.maxWidth}px`
  }
  
  // Position the menu, ensuring it stays within viewport
  if (typeof window !== 'undefined') {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const menuWidth = props.minWidth
    const menuHeight = 300 // Estimated menu height
    
    let x = props.x
    let y = props.y
    
    // Adjust horizontal position
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10
    }
    
    // Adjust vertical position
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10
    }
    
    style.left = `${Math.max(10, x)}px`
    style.top = `${Math.max(10, y)}px`
  }
  
  return style
})

// Menu classes
const menuClasses = computed(() => [
  'context-menu',
  'glass-heavy',
  'fixed',
  'z-50',
  'rounded-lg',
  'shadow-glass-lg',
  'py-1',
  'focus:outline-none',
  'overflow-hidden'
])

// Get flattened items for keyboard navigation
const flattenedItems = computed(() => {
  const flattened: { item: ContextMenuItem; index: number }[] = []
  
  const flatten = (items: ContextMenuItem[], parentIndex = 0) => {
    items.forEach((item, index) => {
      if (item.visible !== false) {
        if (item.type === 'item' || !item.type) {
          flattened.push({ item, index: parentIndex + index })
        } else if (item.type === 'group' && item.children) {
          flatten(item.children, parentIndex + index)
        }
      }
    })
  }
  
  flatten(props.items)
  return flattened
})

// Get item index for grouped items
const getItemIndex = (groupIndex: number, itemIndex: number) => {
  return groupIndex * 1000 + itemIndex
}

// Event handlers
const handleItemClick = (item: ContextMenuItem, index: number) => {
  if (item.disabled) return
  
  emit('itemClick', item, index)
  
  if (item.action) {
    item.action()
  }
  
  close()
}

const handleItemHover = (index: number) => {
  activeIndex.value = index
}

const handleMenuClick = (event: Event) => {
  event.stopPropagation()
}

const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      navigateNext()
      break
    case 'ArrowUp':
      event.preventDefault()
      navigatePrevious()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      selectActive()
      break
    case 'Escape':
      event.preventDefault()
      close()
      break
  }
}

// Navigation methods
const navigateNext = () => {
  const availableItems = flattenedItems.value.filter(({ item }) => !item.disabled)
  if (availableItems.length === 0) return
  
  const currentIndex = availableItems.findIndex(({ index }) => index === activeIndex.value)
  const nextIndex = (currentIndex + 1) % availableItems.length
  activeIndex.value = availableItems[nextIndex].index
}

const navigatePrevious = () => {
  const availableItems = flattenedItems.value.filter(({ item }) => !item.disabled)
  if (availableItems.length === 0) return
  
  const currentIndex = availableItems.findIndex(({ index }) => index === activeIndex.value)
  const prevIndex = currentIndex <= 0 ? availableItems.length - 1 : currentIndex - 1
  activeIndex.value = availableItems[prevIndex].index
}

const selectActive = () => {
  const activeItem = flattenedItems.value.find(({ index }) => index === activeIndex.value)
  if (activeItem) {
    handleItemClick(activeItem.item, activeItem.index)
  }
}

const close = () => {
  emit('update:visible', false)
  emit('close')
}

// Transition handlers
const onBeforeEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.opacity = '0'
  element.style.transform = 'scale(0.95)'
}

const onEnter = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  element.offsetHeight // Force reflow
  element.style.transition = 'all 0.15s ease-out'
  element.style.opacity = '1'
  element.style.transform = 'scale(1)'
  setTimeout(done, 150)
}

const onLeave = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  element.style.transition = 'all 0.1s ease-in'
  element.style.opacity = '0'
  element.style.transform = 'scale(0.95)'
  setTimeout(done, 100)
}

// Focus management
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await nextTick()
    menuRef.value?.focus()
    activeIndex.value = -1
  }
})

// Click outside handler
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    const handleClickOutside = (event: Event) => {
      if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
        close()
      }
    }
    
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }
})
</script>

<script lang="ts">
// Menu item component
export default {
  name: 'AppContextMenu'
}
</script>

<style scoped>
.context-menu {
  max-height: 400px;
  overflow-y: auto;
}

.context-menu-separator {
  @apply h-px my-1 mx-2;
  background: var(--glass-border-primary);
  opacity: 0.3;
}

.context-menu-group {
  @apply mb-1;
}

.context-menu-group-label {
  @apply px-3 py-1 text-xs font-semibold uppercase tracking-wider;
  color: var(--text-tertiary);
  opacity: 0.8;
}

/* Transition styles */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: all 0.15s var(--ease-glass);
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
  backdrop-filter: blur(0px);
}

/* Scrollbar styling */
.context-menu::-webkit-scrollbar {
  width: 6px;
}

.context-menu::-webkit-scrollbar-track {
  background: transparent;
}

.context-menu::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.context-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>