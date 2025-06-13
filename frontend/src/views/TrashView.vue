<template>
  <div class="min-h-screen" style="background: var(--bg-primary);">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TrashManager :folder-id="folderId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import TrashManager from '@/components/TrashManager.vue'

// Props
interface Props {
  folderId?: number
}

const props = withDefaults(defineProps<Props>(), {
  folderId: undefined
})
</script>