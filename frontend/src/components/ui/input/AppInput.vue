<template>
  <div class="app-input-wrapper">
    <!-- Label -->
    <label v-if="label" :for="inputId" class="app-input-label">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-1">*</span>
    </label>

    <!-- Input container -->
    <div class="app-input-container" :class="containerClasses">
      <!-- Prefix icon -->
      <div v-if="prefixIcon || $slots.prefix" class="app-input-prefix">
        <slot name="prefix">
          <component v-if="prefixIcon" :is="prefixIcon" class="w-4 h-4 text-gray-400" />
        </slot>
      </div>

      <!-- Input element -->
      <input
        :id="inputId"
        ref="inputRef"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :class="inputClasses"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown.enter="handleEnter"
        v-bind="$attrs"
      />

      <!-- Suffix content -->
      <div v-if="suffixIcon || $slots.suffix || showClear || showTogglePassword" class="app-input-suffix">
        <!-- Clear button -->
        <button
          v-if="showClear && modelValue"
          type="button"
          class="app-input-clear"
          @click="handleClear"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Password toggle -->
        <button
          v-if="showTogglePassword"
          type="button"
          class="app-input-toggle"
          @click="togglePasswordVisibility"
        >
          <svg v-if="isPasswordVisible" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.5-1.5l6.364 6.364" />
          </svg>
        </button>

        <!-- Custom suffix -->
        <slot name="suffix">
          <component v-if="suffixIcon" :is="suffixIcon" class="w-4 h-4 text-gray-400" />
        </slot>
      </div>
    </div>

    <!-- Helper text or error message -->
    <div v-if="helperText || errorMessage" class="app-input-helper">
      <p v-if="errorMessage" class="app-input-error">{{ errorMessage }}</p>
      <p v-else-if="helperText" class="app-input-helper-text">{{ helperText }}</p>
    </div>

    <!-- Character count -->
    <div v-if="showCount && maxlength" class="app-input-count">
      {{ String(modelValue || '').length }}/{{ maxlength }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'

interface Props {
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number'
  label?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  error?: boolean
  errorMessage?: string
  helperText?: string
  size?: 'small' | 'medium' | 'large'
  prefixIcon?: any
  suffixIcon?: any
  clearable?: boolean
  showCount?: boolean
  maxlength?: number
  autocomplete?: string
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
  error: false,
  size: 'medium',
  clearable: false,
  showCount: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  enter: [event: KeyboardEvent]
  clear: []
}>()

const inputRef = ref<HTMLInputElement>()
const isFocused = ref(false)
const isPasswordVisible = ref(false)

// Generate unique ID
const inputId = computed(() => props.id || `app-input-${Math.random().toString(36).substr(2, 9)}`)

// Input type with password visibility toggle
const inputType = computed(() => {
  if (props.type === 'password') {
    return isPasswordVisible.value ? 'text' : 'password'
  }
  return props.type
})

// Show clear button
const showClear = computed(() => props.clearable && !props.disabled && !props.readonly)

// Show password toggle
const showTogglePassword = computed(() => props.type === 'password' && !props.disabled && !props.readonly)

// Container classes
const containerClasses = computed(() => {
  const baseClasses = [
    'relative',
    'flex',
    'items-center',
    'transition-colors',
    'duration-200',
    'bg-white dark:bg-gray-800',
    'border-2',
    'rounded-win11'
  ]

  const sizeClasses = {
    small: ['min-h-[32px]'],
    medium: ['min-h-[40px]'],
    large: ['min-h-[48px]']
  }

  const stateClasses = []
  
  if (props.error || props.errorMessage) {
    stateClasses.push('border-red-500', 'focus-within:border-red-600')
  } else if (isFocused.value) {
    stateClasses.push('border-primary-500', 'ring-1', 'ring-primary-500')
  } else {
    stateClasses.push('border-gray-300 dark:border-gray-600', 'hover:border-gray-400 dark:hover:border-gray-500')
  }

  if (props.disabled) {
    stateClasses.push('bg-gray-50 dark:bg-gray-900', 'border-gray-200 dark:border-gray-700', 'cursor-not-allowed')
  }

  return [
    ...baseClasses,
    ...sizeClasses[props.size],
    ...stateClasses
  ]
})

// Input classes
const inputClasses = computed(() => {
  const baseClasses = [
    'flex-1',
    'bg-transparent',
    'text-gray-900 dark:text-gray-100',
    'placeholder-gray-500 dark:placeholder-gray-400',
    'focus:outline-none',
    'disabled:cursor-not-allowed',
    'disabled:text-gray-400 dark:disabled:text-gray-500'
  ]

  const sizeClasses = {
    small: ['px-3', 'py-1.5', 'text-sm'],
    medium: ['px-3', 'py-2', 'text-sm'],
    large: ['px-4', 'py-3', 'text-base']
  }

  return [
    ...baseClasses,
    ...sizeClasses[props.size]
  ]
})

// Event handlers
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value: string | number = target.value

  if (props.type === 'number') {
    value = target.valueAsNumber || 0
  }

  emit('update:modelValue', value)
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
}

const handleEnter = (event: KeyboardEvent) => {
  emit('enter', event)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const togglePasswordVisibility = () => {
  isPasswordVisible.value = !isPasswordVisible.value
}

// Public methods
const focus = () => {
  inputRef.value?.focus()
}

const blur = () => {
  inputRef.value?.blur()
}

defineExpose({
  focus,
  blur,
  inputRef
})
</script>

<style scoped>
.app-input-wrapper {
  @apply w-full;
}

.app-input-label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1;
}

.app-input-container {
  @apply relative;
}

.app-input-prefix,
.app-input-suffix {
  @apply flex items-center px-3 text-gray-400 dark:text-gray-500;
}

.app-input-clear,
.app-input-toggle {
  @apply p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 focus:outline-none focus:text-gray-600 dark:focus:text-gray-400 transition-colors duration-200;
}

.app-input-helper {
  @apply mt-1;
}

.app-input-error {
  @apply text-sm text-red-600 dark:text-red-400;
}

.app-input-helper-text {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

.app-input-count {
  @apply mt-1 text-xs text-gray-400 dark:text-gray-500 text-right;
}
</style>