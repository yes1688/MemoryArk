# 分塊上傳系統界面整合實做方案

## 📋 專案概述

本文件規劃將現有的分塊上傳系統無縫整合到檔案管理界面中，保持原有使用體驗的同時，增強大檔案上傳能力和斷點續傳功能。

## 🎯 整合目標

### 核心原則
- ✅ **保持現有界面**：不改變用戶熟悉的操作流程
- ✅ **完全相容虛擬目錄**：整合現有的虛擬路徑系統
- ✅ **智能切換**：根據檔案大小自動選擇最佳上傳方式
- ✅ **漸進增強**：分塊上傳作為現有功能的增強版本
- ✅ **向後相容**：確保所有現有功能正常運作

### 虛擬目錄系統整合
- **完全支援**現有的 `virtual_path` 欄位系統
- **保持**虛擬路徑與物理路徑的分離架構
- **維持**階層式目錄結構和父子關係
- **復用**現有的虛擬目錄 API 端點

### 技術要求
- 整合現有的 `FileUploader.vue`、`UploadModal.vue` 等組件
- 復用現有的認證系統和虛擬目錄 API 架構
- 維持現有的檔案驗證和安全機制
- 保持 Vue 3 + TypeScript 的開發標準

## 🗂️ 虛擬目錄系統完全整合

### 現有虛擬目錄架構分析

MemoryArk 已實現完整的虛擬目錄系統：

1. **資料庫架構**
   ```sql
   -- files 表包含虛擬路徑欄位
   virtual_path VARCHAR(1000)  -- 如：/資料夾1/子資料夾/檔案.pdf
   file_path VARCHAR(500)      -- 物理路徑：uploads/files/ab/uuid
   parent_id INTEGER           -- 父目錄 ID（虛擬結構）
   ```

2. **路徑分離系統**
   - **虛擬路徑** (`virtual_path`)：用戶看到的目錄結構
   - **物理路徑** (`file_path`)：實際檔案儲存位置（UUID檔名）
   - **階層關係** (`parent_id`)：虛擬目錄的父子關係

3. **API 端點支援**
   - `POST /api/files/upload` - 支援 `parentId` 和 `relativePath` 參數
   - `POST /api/files/chunk-init` - 分塊上傳初始化（需整合虛擬目錄）
   - `POST /api/files/chunk-finalize` - 分塊完成（需建立虛擬路徑）

### 分塊上傳虛擬目錄整合策略

#### ✅ 完全相容保證
- **分塊上傳** → **虛擬目錄**：使用相同的 `parentId` 和 `relativePath` 參數
- **路徑建構**：復用現有的 `buildVirtualPath()` 函數
- **目錄結構**：維持相同的階層式組織方式
- **API 介面**：使用現有的虛擬目錄端點

#### 🔄 整合流程
1. **前端**：傳遞 `parentId`（目標虛擬目錄）給分塊上傳
2. **分塊初始化**：記錄目標虛擬目錄資訊
3. **分塊完成**：使用現有邏輯建構 `virtual_path`
4. **資料庫儲存**：檔案記錄包含完整虛擬路徑

## 🔧 實施計畫

### 階段一：核心服務整合 🚀

#### 1.1 建立統一上傳服務
**新建檔案：** `frontend/src/services/unifiedUploadService.ts`

```typescript
export interface UploadMethod {
  name: 'standard' | 'chunked'
  threshold: number // 檔案大小閾值 (bytes)
  suitable: boolean
  description: string
}

export class UnifiedUploadService {
  private chunkUploader: ChunkUploader
  private standardUploader: StandardUploader
  
  constructor(config?: UploadConfig) {
    this.chunkUploader = new ChunkUploader(config?.chunkConfig)
    this.standardUploader = new StandardUploader(config?.standardConfig)
  }

  // 智能選擇上傳方式
  selectUploadMethod(files: File[]): UploadMethod {
    const largeFiles = files.filter(file => file.size > 50 * 1024 * 1024) // 50MB
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    
    // 判斷條件：
    // 1. 有大檔案 (>50MB)
    // 2. 總大小超過 100MB
    // 3. 用戶偏好設定
    const shouldUseChunked = 
      largeFiles.length > 0 || 
      totalSize > 100 * 1024 * 1024 ||
      this.getUserPreference() === 'chunked'

    return {
      name: shouldUseChunked ? 'chunked' : 'standard',
      threshold: 50 * 1024 * 1024,
      suitable: true,
      description: shouldUseChunked 
        ? '大檔案分塊上傳，支援斷點續傳' 
        : '標準上傳，適合小檔案'
    }
  }

  // 統一上傳接口
  async upload(files: File[], options: UploadOptions): Promise<UploadResult[]> {
    const method = this.selectUploadMethod(files)
    
    if (method.name === 'chunked') {
      return this.chunkUploader.uploadFiles(files, options)
    } else {
      return this.standardUploader.uploadFiles(files, options)
    }
  }

  // 獲取上傳進度
  getProgress(): UploadProgress {
    // 統一不同上傳方式的進度格式
    const chunkProgress = this.chunkUploader.getProgress()
    const standardProgress = this.standardUploader.getProgress()
    
    return this.mergeProgress(chunkProgress, standardProgress)
  }
}
```

#### 1.2 標準上傳器包裝
**新建檔案：** `frontend/src/services/standardUploader.ts`

```typescript
// 包裝現有的標準上傳邏輯，提供統一接口
export class StandardUploader {
  async uploadFiles(files: File[], options: UploadOptions): Promise<UploadResult[]> {
    // 使用現有的批量上傳 API
    const results: UploadResult[] = []
    
    for (const file of files) {
      try {
        const result = await this.uploadSingleFile(file, options)
        results.push(result)
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: error.message
        })
      }
    }
    
    return results
  }

  private async uploadSingleFile(file: File, options: UploadOptions) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('parentId', options.parentId?.toString() || '')
    formData.append('relativePath', options.relativePath || '')
    
    // 🗂️ 虛擬目錄支援：系統自動處理虛擬路徑建構
    // - parentId: 指定父級虛擬目錄
    // - relativePath: 支援資料夾結構上傳
    // - 後端自動建構完整 virtual_path
    
    // 使用現有的 API 端點（已支援虛擬目錄）
    const response = await apiRequest.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: options.onProgress
    })
    
    return response.data
  }
}
```

### 階段二：界面組件增強 🎨

#### 2.1 FileUploader 組件無縫整合
**修改檔案：** `frontend/src/components/FileUploader.vue`

```vue
<template>
  <div class="file-uploader">
    <!-- 保持現有的拖拽區域 -->
    <div 
      class="drop-zone"
      :class="{ 
        'drag-over': isDragOver,
        'uploading': isUploading,
        'chunked-mode': uploadMethod?.name === 'chunked'
      }"
      @drop="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
    >
      <!-- 現有的圖標和標題 -->
      <div class="upload-icon">
        <Icon :name="getUploadIcon()" :size="48" />
      </div>
      
      <h3>{{ uploadTitle }}</h3>
      <p class="upload-description">{{ uploadDescription }}</p>
      
      <!-- 新增：智能上傳提示 -->
      <div v-if="selectedFiles.length > 0" class="upload-method-info">
        <div class="method-badge" :class="`method-${uploadMethod?.name}`">
          <Icon :name="uploadMethod?.name === 'chunked' ? 'layers' : 'upload'" :size="16" />
          {{ uploadMethod?.description }}
        </div>
        
        <!-- 分塊上傳優勢說明 -->
        <div v-if="uploadMethod?.name === 'chunked'" class="chunked-benefits">
          <ul>
            <li>✅ 大檔案穩定上傳</li>
            <li>✅ 網路中斷自動恢復</li>
            <li>✅ 智能重試機制</li>
          </ul>
        </div>
      </div>
      
      <!-- 保持現有的檔案選擇按鈕 -->
      <button @click="openFileDialog" class="file-select-btn">
        選擇檔案
      </button>
      <input 
        ref="fileInput"
        type="file" 
        multiple 
        :webkitdirectory="enableFolderUpload"
        @change="handleFileSelect"
        style="display: none"
      />
    </div>

    <!-- 增強的進度顯示 -->
    <div v-if="isUploading" class="upload-progress-enhanced">
      <!-- 標準進度條 -->
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: `${totalProgress}%` }"></div>
      </div>
      
      <!-- 分塊上傳詳細進度 -->
      <div v-if="uploadMethod?.name === 'chunked'" class="chunk-progress-details">
        <div class="progress-stats">
          <span>分塊進度：{{ completedChunks }} / {{ totalChunks }}</span>
          <span>上傳速度：{{ formatSpeed(uploadSpeed) }}</span>
          <span v-if="estimatedTime > 0">剩餘時間：{{ formatTime(estimatedTime) }}</span>
        </div>
        
        <!-- 網路狀態 -->
        <div class="network-status" :class="networkQuality">
          <Icon :name="getNetworkIcon()" :size="14" />
          {{ networkStatusText }}
        </div>
      </div>
      
      <!-- 檔案列表進度 -->
      <div class="file-progress-list">
        <div 
          v-for="file in uploadingFiles" 
          :key="file.id"
          class="file-progress-item"
        >
          <AppFileIcon :file="file" size="sm" />
          <div class="file-info">
            <span class="file-name">{{ file.name }}</span>
            <div class="file-progress">
              <div class="progress-bar-small">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${file.progress}%` }"
                ></div>
              </div>
              <span class="progress-text">{{ file.progress }}%</span>
            </div>
          </div>
          <div class="file-status">
            <Icon 
              :name="getFileStatusIcon(file.status)" 
              :class="`status-${file.status}`"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { UnifiedUploadService } from '@/services/unifiedUploadService'
import { useUploadStore } from '@/stores/upload'

const props = defineProps<{
  parentId?: number
  enableFolderUpload?: boolean
  acceptedTypes?: string[]
  maxFileSize?: number
}>()

const emit = defineEmits<{
  filesSelected: [files: File[]]
  uploadComplete: [results: UploadResult[]]
  uploadProgress: [progress: UploadProgress]
}>()

// 響應式數據
const selectedFiles = ref<File[]>([])
const isUploading = ref(false)
const uploadMethod = ref<UploadMethod | null>(null)
const uploadService = ref<UnifiedUploadService>()

// 生命週期
onMounted(() => {
  uploadService.value = new UnifiedUploadService({
    chunkConfig: {
      chunkSize: 5 * 1024 * 1024, // 5MB
      maxRetries: 3,
      retryDelay: 1000
    }
  })
})

// 計算屬性
const uploadTitle = computed(() => {
  if (selectedFiles.value.length === 0) {
    return props.enableFolderUpload ? '拖拽資料夾到此處' : '拖拽檔案到此處'
  }
  
  const method = uploadMethod.value
  return method?.name === 'chunked' 
    ? `準備進行分塊上傳 (${selectedFiles.value.length} 個檔案)`
    : `準備上傳 (${selectedFiles.value.length} 個檔案)`
})

const uploadDescription = computed(() => {
  if (uploadMethod.value?.name === 'chunked') {
    return '大檔案將使用分塊上傳，確保穩定傳輸'
  }
  return '支援多檔案同時上傳，單檔最大 100MB'
})

// 事件處理
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    processSelectedFiles(Array.from(input.files))
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  if (event.dataTransfer?.files) {
    processSelectedFiles(Array.from(event.dataTransfer.files))
  }
}

const processSelectedFiles = (files: File[]) => {
  selectedFiles.value = files
  
  // 智能選擇上傳方式
  if (uploadService.value) {
    uploadMethod.value = uploadService.value.selectUploadMethod(files)
  }
  
  emit('filesSelected', files)
}

// 上傳處理
const startUpload = async () => {
  if (!uploadService.value || selectedFiles.value.length === 0) return
  
  isUploading.value = true
  
  try {
    const results = await uploadService.value.upload(selectedFiles.value, {
      parentId: props.parentId,
      onProgress: (progress) => {
        emit('uploadProgress', progress)
      }
    })
    
    emit('uploadComplete', results)
  } catch (error) {
    console.error('Upload failed:', error)
  } finally {
    isUploading.value = false
    selectedFiles.value = []
    uploadMethod.value = null
  }
}

// 暴露方法給父組件
defineExpose({
  startUpload,
  clearFiles: () => {
    selectedFiles.value = []
    uploadMethod.value = null
  }
})
</script>

<style scoped>
.file-uploader {
  /* 保持現有样式 */
}

.upload-method-info {
  margin-top: 16px;
  padding: 12px;
  background: var(--color-background-mute);
  border-radius: 8px;
}

.method-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.method-chunked {
  color: var(--color-primary);
}

.method-standard {
  color: var(--color-text-secondary);
}

.chunked-benefits ul {
  margin: 8px 0 0 0;
  padding-left: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.upload-progress-enhanced {
  margin-top: 20px;
}

.chunk-progress-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.network-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.network-status.good { color: var(--color-success); }
.network-status.poor { color: var(--color-warning); }
.network-status.bad { color: var(--color-danger); }
</style>
```

#### 2.2 UploadModal 組件智能增強
**修改檔案：** `frontend/src/components/UploadModal.vue`

```vue
<template>
  <div class="upload-modal-overlay" v-if="isVisible" @click="handleOverlayClick">
    <div class="upload-modal" @click.stop>
      <!-- 保持現有的標題和關閉按鈕 -->
      <div class="modal-header">
        <h2>上傳檔案</h2>
        <button @click="closeModal" class="close-btn">
          <Icon name="x" :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <!-- 使用增強的 FileUploader 組件 -->
        <FileUploader
          ref="fileUploaderRef"
          :parent-id="parentId"
          :enable-folder-upload="enableFolderUpload"
          @files-selected="handleFilesSelected"
          @upload-progress="handleUploadProgress"
          @upload-complete="handleUploadComplete"
        />

        <!-- 進階選項（僅在需要時顯示） -->
        <div v-if="showAdvancedOptions" class="advanced-options">
          <div class="section-title">
            <h4>進階設定</h4>
            <button @click="showAdvancedOptions = false" class="collapse-btn">
              <Icon name="chevron-up" :size="16" />
            </button>
          </div>

          <!-- 上傳方式手動選擇 -->
          <div class="upload-method-selector">
            <label>上傳方式：</label>
            <div class="radio-group">
              <label class="radio-option">
                <input 
                  type="radio" 
                  v-model="manualUploadMethod" 
                  value="auto"
                  @change="updateUploadMethod"
                />
                自動選擇（推薦）
              </label>
              <label class="radio-option">
                <input 
                  type="radio" 
                  v-model="manualUploadMethod" 
                  value="standard"
                  @change="updateUploadMethod"
                />
                標準上傳
              </label>
              <label class="radio-option">
                <input 
                  type="radio" 
                  v-model="manualUploadMethod" 
                  value="chunked"
                  @change="updateUploadMethod"
                />
                分塊上傳
              </label>
            </div>
          </div>

          <!-- 分塊上傳設定 -->
          <div v-if="manualUploadMethod === 'chunked'" class="chunk-settings">
            <div class="setting-item">
              <label>分塊大小：</label>
              <select v-model="chunkSize">
                <option :value="1 * 1024 * 1024">1 MB（慢速網路）</option>
                <option :value="5 * 1024 * 1024">5 MB（推薦）</option>
                <option :value="10 * 1024 * 1024">10 MB（高速網路）</option>
              </select>
            </div>
            
            <div class="setting-item">
              <label>
                <input 
                  type="checkbox" 
                  v-model="enableAutoRetry"
                />
                網路中斷自動重試
              </label>
            </div>
          </div>
        </div>

        <!-- 檔案資訊和分類（保持現有功能） -->
        <div v-if="selectedFiles.length > 0" class="file-info-section">
          <!-- 現有的檔案分類和描述欄位 -->
          <div class="form-group">
            <label>檔案描述：</label>
            <textarea 
              v-model="fileDescription" 
              placeholder="為這些檔案添加描述..."
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>標籤：</label>
            <input 
              v-model="fileTags" 
              placeholder="使用逗號分隔標籤"
            />
          </div>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="modal-footer">
        <button 
          v-if="selectedFiles.length > 0 && !showAdvancedOptions" 
          @click="showAdvancedOptions = true"
          class="btn-secondary"
        >
          進階選項
        </button>
        
        <div class="main-actions">
          <button @click="closeModal" class="btn-cancel">
            取消
          </button>
          <button 
            @click="startUpload" 
            :disabled="selectedFiles.length === 0 || isUploading"
            class="btn-primary"
          >
            {{ isUploading ? '上傳中...' : `上傳 ${selectedFiles.length} 個檔案` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import FileUploader from './FileUploader.vue'

const props = defineProps<{
  isVisible: boolean
  parentId?: number
  enableFolderUpload?: boolean
}>()

const emit = defineEmits<{
  close: []
  uploadComplete: [results: UploadResult[]]
}>()

// 響應式數據
const fileUploaderRef = ref()
const selectedFiles = ref<File[]>([])
const isUploading = ref(false)
const showAdvancedOptions = ref(false)

// 進階設定
const manualUploadMethod = ref<'auto' | 'standard' | 'chunked'>('auto')
const chunkSize = ref(5 * 1024 * 1024) // 5MB
const enableAutoRetry = ref(true)

// 檔案資訊
const fileDescription = ref('')
const fileTags = ref('')

// 事件處理
const handleFilesSelected = (files: File[]) => {
  selectedFiles.value = files
  
  // 大檔案自動顯示進階選項
  const hasLargeFiles = files.some(file => file.size > 50 * 1024 * 1024)
  if (hasLargeFiles && !showAdvancedOptions.value) {
    showAdvancedOptions.value = true
  }
}

const startUpload = () => {
  if (fileUploaderRef.value) {
    fileUploaderRef.value.startUpload()
  }
}

const handleUploadComplete = (results: UploadResult[]) => {
  emit('uploadComplete', results)
  closeModal()
}

const closeModal = () => {
  // 重置狀態
  selectedFiles.value = []
  isUploading.value = false
  showAdvancedOptions.value = false
  fileDescription.value = ''
  fileTags.value = ''
  
  if (fileUploaderRef.value) {
    fileUploaderRef.value.clearFiles()
  }
  
  emit('close')
}
</script>
```

### 階段三：現有頁面整合 📱

#### 3.1 FilesView 無縫集成
**修改檔案：** `frontend/src/views/FilesView.vue`

只需要更新上傳模態的引用，其他保持不變：

```vue
<template>
  <div class="files-view">
    <!-- 保持現有的所有界面元素 -->
    
    <!-- 上傳模態使用增強版本 -->
    <UploadModal
      :is-visible="showUploadModal"
      :parent-id="currentFolderId"
      :enable-folder-upload="true"
      @close="showUploadModal = false"
      @upload-complete="handleUploadComplete"
    />
  </div>
</template>

<script setup lang="ts">
// 現有的所有邏輯保持不變
// 只是 UploadModal 現在自動支援分塊上傳

const handleUploadComplete = (results: UploadResult[]) => {
  // 現有的上傳完成處理
  refreshFileList()
  
  // 新增：顯示上傳結果統計
  const successCount = results.filter(r => r.success).length
  const failureCount = results.length - successCount
  
  if (failureCount === 0) {
    showNotification(`成功上傳 ${successCount} 個檔案`, 'success')
  } else {
    showNotification(
      `上傳完成：${successCount} 成功，${failureCount} 失敗`, 
      'warning'
    )
  }
}
</script>
```

#### 3.2 UploadView 智能增強
**修改檔案：** `frontend/src/views/UploadView.vue`

```vue
<template>
  <div class="upload-view">
    <!-- 保持現有的頁面標題和導航 -->
    
    <div class="upload-container">
      <!-- 使用增強的 FileUploader -->
      <FileUploader
        ref="mainUploaderRef"
        :enable-folder-upload="true"
        @files-selected="handleFilesSelected"
        @upload-progress="handleUploadProgress"
        @upload-complete="handleUploadComplete"
      />

      <!-- 檔案預覽和分類（保持現有功能） -->
      <div v-if="selectedFiles.length > 0" class="file-preview-section">
        <!-- 現有的檔案預覽和分類界面 -->
      </div>

      <!-- 新增：上傳統計和狀態 -->
      <div v-if="uploadStats" class="upload-stats-panel">
        <h3>上傳統計</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">檔案總數</span>
            <span class="stat-value">{{ uploadStats.totalFiles }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">總大小</span>
            <span class="stat-value">{{ formatFileSize(uploadStats.totalSize) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">上傳方式</span>
            <span class="stat-value">{{ uploadStats.method }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">預估時間</span>
            <span class="stat-value">{{ uploadStats.estimatedTime }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 階段四：用戶體驗優化 ✨

#### 4.1 設定頁面新增上傳偏好
**修改檔案：** `frontend/src/views/SettingsView.vue`

```vue
<template>
  <div class="settings-view">
    <!-- 現有的設定項目 -->
    
    <!-- 新增：上傳設定區塊 -->
    <div class="settings-section">
      <h3>
        <Icon name="upload" :size="20" />
        上傳偏好設定
      </h3>
      
      <div class="setting-group">
        <div class="setting-item">
          <label>預設上傳方式：</label>
          <select v-model="uploadSettings.defaultMethod" @change="saveSettings">
            <option value="auto">自動選擇（推薦）</option>
            <option value="standard">總是使用標準上傳</option>
            <option value="chunked">總是使用分塊上傳</option>
          </select>
          <p class="setting-description">
            自動選擇會根據檔案大小智能切換上傳方式
          </p>
        </div>

        <div class="setting-item">
          <label>大檔案閾值：</label>
          <select v-model="uploadSettings.largeFileThreshold" @change="saveSettings">
            <option :value="20 * 1024 * 1024">20 MB</option>
            <option :value="50 * 1024 * 1024">50 MB（推薦）</option>
            <option :value="100 * 1024 * 1024">100 MB</option>
          </select>
          <p class="setting-description">
            超過此大小的檔案將自動使用分塊上傳
          </p>
        </div>

        <div class="setting-item">
          <label>分塊大小：</label>
          <select v-model="uploadSettings.chunkSize" @change="saveSettings">
            <option :value="1 * 1024 * 1024">1 MB（慢速網路）</option>
            <option :value="5 * 1024 * 1024">5 MB（推薦）</option>
            <option :value="10 * 1024 * 1024">10 MB（高速網路）</option>
          </select>
        </div>

        <div class="setting-item checkbox">
          <label>
            <input 
              type="checkbox" 
              v-model="uploadSettings.autoRetry"
              @change="saveSettings"
            />
            網路中斷自動重試
          </label>
        </div>

        <div class="setting-item checkbox">
          <label>
            <input 
              type="checkbox" 
              v-model="uploadSettings.showDetailedProgress"
              @change="saveSettings"
            />
            顯示詳細上傳進度
          </label>
        </div>

        <div class="setting-item checkbox">
          <label>
            <input 
              type="checkbox" 
              v-model="uploadSettings.pauseOnNetworkIssue"
              @change="saveSettings"
            />
            網路不穩定時自動暫停
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

const uploadSettings = ref({
  defaultMethod: 'auto',
  largeFileThreshold: 50 * 1024 * 1024,
  chunkSize: 5 * 1024 * 1024,
  autoRetry: true,
  showDetailedProgress: true,
  pauseOnNetworkIssue: true
})

onMounted(() => {
  loadSettings()
})

const loadSettings = () => {
  const saved = settingsStore.getUploadSettings()
  if (saved) {
    uploadSettings.value = { ...uploadSettings.value, ...saved }
  }
}

const saveSettings = () => {
  settingsStore.saveUploadSettings(uploadSettings.value)
}
</script>
```

#### 4.2 通知系統增強
**修改檔案：** `frontend/src/composables/useNotifications.ts`

```typescript
export function useNotifications() {
  // 現有的通知功能

  // 新增：上傳特定通知
  const showUploadNotification = (
    type: 'started' | 'progress' | 'completed' | 'failed',
    data: any
  ) => {
    switch (type) {
      case 'started':
        showNotification(
          `開始上傳 ${data.fileCount} 個檔案（${data.method}）`,
          'info',
          { duration: 3000 }
        )
        break
        
      case 'progress':
        if (data.method === 'chunked') {
          showProgressNotification(
            `上傳進度 ${data.progress}% - ${data.speed}`,
            data.progress
          )
        }
        break
        
      case 'completed':
        showNotification(
          `上傳完成！成功：${data.success}，失敗：${data.failed}`,
          data.failed === 0 ? 'success' : 'warning',
          { duration: 5000 }
        )
        break
        
      case 'failed':
        showNotification(
          `上傳失敗：${data.error}`,
          'error',
          { duration: 10000, actions: [{ label: '重試', action: data.retry }] }
        )
        break
    }
  }

  return {
    // 現有的方法
    showUploadNotification
  }
}
```

## 🧪 測試計畫

### 測試場景

#### 基本功能測試
1. **小檔案上傳**（< 20MB）
   - 自動選擇標準上傳
   - 上傳速度和穩定性
   - 界面反應和進度顯示

2. **大檔案上傳**（> 50MB）
   - 自動切換分塊上傳
   - 進度顯示準確性
   - 完成後檔案完整性

3. **混合檔案上傳**
   - 大小檔案混合
   - 智能方式選擇
   - 並行處理能力

#### 網路環境測試
1. **網路中斷恢復**
   - 上傳過程中斷網路
   - 自動重連和續傳
   - 數據完整性驗證

2. **慢速網路**
   - 低速網路環境
   - 小分塊自動選擇
   - 超時處理機制

3. **不穩定網路**
   - 間歇性網路問題
   - 重試機制驗證
   - 用戶體驗評估

#### 用戶界面測試  
1. **操作流程**
   - 現有用戶操作習慣
   - 新功能學習成本
   - 界面響應性能

2. **進度顯示**
   - 進度準確性
   - 狀態更新及時性
   - 錯誤提示清晰度

3. **設定功能**
   - 偏好設定保存
   - 設定項目生效
   - 預設值合理性

## 🚀 部署計畫

### 分階段部署策略

#### 階段 1：核心整合（預計 2-3 天）
- [ ] UnifiedUploadService 實現
- [ ] FileUploader 組件增強
- [ ] 基本測試驗證

#### 階段 2：界面優化（預計 2-3 天）
- [ ] UploadModal 智能增強
- [ ] 進度顯示優化
- [ ] 錯誤處理完善

#### 階段 3：體驗完善（預計 1-2 天）
- [ ] 設定頁面整合
- [ ] 通知系統增強
- [ ] 用戶體驗調優

#### 階段 4：測試和部署（預計 1-2 天）
- [ ] 完整功能測試
- [ ] 性能基準測試
- [ ] 生產環境部署

### 部署檢查清單

#### 前端部署
- [ ] `npm run build` 編譯成功
- [ ] 新組件正確打包
- [ ] 靜態資源路徑正確
- [ ] 瀏覽器相容性測試

#### 容器部署
- [ ] `podman-compose down && podman-compose up -d`
- [ ] 服務啟動正常
- [ ] API 端點響應正常
- [ ] 認證系統整合正確

#### 功能驗證
- [ ] 小檔案標準上傳正常
- [ ] 大檔案分塊上傳正常
- [ ] 網路中斷恢復正常
- [ ] 用戶設定保存正常

## 🎯 成功指標

### 技術指標
- **上傳成功率** > 99%（網路正常環境）
- **大檔案上傳成功率** > 95%（> 100MB）
- **網路中斷恢復率** > 90%
- **界面響應時間** < 100ms

### 用戶體驗指標
- **操作流程無變化**：現有用戶無需學習新操作
- **智能化程度**：90% 情況下自動選擇最佳上傳方式
- **進度可視化**：用戶清楚了解上傳狀態和進度
- **錯誤處理**：明確的錯誤提示和恢復指引

### 性能指標
- **記憶體使用**：分塊上傳記憶體使用 < 50MB
- **CPU 佔用**：上傳過程 CPU 使用 < 30%
- **上傳速度**：不低於標準上傳方式
- **並發能力**：支援 10+ 檔案並行上傳

## 📚 文件更新

### 需要更新的文件
1. **API 文檔**：更新上傳端點說明
2. **組件文檔**：記錄新增的組件屬性和事件
3. **用戶手冊**：說明新的上傳功能和設定選項
4. **開發指南**：記錄整合模式和最佳實踐

### 新建文檔
1. **分塊上傳技術規格**
2. **用戶操作指南**
3. **故障排除手冊**
4. **性能調優指南**

## 🔐 安全考量

### 現有安全機制保持
- ✅ JWT 認證驗證
- ✅ 檔案類型白名單
- ✅ 檔案大小限制
- ✅ 路徑注入防護

### 分塊上傳特有安全
- ✅ 分塊完整性驗證（SHA256）
- ✅ 會話安全管理
- ✅ 檔案重組驗證
- ✅ 惡意檔案防護

## 📞 支援和維護

### 監控項目
- 上傳成功率統計
- 分塊上傳使用率
- 網路錯誤頻率分析
- 用戶設定偏好統計

### 日誌記錄
- 上傳方式選擇記錄
- 分塊上傳詳細日誌
- 錯誤和重試記錄
- 性能指標記錄

---

## 🚨 重要提醒

### 遵循 CLAUDE.md 指令
- ✅ 使用 Podman 容器管理：`podman-compose down && podman-compose up -d`
- ✅ 保護 `data/` 和 `uploads/` 目錄：絕對不可刪除
- ✅ 執行完整的認證檢查：不跳過 Cloudflare Access
- ✅ 使用 TodoWrite 追蹤任務進度

### 開發原則
- **數據完整性 > 技術便利性 > 開發效率**
- **保持現有界面**：最小化用戶學習成本
- **漸進增強**：新功能作為現有功能的增強
- **向後相容**：確保所有現有功能正常運作

---

**此實做方案確保分塊上傳系統完美整合到現有檔案管理界面中，提供無縫的用戶體驗和強大的大檔案上傳能力。**