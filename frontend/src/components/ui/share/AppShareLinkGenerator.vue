<template>
  <AppDialog 
    :visible="visible" 
    @close="$emit('close')"
    title="生成分享連結"
    size="large"
  >
    <div class="share-settings space-y-6">
      <!-- 檔案資訊 -->
      <div class="bg-gray-50 rounded-win11 p-4">
        <div class="flex items-center space-x-3">
          <AppFileIcon
            :file-type="file.mimeType"
            size="lg"
          />
          <div>
            <h3 class="font-medium text-gray-900">{{ file.originalName }}</h3>
            <p class="text-sm text-gray-500">{{ formatFileSize(file.size) }}</p>
          </div>
        </div>
      </div>
      
      <!-- 基本設定 -->
      <div class="setting-group">
        <label class="block text-sm font-medium text-gray-700 mb-3">有效期限</label>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <label
            v-for="option in expiryOptions"
            :key="option.value"
            :class="[
              'flex items-center justify-center p-3 border rounded-win11 cursor-pointer transition-colors duration-200',
              settings.expiresIn === option.value
                ? 'border-church-primary bg-church-primary/10 text-church-primary'
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <input
              type="radio"
              v-model="settings.expiresIn"
              :value="option.value"
              class="sr-only"
            />
            <div class="text-center">
              <div class="font-medium">{{ option.label }}</div>
              <div v-if="option.description" class="text-xs text-gray-500 mt-1">
                {{ option.description }}
              </div>
            </div>
          </label>
        </div>
        
        <!-- 自訂時間 -->
        <div v-if="settings.expiresIn === 'custom'" class="mt-3">
          <label class="block text-sm font-medium text-gray-700 mb-2">自訂過期時間</label>
          <input
            type="datetime-local"
            v-model="settings.customExpiry"
            :min="minDateTime"
            class="w-full px-3 py-2 border border-gray-300 rounded-win11 focus:ring-2 focus:ring-church-primary focus:border-transparent"
          />
        </div>
      </div>
      
      <!-- 下載限制 -->
      <div class="setting-group">
        <label class="flex items-center mb-3">
          <input 
            type="checkbox" 
            v-model="settings.hasDownloadLimit"
            class="rounded border-gray-300 text-church-primary focus:ring-church-primary"
          />
          <span class="ml-2 text-sm font-medium text-gray-700">限制下載次數</span>
        </label>
        
        <div v-if="settings.hasDownloadLimit" class="mt-2">
          <AppInput
            type="number"
            v-model="settings.maxDownloads"
            min="1"
            max="1000"
            placeholder="最大下載次數"
            size="medium"
          />
        </div>
      </div>
      
      <!-- 密碼保護 -->
      <div class="setting-group">
        <label class="flex items-center mb-3">
          <input 
            type="checkbox" 
            v-model="settings.hasPassword"
            class="rounded border-gray-300 text-church-primary focus:ring-church-primary"
          />
          <span class="ml-2 text-sm font-medium text-gray-700">密碼保護</span>
        </label>
        
        <div v-if="settings.hasPassword" class="space-y-3">
          <AppInput
            type="password"
            v-model="settings.password"
            placeholder="設定密碼"
            size="medium"
          />
          <AppInput
            type="password"
            v-model="confirmPassword"
            placeholder="確認密碼"
            size="medium"
            :class="{ 'border-red-300': passwordMismatch }"
          />
          <p v-if="passwordMismatch" class="text-sm text-red-600">
            密碼確認不符
          </p>
        </div>
      </div>
      
      <!-- 訪問限制 -->
      <div class="setting-group">
        <label class="block text-sm font-medium text-gray-700 mb-3">限定訪問者（Email）</label>
        <p class="text-sm text-gray-500 mb-3">只有指定的 Email 地址才能訪問此分享連結</p>
        
        <!-- Email 輸入 -->
        <div class="flex space-x-2 mb-3">
          <AppInput
            v-model="newEmail"
            type="email"
            placeholder="輸入 Email 地址..."
            size="medium"
            class="flex-1"
            @keydown.enter="addEmail"
          />
          <AppButton
            @click="addEmail"
            variant="outline"
            size="medium"
            :disabled="!isValidEmail(newEmail)"
          >
            新增
          </AppButton>
        </div>
        
        <!-- 已添加的 Email 列表 -->
        <div v-if="settings.allowedEmails.length > 0" class="space-y-2">
          <div
            v-for="(email, index) in settings.allowedEmails"
            :key="index"
            class="flex items-center justify-between p-2 bg-gray-50 rounded-win11"
          >
            <span class="text-sm text-gray-700">{{ email }}</span>
            <button
              @click="removeEmail(index)"
              class="text-red-500 hover:text-red-700 p-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 分享訊息 -->
      <div class="setting-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">分享訊息（選填）</label>
        <textarea 
          v-model="settings.message"
          rows="3"
          placeholder="給接收者的訊息..."
          class="w-full px-3 py-2 border border-gray-300 rounded-win11 focus:ring-2 focus:ring-church-primary focus:border-transparent resize-none"
        />
      </div>
      
      <!-- 生成的連結 -->
      <div v-if="generatedLink" class="generated-link bg-green-50 border border-green-200 rounded-win11 p-4">
        <h4 class="font-medium text-green-800 mb-3">分享連結已生成</h4>
        
        <!-- 連結顯示 -->
        <div class="flex items-center space-x-2 mb-4">
          <input 
            :value="generatedLink" 
            readonly
            ref="linkInput"
            class="flex-1 px-3 py-2 bg-white border border-green-300 rounded-win11 text-sm"
          />
          <AppButton
            @click="copyLink"
            variant="outline"
            size="medium"
            :class="copied ? 'bg-green-100 text-green-700' : ''"
          >
            {{ copied ? '已複製' : '複製' }}
          </AppButton>
        </div>
        
        <!-- 分享資訊摘要 -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600">有效期限：</span>
            <span class="font-medium">{{ getExpiryText() }}</span>
          </div>
          <div v-if="settings.hasDownloadLimit">
            <span class="text-gray-600">下載限制：</span>
            <span class="font-medium">{{ settings.maxDownloads }} 次</span>
          </div>
          <div v-if="settings.hasPassword">
            <span class="text-gray-600">密碼保護：</span>
            <span class="font-medium text-green-600">已啟用</span>
          </div>
          <div v-if="settings.allowedEmails.length > 0">
            <span class="text-gray-600">限定用戶：</span>
            <span class="font-medium">{{ settings.allowedEmails.length }} 人</span>
          </div>
        </div>
        
        <!-- QR Code -->
        <div v-if="showQRCode" class="flex justify-center mt-4">
          <div class="bg-white p-4 rounded-win11 border">
            <canvas ref="qrCanvas" class="w-48 h-48"></canvas>
            <p class="text-center text-sm text-gray-600 mt-2">掃描 QR Code 訪問</p>
          </div>
        </div>
        
        <!-- 分享選項 -->
        <div class="flex justify-center space-x-4 mt-4">
          <AppButton
            @click="shareViaEmail"
            variant="ghost"
            size="small"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </template>
            Email
          </AppButton>
          
          <AppButton
            @click="toggleQRCode"
            variant="ghost"
            size="small"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h1m-6 6v1m-6-6H6m2-6h.01M6 6h.01M6 18h.01M18 6h.01M18 18h.01"/>
              </svg>
            </template>
            {{ showQRCode ? '隱藏' : '顯示' }} QR Code
          </AppButton>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="flex justify-end space-x-3">
        <AppButton
          @click="$emit('close')"
          variant="outline"
          size="medium"
        >
          關閉
        </AppButton>
        
        <AppButton
          @click="generateLink"
          variant="primary"
          size="medium"
          :disabled="!canGenerate || isGenerating"
        >
          {{ isGenerating ? '生成中...' : (generatedLink ? '重新生成' : '生成連結') }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { AppDialog, AppButton, AppInput } from '@/components/ui'
import AppFileIcon from '@/components/ui/file-icon/AppFileIcon.vue'
import type { FileInfo } from '@/types/files'

interface Props {
  visible: boolean
  file: FileInfo
}

interface Emits {
  (e: 'close'): void
  (e: 'link-generated', data: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 響應式狀態
const settings = ref({
  expiresIn: '7d',
  customExpiry: '',
  hasDownloadLimit: false,
  maxDownloads: 10,
  hasPassword: false,
  password: '',
  allowedEmails: [] as string[],
  message: ''
})

const confirmPassword = ref('')
const newEmail = ref('')
const generatedLink = ref('')
const copied = ref(false)
const isGenerating = ref(false)
const showQRCode = ref(false)
const linkInput = ref<HTMLInputElement>()
const qrCanvas = ref<HTMLCanvasElement>()

// 過期時間選項
const expiryOptions = [
  { value: '1h', label: '1 小時', description: '短期分享' },
  { value: '1d', label: '1 天', description: '當日有效' },
  { value: '7d', label: '7 天', description: '推薦' },
  { value: '30d', label: '30 天', description: '長期分享' },
  { value: 'custom', label: '自訂', description: '自選時間' }
]

// 計算屬性
const minDateTime = computed(() => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5) // 最少5分鐘後
  return now.toISOString().slice(0, 16)
})

const passwordMismatch = computed(() => {
  return settings.value.hasPassword && 
         settings.value.password && 
         confirmPassword.value && 
         settings.value.password !== confirmPassword.value
})

const canGenerate = computed(() => {
  if (settings.value.hasPassword && passwordMismatch.value) return false
  if (settings.value.expiresIn === 'custom' && !settings.value.customExpiry) return false
  return true
})

// 方法
const generateLink = async () => {
  if (!canGenerate.value) return
  
  isGenerating.value = true
  try {
    // 模擬 API 調用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 生成模擬連結
    const token = generateToken()
    generatedLink.value = `${window.location.origin}/share/${token}`
    
    // 觸發事件
    emit('link-generated', {
      fileId: props.file.id,
      link: generatedLink.value,
      settings: { ...settings.value }
    })
    
    // 生成 QR Code
    if (showQRCode.value) {
      await nextTick()
      generateQRCode()
    }
  } catch (error) {
    console.error('Failed to generate link:', error)
  } finally {
    isGenerating.value = false
  }
}

const generateToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const copyLink = async () => {
  if (!generatedLink.value) return
  
  try {
    await navigator.clipboard.writeText(generatedLink.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    // 降級處理
    if (linkInput.value) {
      linkInput.value.select()
      document.execCommand('copy')
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    }
  }
}

const addEmail = () => {
  const email = newEmail.value.trim()
  if (!email || !isValidEmail(email)) return
  
  if (!settings.value.allowedEmails.includes(email)) {
    settings.value.allowedEmails.push(email)
    newEmail.value = ''
  }
}

const removeEmail = (index: number) => {
  settings.value.allowedEmails.splice(index, 1)
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const getExpiryText = (): string => {
  const option = expiryOptions.find(opt => opt.value === settings.value.expiresIn)
  if (option?.value === 'custom' && settings.value.customExpiry) {
    const date = new Date(settings.value.customExpiry)
    return date.toLocaleString('zh-TW')
  }
  return option?.label || '未設定'
}

const shareViaEmail = () => {
  const subject = `分享檔案：${props.file.originalName}`
  const body = `您好，

我想與您分享這個檔案：${props.file.originalName}

${settings.value.message ? `訊息：${settings.value.message}\n\n` : ''}點擊以下連結下載：
${generatedLink.value}

${settings.value.hasPassword ? '此連結受密碼保護，請聯絡我取得密碼。\n' : ''}${getExpiryText() !== '未設定' ? `有效期限：${getExpiryText()}\n` : ''}
此連結由 MemoryArk 系統產生。`

  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(mailto)
}

const toggleQRCode = async () => {
  showQRCode.value = !showQRCode.value
  if (showQRCode.value && generatedLink.value) {
    await nextTick()
    generateQRCode()
  }
}

const generateQRCode = () => {
  // 簡單的 QR Code 生成（實際應用中建議使用專門的 QR Code 庫）
  if (!qrCanvas.value || !generatedLink.value) return
  
  const canvas = qrCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // 簡化的佔位符實現
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 192, 192)
  ctx.fillStyle = '#fff'
  ctx.fillRect(8, 8, 176, 176)
  ctx.fillStyle = '#000'
  ctx.font = '12px monospace'
  ctx.fillText('QR Code', 70, 100)
  ctx.fillText('Placeholder', 55, 120)
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 監聽器
watch(() => props.visible, (visible) => {
  if (!visible) {
    // 重置狀態
    generatedLink.value = ''
    copied.value = false
    showQRCode.value = false
  }
})
</script>

<style scoped>
.setting-group {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.setting-group:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
</style>