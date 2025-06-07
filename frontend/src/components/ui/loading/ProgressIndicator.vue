<template>
  <div class="progress-indicator" :class="[`progress-${type}`, { 'is-dark': isDark }]">
    <!-- 頂部進度條 -->
    <div 
      v-if="type === 'bar'" 
      class="progress-bar"
      :class="{ 
        indeterminate: !percentage,
        [`progress-${variant}`]: variant
      }"
      :style="{ height: `${thickness}px` }"
    >
      <div 
        class="progress-fill"
        :class="`fill-${variant}`"
        :style="{ 
          width: percentage ? `${Math.min(100, Math.max(0, percentage))}%` : '100%',
          transition: smooth ? 'width 0.3s ease' : 'none'
        }"
      />
      <div v-if="showText && percentage !== undefined" class="progress-text">
        {{ Math.round(percentage) }}%
      </div>
    </div>
    
    <!-- 圓形進度 -->
    <div v-else-if="type === 'circle'" class="progress-circle" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="progress-svg">
        <!-- 背景圓圈 -->
        <circle
          class="progress-track"
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :stroke-width="strokeWidth"
        />
        <!-- 進度圓圈 -->
        <circle
          class="progress-fill-circle"
          :class="`stroke-${variant}`"
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :stroke-width="strokeWidth"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          :style="{ 
            transition: smooth ? 'stroke-dashoffset 0.3s ease' : 'none'
          }"
        />
      </svg>
      
      <!-- 中心文字 -->
      <div v-if="showText" class="progress-center-text">
        <div class="progress-percentage">{{ Math.round(percentage || 0) }}%</div>
        <div v-if="label" class="progress-label">{{ label }}</div>
      </div>
    </div>
    
    <!-- 點狀載入 -->
    <div v-else-if="type === 'dots'" class="progress-dots" :class="`dots-${variant}`">
      <span 
        v-for="i in dotCount" 
        :key="i" 
        class="dot" 
        :style="{ 
          animationDelay: `${(i - 1) * 0.15}s`,
          width: `${dotSize}px`,
          height: `${dotSize}px`
        }"
      />
    </div>
    
    <!-- 旋轉載入 -->
    <div v-else-if="type === 'spinner'" class="progress-spinner" :class="`spinner-${variant}`">
      <svg 
        :width="size" 
        :height="size" 
        viewBox="0 0 50 50" 
        class="spinner-svg"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
          class="spinner-path"
        />
      </svg>
      <div v-if="showText && label" class="spinner-text">{{ label }}</div>
    </div>
    
    <!-- 波浪載入 -->
    <div v-else-if="type === 'wave'" class="progress-wave" :class="`wave-${variant}`">
      <div v-for="i in 5" :key="i" class="wave-bar" :style="{ animationDelay: `${i * 0.1}s` }"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: 'bar' | 'circle' | 'dots' | 'spinner' | 'wave'
  percentage?: number
  size?: number
  thickness?: number
  strokeWidth?: number
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  showText?: boolean
  label?: string
  smooth?: boolean
  isDark?: boolean
  dotCount?: number
  dotSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'bar',
  percentage: undefined,
  size: 40,
  thickness: 4,
  strokeWidth: 4,
  variant: 'primary',
  showText: false,
  label: '',
  smooth: true,
  isDark: false,
  dotCount: 3,
  dotSize: 8
})

// 計算屬性
const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const strokeDashoffset = computed(() => {
  if (props.percentage === undefined) return 0
  const progress = Math.min(100, Math.max(0, props.percentage)) / 100
  return circumference.value * (1 - progress)
})
</script>

<style scoped>
.progress-indicator {
  @apply relative;
}

/* 進度條樣式 */
.progress-bar {
  @apply relative bg-gray-200 rounded-full overflow-hidden;
}

.is-dark .progress-bar {
  @apply bg-gray-700;
}

.progress-fill {
  @apply h-full rounded-full;
  transition: width 0.3s ease;
}

.progress-text {
  @apply absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700;
}

.is-dark .progress-text {
  @apply text-gray-300;
}

/* 顏色變體 */
.fill-primary { @apply bg-church-primary; }
.fill-secondary { @apply bg-church-secondary; }
.fill-success { @apply bg-green-500; }
.fill-warning { @apply bg-yellow-500; }
.fill-error { @apply bg-red-500; }

/* 不定進度條動畫 */
.indeterminate .progress-fill {
  animation: indeterminate 1.5s infinite;
}

@keyframes indeterminate {
  0% {
    width: 0;
    margin-left: 0;
  }
  50% {
    width: 50%;
    margin-left: 25%;
  }
  100% {
    width: 0;
    margin-left: 100%;
  }
}

/* 圓形進度樣式 */
.progress-circle {
  @apply relative;
}

.progress-svg {
  @apply transform -rotate-90;
}

.progress-track {
  @apply stroke-gray-200;
}

.is-dark .progress-track {
  @apply stroke-gray-700;
}

.progress-fill-circle {
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s ease;
}

.stroke-primary { stroke: theme('colors.church.primary'); }
.stroke-secondary { stroke: theme('colors.church.secondary'); }
.stroke-success { stroke: theme('colors.green.500'); }
.stroke-warning { stroke: theme('colors.yellow.500'); }
.stroke-error { stroke: theme('colors.red.500'); }

.progress-center-text {
  @apply absolute inset-0 flex flex-col items-center justify-center;
}

.progress-percentage {
  @apply text-sm font-bold text-gray-900;
}

.is-dark .progress-percentage {
  @apply text-gray-100;
}

.progress-label {
  @apply text-xs text-gray-600 mt-1;
}

.is-dark .progress-label {
  @apply text-gray-400;
}

/* 點狀載入樣式 */
.progress-dots {
  @apply flex space-x-1;
}

.dot {
  @apply rounded-full;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dots-primary .dot { @apply bg-church-primary; }
.dots-secondary .dot { @apply bg-church-secondary; }
.dots-success .dot { @apply bg-green-500; }
.dots-warning .dot { @apply bg-yellow-500; }
.dots-error .dot { @apply bg-red-500; }

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 旋轉載入樣式 */
.progress-spinner {
  @apply relative;
}

.spinner-svg {
  animation: rotate 2s linear infinite;
}

.spinner-path {
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  animation: dash 1.5s ease-in-out infinite;
}

.spinner-primary .spinner-path { stroke: theme('colors.church.primary'); }
.spinner-secondary .spinner-path { stroke: theme('colors.church.secondary'); }
.spinner-success .spinner-path { stroke: theme('colors.green.500'); }
.spinner-warning .spinner-path { stroke: theme('colors.yellow.500'); }
.spinner-error .spinner-path { stroke: theme('colors.red.500'); }

.spinner-text {
  @apply absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700;
}

.is-dark .spinner-text {
  @apply text-gray-300;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

/* 波浪載入樣式 */
.progress-wave {
  @apply flex items-end space-x-1;
}

.wave-bar {
  @apply w-1 bg-church-primary rounded-t;
  height: 20px;
  animation: wave 0.9s infinite ease-in-out;
}

.wave-primary .wave-bar { @apply bg-church-primary; }
.wave-secondary .wave-bar { @apply bg-church-secondary; }
.wave-success .wave-bar { @apply bg-green-500; }
.wave-warning .wave-bar { @apply bg-yellow-500; }
.wave-error .wave-bar { @apply bg-red-500; }

@keyframes wave {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

/* 響應式設計 */
@media (max-width: 640px) {
  .progress-circle {
    max-width: 80px;
    max-height: 80px;
  }
  
  .progress-percentage {
    @apply text-xs;
  }
  
  .progress-label {
    @apply text-xs;
  }
}

/* 無障礙 */
@media (prefers-reduced-motion: reduce) {
  .progress-fill,
  .progress-fill-circle,
  .spinner-svg,
  .dot,
  .wave-bar {
    animation: none !important;
    transition: none !important;
  }
  
  .indeterminate .progress-fill {
    animation: none;
    width: 100%;
    margin-left: 0;
  }
}

/* 高對比度模式 */
@media (prefers-contrast: high) {
  .progress-track {
    @apply stroke-black;
  }
  
  .progress-bar {
    @apply bg-black;
  }
  
  .progress-fill {
    @apply bg-white;
  }
}
</style>