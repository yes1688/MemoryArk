<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="handleClick"
    v-bind="$attrs"
  >
    <!-- Loading spinner -->
    <span v-if="loading" class="animate-spin mr-2">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>

    <!-- Icon (left) -->
    <span v-if="iconLeft && !loading" class="mr-2">
      <slot name="icon-left">
        <component :is="iconLeft" class="w-4 h-4" />
      </slot>
    </span>

    <!-- Button text/content -->
    <span v-if="$slots.default || label" :class="{ 'opacity-0': loading && !$slots.default && !label }">
      <slot>{{ label }}</slot>
    </span>

    <!-- Icon (right) -->
    <span v-if="iconRight && !loading" class="ml-2">
      <slot name="icon-right">
        <component :is="iconRight" class="w-4 h-4" />
      </slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  label?: string
  iconLeft?: any
  iconRight?: any
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  loading: false,
  type: 'button',
  fullWidth: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'rounded-win11',
    'transition-all',
    'duration-200',
    'ease-in-out',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'active:scale-[0.98]',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:transform-none'
  ]

  // Size classes
  const sizeClasses = {
    small: ['px-3', 'py-1.5', 'text-sm', 'min-h-[32px]'],
    medium: ['px-4', 'py-2', 'text-sm', 'min-h-[40px]'],
    large: ['px-6', 'py-3', 'text-base', 'min-h-[48px]']
  }

  // Variant classes
  const variantClasses = {
    primary: [
      'bg-gradient-to-b',
      'from-primary-500',
      'to-primary-600',
      'text-white',
      'shadow-win11',
      'hover:from-primary-400',
      'hover:to-primary-500',
      'hover:shadow-win11-hover',
      'active:shadow-win11-active',
      'focus:ring-primary-500'
    ],
    secondary: [
      'bg-white',
      'text-gray-700',
      'border',
      'border-gray-300',
      'shadow-win11',
      'hover:bg-gray-50',
      'hover:border-gray-400',
      'hover:shadow-win11-hover',
      'active:bg-gray-100',
      'active:shadow-win11-active',
      'focus:ring-gray-500'
    ],
    danger: [
      'bg-gradient-to-b',
      'from-red-500',
      'to-red-600',
      'text-white',
      'shadow-win11',
      'hover:from-red-400',
      'hover:to-red-500',
      'hover:shadow-win11-hover',
      'active:shadow-win11-active',
      'focus:ring-red-500'
    ],
    ghost: [
      'bg-transparent',
      'text-gray-700',
      'hover:bg-gray-100',
      'hover:text-gray-900',
      'active:bg-gray-200',
      'focus:ring-gray-500'
    ],
    outline: [
      'bg-transparent',
      'text-primary-600',
      'border',
      'border-primary-300',
      'hover:bg-primary-50',
      'hover:border-primary-400',
      'active:bg-primary-100',
      'focus:ring-primary-500'
    ]
  }

  // Full width class
  const widthClasses = props.fullWidth ? ['w-full'] : []

  return [
    ...baseClasses,
    ...sizeClasses[props.size],
    ...variantClasses[props.variant],
    ...widthClasses
  ]
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
/* Additional custom styles if needed */
button:active {
  transform: scale(0.98);
}

button:disabled:active {
  transform: none;
}
</style>