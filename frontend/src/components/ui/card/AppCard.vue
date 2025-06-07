<template>
  <div
    :class="cardClasses"
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

  // Variant classes
  const variantClasses = {
    default: [
      'bg-white',
      'border',
      'border-gray-200'
    ],
    outlined: [
      'bg-white',
      'border-2',
      'border-gray-300'
    ],
    elevated: [
      'bg-white',
      'shadow-win11',
      'border',
      'border-gray-100'
    ],
    filled: [
      'bg-gray-50',
      'border',
      'border-gray-200'
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
      'hover:border-gray-300',
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
  @apply text-lg font-semibold text-gray-900 leading-tight;
}

.card-content {
  @apply text-gray-700 leading-relaxed;
}

.card-footer {
  @apply mt-4 pt-3 border-t border-gray-200;
}

.card-loading {
  @apply absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center;
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
  @apply h-4 bg-gray-200 rounded;
}

.card-skeleton .skeleton-line:nth-child(1) {
  @apply w-3/4;
}

.card-skeleton .skeleton-line:nth-child(2) {
  @apply w-1/2;
}
</style>