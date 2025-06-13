<template>
  <div
    :class="cardClasses"
    :style="getCardStyles()"
    @click="handleClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Card Header -->
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <h3 v-if="title" class="card-title">{{ title }}</h3>
      </slot>
    </div>

    <!-- Card Content -->
    <div v-if="$slots.default || content" class="card-content">
      <slot>
        <p v-if="content">{{ content }}</p>
      </slot>
    </div>

    <!-- Card Footer -->
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>

    <!-- Loading overlay -->
    <div v-if="loading" class="card-loading">
      <div class="animate-spin">
        <svg class="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>

    <!-- Selection indicator -->
    <div v-if="selected" class="card-selection-indicator" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  title?: string
  content?: string
  hoverable?: boolean
  clickable?: boolean
  selected?: boolean
  loading?: boolean
  variant?: 'default' | 'outlined' | 'elevated' | 'filled'
  padding?: 'none' | 'small' | 'medium' | 'large'
  rounded?: 'none' | 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  hoverable: false,
  clickable: false,
  selected: false,
  loading: false,
  variant: 'default',
  padding: 'medium',
  rounded: 'medium'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const isHovered = ref(false)

const cardClasses = computed(() => {
  const baseClasses = [
    'relative',
    'transition-all',
    'duration-200',
    'ease-in-out',
    'overflow-hidden'
  ]

  // Variant classes - 使用內聯樣式替代 Tailwind 類
  const variantClasses = {
    default: [
      'border'
    ],
    outlined: [
      'border-2'
    ],
    elevated: [
      'shadow-win11',
      'border'
    ],
    filled: [
      'border'
    ]
  }

  // Padding classes
  const paddingClasses = {
    none: [],
    small: ['p-3'],
    medium: ['p-4'],
    large: ['p-6']
  }

  // Rounded classes
  const roundedClasses = {
    none: [],
    small: ['rounded-win11'],
    medium: ['rounded-win11-lg'],
    large: ['rounded-win11-xl']
  }

  // Interactive classes
  const interactiveClasses = []
  if (props.clickable) {
    interactiveClasses.push('cursor-pointer')
  }

  if (props.hoverable) {
    interactiveClasses.push(
      'hover:shadow-win11-hover',
      'hover:-translate-y-0.5'
    )
  }

  // Selection classes
  const selectionClasses = props.selected ? [
    'ring-2',
    'ring-primary-500',
    'border-primary-300'
  ] : []

  // Loading classes
  const loadingClasses = props.loading ? ['opacity-75'] : []

  return [
    ...baseClasses,
    ...variantClasses[props.variant],
    ...paddingClasses[props.padding],
    ...roundedClasses[props.rounded],
    ...interactiveClasses,
    ...selectionClasses,
    ...loadingClasses
  ]
})

const getCardStyles = () => {
  const styles: Record<string, string> = {}
  
  // 根據變體設置樣式
  switch (props.variant) {
    case 'default':
      styles.backgroundColor = 'var(--bg-elevated)'
      styles.borderColor = 'var(--border-light)'
      break
    case 'outlined':
      styles.backgroundColor = 'var(--bg-elevated)'
      styles.borderColor = 'var(--border-medium)'
      break
    case 'elevated':
      styles.backgroundColor = 'var(--bg-elevated)'
      styles.borderColor = 'var(--border-light)'
      break
    case 'filled':
      styles.backgroundColor = 'var(--bg-secondary)'
      styles.borderColor = 'var(--border-light)'
      break
  }
  
  return styles
}

const handleClick = (event: MouseEvent) => {
  if (props.clickable && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.card-header {
  @apply mb-3;
}

.card-title {
  @apply text-lg font-semibold leading-tight;
  color: var(--text-primary);
}

.card-content {
  @apply leading-relaxed;
  color: var(--text-secondary);
}

.card-footer {
  @apply mt-4 pt-3 border-t;
  border-color: var(--border-light);
}

.card-loading {
  @apply absolute inset-0 bg-opacity-75 flex items-center justify-center;
  background-color: var(--bg-elevated);
}

.card-selection-indicator {
  @apply absolute top-2 right-2 w-4 h-4 bg-primary-500 rounded-full;
}

/* Skeleton loading state */
.card-skeleton {
  @apply animate-pulse;
}

.card-skeleton .card-content {
  @apply space-y-3;
}

.card-skeleton .skeleton-line {
  @apply h-4 rounded;
  background-color: var(--bg-tertiary);
}

.card-skeleton .skeleton-line:nth-child(1) {
  @apply w-3/4;
}

.card-skeleton .skeleton-line:nth-child(2) {
  @apply w-1/2;
}
</style>