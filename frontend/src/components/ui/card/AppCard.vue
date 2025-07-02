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

    <!-- 玻璃化載入遮罩 -->
    <div v-if="loading" class="card-loading glass-heavy backdrop-blur-glass-lg">
      <div class="animate-spin">
        <svg class="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>

    <!-- 玻璃化選擇指示器 -->
    <div v-if="selected" class="card-selection-indicator glass-heavy border border-blue-400/60" />
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
  variant?: 'default' | 'outlined' | 'elevated' | 'filled' | 'glass' | 'glass-heavy'
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
    'duration-300',
    'ease-glass',
    'overflow-hidden'
  ]

  // Variant classes - 新增玻璃效果變體
  const variantClasses = {
    default: [
      'bg-white/80',
      'dark:bg-gray-900/80',
      'border',
      'border-gray-200/30',
      'dark:border-gray-700/30'
    ],
    outlined: [
      'bg-white/60',
      'dark:bg-gray-900/60',
      'border-2',
      'border-gray-300/50',
      'dark:border-gray-600/50'
    ],
    elevated: [
      'glass-card',
      'shadow-glass-md'
    ],
    filled: [
      'bg-white/90',
      'dark:bg-gray-900/90',
      'border',
      'border-gray-200/20',
      'dark:border-gray-700/20'
    ],
    glass: [
      'glass-light',
      'border',
      'border-glass-border'
    ],
    'glass-heavy': [
      'glass-heavy',
      'border',
      'border-glass-border-strong'
    ]
  }

  // Padding classes
  const paddingClasses = {
    none: [],
    small: ['p-3'],
    medium: ['p-4'],
    large: ['p-6']
  }

  // Rounded classes - 使用更圓潤的玻璃風格
  const roundedClasses = {
    none: [],
    small: ['rounded-lg'],
    medium: ['rounded-xl'],
    large: ['rounded-2xl']
  }

  // Interactive classes - 玻璃效果互動
  const interactiveClasses = []
  if (props.clickable) {
    interactiveClasses.push('cursor-pointer')
  }

  if (props.hoverable) {
    if (props.variant === 'glass' || props.variant === 'glass-heavy') {
      interactiveClasses.push(
        'hover:glass-medium',
        'hover:shadow-glass-lg',
        'hover:-translate-y-1',
        'hover:scale-[1.02]'
      )
    } else {
      interactiveClasses.push(
        'hover:shadow-glass-md',
        'hover:-translate-y-0.5',
        'hover:backdrop-blur-glass-md'
      )
    }
  }

  // Selection classes - 玻璃選擇效果
  const selectionClasses = props.selected ? [
    'glass-heavy',
    'ring-2',
    'ring-blue-500/50',
    'border-blue-400/60',
    'shadow-glass-lg'
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

// 玻璃卡片現在完全使用 CSS 類別，不需要內聯樣式

const handleClick = (event: MouseEvent) => {
  if (props.clickable && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
/* 玻璃化卡片樣式 */
.card-header {
  @apply mb-3;
}

.card-title {
  @apply text-lg font-semibold leading-tight;
  color: theme('colors.gray.900');
}

@media (prefers-color-scheme: dark) {
  .card-title {
    color: theme('colors.gray.100');
  }
}

.card-content {
  @apply leading-relaxed;
  color: theme('colors.gray.700');
}

@media (prefers-color-scheme: dark) {
  .card-content {
    color: theme('colors.gray.300');
  }
}

.card-footer {
  @apply mt-4 pt-3 border-t;
  border-color: rgba(156, 163, 175, 0.3);
}

@media (prefers-color-scheme: dark) {
  .card-footer {
    border-color: rgba(107, 114, 128, 0.3);
  }
}

/* 玻璃化載入遮罩 */
.card-loading {
  @apply absolute inset-0 flex items-center justify-center;
  /* 使用玻璃效果類別而非內聯樣式 */
}

/* 玻璃化選擇指示器 */
.card-selection-indicator {
  @apply absolute top-2 right-2 w-4 h-4 rounded-full;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.9));
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3);
}

/* 玻璃化骨架載入狀態 */
.card-skeleton {
  @apply animate-pulse;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.1);
}

.card-skeleton .card-content {
  @apply space-y-3;
}

.card-skeleton .skeleton-line {
  @apply h-4 rounded;
  background: linear-gradient(90deg, 
    rgba(156, 163, 175, 0.2) 25%, 
    rgba(156, 163, 175, 0.4) 50%, 
    rgba(156, 163, 175, 0.2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.card-skeleton .skeleton-line:nth-child(1) {
  @apply w-3/4;
}

.card-skeleton .skeleton-line:nth-child(2) {
  @apply w-1/2;
}

/* 深色模式骨架樣式 */
@media (prefers-color-scheme: dark) {
  .card-skeleton .skeleton-line {
    background: linear-gradient(90deg, 
      rgba(107, 114, 128, 0.2) 25%, 
      rgba(107, 114, 128, 0.4) 50%, 
      rgba(107, 114, 128, 0.2) 75%
    );
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .card-title {
    @apply text-base;
  }
  
  .card-content {
    @apply text-sm;
  }
}

/* 減少動畫偏好設定 */
@media (prefers-reduced-motion: reduce) {
  .card-skeleton {
    animation: none;
  }
  
  .card-skeleton .skeleton-line {
    animation: none;
    background: rgba(156, 163, 175, 0.3);
  }
  
  @media (prefers-color-scheme: dark) {
    .card-skeleton .skeleton-line {
      background: rgba(107, 114, 128, 0.3);
    }
  }
}
</style>