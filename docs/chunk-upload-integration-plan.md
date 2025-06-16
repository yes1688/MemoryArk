# 分塊上傳系統整合計畫

## 📋 概述

本文檔記錄分塊上傳系統後續整合工作的計畫，包含認證整合、數據庫遷移和UI優化三個主要階段。

## 🚀 實施階段

### 第一階段：認證整合 🔐

#### 📝 問題分析
- 分塊上傳 API 目前返回 401 未認證錯誤
- 需要將用戶認證 token 正確傳遞給分塊上傳相關 API

#### 🎯 解決方案

##### 1.1 前端 API 客戶端更新
**文件位置：** `frontend/src/api/index.ts`

```typescript
// 確保所有 API 請求都包含認證 header
const apiRequest = axios.create({
  baseURL: '/api',
  timeout: 30 * 60 * 1000, // 30分鐘
})

// 請求攔截器 - 添加認證 header
apiRequest.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  const token = authStore.token || localStorage.getItem('auth_token')
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})
```

##### 1.2 分塊上傳 API 更新
**文件位置：** `frontend/src/api/files.ts`

```typescript
// 確保分塊上傳 API 使用統一的 apiRequest 客戶端
export const fileApi = {
  // 初始化分塊上傳會話
  initChunkUpload: (data) => {
    return apiRequest.post('/files/chunk-init', data)
  },

  // 上傳檔案分塊
  uploadChunk: (sessionId, chunkIndex, chunkHash, chunkData, onProgress) => {
    const formData = new FormData()
    formData.append('sessionId', sessionId)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('chunkHash', chunkHash)
    formData.append('chunkData', chunkData)

    return apiRequest.post('/files/chunk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    })
  }
}
```

##### 1.3 ChunkUploader 服務更新
**文件位置：** `frontend/src/services/chunkUploader.ts`

```typescript
// 使用統一的 API 客戶端替代直接的 axios 調用
import { fileApi } from '@/api/files'

export class ChunkUploader {
  private async initializeUploadSession(file, completedChunks) {
    const response = await fileApi.initChunkUpload({
      fileName: file.file.name,
      fileSize: file.file.size,
      fileHash: await this.calculateFileHash(file.file),
      totalChunks: file.chunks.length,
      chunkSize: this.config.chunkSize,
      relativePath: file.relativePath,
      completedChunks
    })
    return response.data
  }

  private async uploadChunk(chunk, sessionId) {
    const response = await fileApi.uploadChunk(
      sessionId,
      chunk.index,
      chunk.hash,
      chunk.data,
      (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          console.log(`分塊 ${chunk.id} 上傳進度: ${progress}%`)
        }
      }
    )
    return response.data
  }
}
```

#### ✅ 驗收標準
- [ ] 分塊上傳 API 不再返回 401 錯誤
- [ ] 認證 token 正確傳遞到所有分塊上傳端點
- [ ] 上傳測試器可以成功上傳小檔案

---

### 第二階段：數據庫遷移 🗄️ ✅ **已完成**

#### 📝 問題分析
- `chunk_sessions` 表尚未在生產數據庫中創建
- 需要執行遷移腳本確保數據庫結構正確

#### 🎯 解決方案

##### 2.1 自動遷移系統檢查 ✅
**發現情況：**
- ✅ 系統已有完整的自動遷移機制 (`backend/internal/database/migrations.go`)
- ✅ 自動遷移在應用啟動時執行 (`database.go:44`)
- ✅ 已創建遷移腳本 `002_add_chunk_sessions.sql`
- ✅ 已將 `ChunkSession` 模型添加到 AutoMigrate 列表

##### 2.2 遷移執行狀態 ✅
**執行記錄：**
```bash
# 自動遷移系統：backend/internal/database/migrations.go
- RunMigrations() 函數自動執行 SQL 遷移腳本
- AutoMigrate() 確保所有 GORM 模型同步
- 已將 &models.ChunkSession{} 添加到 AutoMigrate 列表

# 手動驗證遷移：
sqlite3 /data/memoryark.db "CREATE TABLE IF NOT EXISTS chunk_sessions..."
```

##### 2.3 驗證結果 ✅
```bash
# 確認表已創建
sqlite3 /data/memoryark.db "SELECT name FROM sqlite_master WHERE type='table';"
# 結果包含：chunk_sessions ✅

# 確認表結構正確
sqlite3 /data/memoryark.db ".schema chunk_sessions"
# 所有欄位和約束正確創建 ✅
```

##### 2.4 遷移歷史記錄 ✅
```sql
-- 已記錄到遷移歷史表
INSERT INTO migration_history (version, description, executed_at) 
VALUES ('002', 'add chunk sessions', datetime('now'));
```

#### ✅ 驗收標準 - **全部通過**
- [x] `chunk_sessions` 表成功創建
- [x] 所有索引正確建立
- [x] 外鍵約束正常工作  
- [x] 後端服務可以正常訪問新表
- [x] 自動遷移系統正常運作
- [x] 遷移歷史正確記錄

---

### 第三階段：UI優化 🎨

#### 📝 問題分析
- 分塊上傳功能目前只在測試頁面可用
- 需要將功能整合到現有的上傳組件中
- 用戶應該可以選擇使用傳統上傳或分塊上傳

#### 🎯 解決方案

##### 3.1 上傳組件增強
**文件位置：** `frontend/src/components/UploadModal.vue`

```vue
<template>
  <div class="upload-modal">
    <!-- 現有的上傳 UI -->
    
    <!-- 新增：上傳方式選擇 -->
    <div class="upload-method-selector" v-if="showAdvancedOptions">
      <h4>上傳方式</h4>
      <label>
        <input type="radio" v-model="uploadMethod" value="standard" />
        標準上傳（適合小檔案）
      </label>
      <label>
        <input type="radio" v-model="uploadMethod" value="chunked" />
        分塊上傳（適合大檔案，支援斷點續傳）
      </label>
    </div>

    <!-- 分塊上傳進度顯示 -->
    <div v-if="uploadMethod === 'chunked' && isUploading" class="chunk-progress">
      <div class="progress-details">
        <p>分塊進度：{{ completedChunks }} / {{ totalChunks }}</p>
        <p>上傳速度：{{ formatSpeed(uploadSpeed) }}</p>
        <p v-if="estimatedTime > 0">預估剩餘時間：{{ formatTime(estimatedTime) }}</p>
      </div>
      
      <!-- 網路狀態指示器 -->
      <div class="network-status">
        <span :class="networkQualityClass">{{ networkStatusText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { UploadQueueService } from '@/services/uploadQueue'

const uploadMethod = ref<'standard' | 'chunked'>('standard')
const uploadQueue = ref<UploadQueueService | null>(null)

// 自動選擇上傳方式
const autoSelectUploadMethod = (files: File[]) => {
  const largeFiles = files.filter(file => file.size > 50 * 1024 * 1024) // 50MB
  if (largeFiles.length > 0) {
    uploadMethod.value = 'chunked'
    showAdvancedOptions.value = true
  }
}

// 上傳處理
const handleUpload = async () => {
  if (uploadMethod.value === 'chunked') {
    await handleChunkedUpload()
  } else {
    await handleStandardUpload()
  }
}

const handleChunkedUpload = async () => {
  if (!uploadQueue.value) {
    uploadQueue.value = new UploadQueueService()
    uploadQueue.value.addEventListener(handleUploadEvent)
  }
  
  await uploadQueue.value.addFiles(selectedFiles.value)
}
</script>
```

##### 3.2 FileUploader 組件更新
**文件位置：** `frontend/src/components/FileUploader.vue`

```vue
<template>
  <div class="file-uploader">
    <!-- 現有拖拽上傳區域 -->
    <div 
      class="drop-zone"
      :class="{ 'drag-over': isDragOver, 'chunked-mode': useChunkedUpload }"
      @drop="handleDrop"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
    >
      <div class="upload-icon">
        <Icon :name="useChunkedUpload ? 'upload-cloud' : 'upload'" />
      </div>
      
      <h3>{{ uploadTitle }}</h3>
      <p>{{ uploadDescription }}</p>
      
      <!-- 上傳方式說明 -->
      <div v-if="useChunkedUpload" class="chunked-info">
        <ul>
          <li>✅ 支援大檔案上傳</li>
          <li>✅ 斷點續傳功能</li>
          <li>✅ 網路中斷自動恢復</li>
          <li>✅ 智能重試機制</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const useChunkedUpload = computed(() => {
  // 根據檔案大小或用戶設定決定是否使用分塊上傳
  return selectedFiles.value.some(file => file.size > 20 * 1024 * 1024) || 
         userPreferences.value.alwaysUseChunkedUpload
})

const uploadTitle = computed(() => {
  return useChunkedUpload.value 
    ? '拖拽檔案到此處（分塊上傳）' 
    : '拖拽檔案到此處'
})

const uploadDescription = computed(() => {
  return useChunkedUpload.value
    ? '大檔案將使用分塊上傳，支援斷點續傳'
    : '支援多檔案同時上傳，單檔最大 100MB'
})
</script>
```

##### 3.3 設定頁面新增選項
**文件位置：** `frontend/src/views/SettingsView.vue`

```vue
<template>
  <div class="settings-section">
    <h3>上傳設定</h3>
    
    <div class="setting-item">
      <label>
        <input 
          type="checkbox" 
          v-model="settings.alwaysUseChunkedUpload"
          @change="saveSettings"
        />
        總是使用分塊上傳（推薦用於不穩定網路環境）
      </label>
    </div>
    
    <div class="setting-item">
      <label>分塊大小：</label>
      <select v-model="settings.chunkSize" @change="saveSettings">
        <option :value="1 * 1024 * 1024">1 MB（慢速網路）</option>
        <option :value="5 * 1024 * 1024">5 MB（推薦）</option>
        <option :value="10 * 1024 * 1024">10 MB（高速網路）</option>
      </select>
    </div>
    
    <div class="setting-item">
      <label>
        <input 
          type="checkbox" 
          v-model="settings.autoResumeUploads"
          @change="saveSettings"
        />
        自動恢復中斷的上傳
      </label>
    </div>
  </div>
</template>
```

##### 3.4 現有上傳頁面整合
**文件位置：** `frontend/src/views/UploadView.vue`

- 保持現有的簡潔介面
- 在背景智能選擇上傳方式
- 大檔案自動啟用分塊上傳
- 提供進度恢復功能

#### ✅ 驗收標準
- [ ] 用戶可以選擇上傳方式
- [ ] 大檔案自動使用分塊上傳
- [ ] 分塊上傳進度正確顯示
- [ ] 設定選項正常工作
- [ ] 現有上傳流程不受影響

---

## 📅 實施時程

| 階段 | 預計時間 | 負責人 | 狀態 |
|------|----------|--------|------|
| 認證整合 | 2-3小時 | Claude | ⏳ 進行中 |
| 數據庫遷移 | 1小時 | Claude | ✅ 已完成 |
| UI優化 | 4-5小時 | Claude | ⏳ 待開始 |
| 整合測試 | 2小時 | Claude | ⏳ 待開始 |

## 🔧 技術依賴

### 前端依賴
- 現有的認證系統 (`useAuthStore`)
- API 客戶端配置 (`api/index.ts`)
- 現有的上傳組件

### 後端依賴
- SQLite 數據庫
- JWT 認證中間件
- 現有的檔案上傳處理器

## 🚨 風險評估

### 低風險
- 認證整合 - 使用現有認證機制
- 數據庫遷移 - 非破壞性變更

### 中風險
- UI整合 - 需要確保不影響現有功能
- 用戶體驗 - 需要提供清晰的上傳方式選擇

### 風險緩解
- 分階段實施，每階段充分測試
- 保留現有上傳方式作為備案
- 提供用戶設定選項

## 📊 成功指標

1. **功能指標**
   - 分塊上傳成功率 > 95%
   - 大檔案（>50MB）上傳成功率提升
   - 網路中斷恢復成功率 > 90%

2. **性能指標**
   - 上傳速度不低於傳統方式
   - 記憶體使用量合理
   - CPU 佔用率穩定

3. **用戶體驗指標**
   - 介面操作流暢
   - 進度顯示準確
   - 錯誤提示清晰

## 🧪 測試計畫

### 階段一：認證整合測試
```bash
# 1. 啟動開發環境
podman-compose down && podman-compose up -d

# 2. 前端建構
npm run build

# 3. 測試認證 API
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# 4. 測試分塊上傳認證
curl -X POST http://localhost:8080/api/files/chunk-init \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.txt","fileSize":1024}'
```

### 階段二：功能完整性測試
```bash
# 測試場景
1. 小檔案分塊上傳（< 5MB）
2. 大檔案分塊上傳（> 50MB）
3. 網路中斷恢復測試
4. 並發上傳測試
5. 不同檔案類型測試
```

### 階段三：MCP 操作測試
```bash
# MCP 測試檢查清單
- [ ] Claude Code 工具正常運作
- [ ] 檔案讀寫操作無誤
- [ ] 容器管理命令執行成功
- [ ] API 測試工具可正常使用
- [ ] 網路請求功能正常
```

## 📋 實施檢查清單

### 認證整合 ✅ **已完成**
- [x] 前端 API 客戶端更新 (`api/index.ts`)
- [x] 認證 token 傳遞機制實施
- [x] 分塊上傳 API 認證測試通過
- [x] ChunkUploader 服務整合完成

### 數據庫遷移 ✅ **已完成**
- [x] `chunk_sessions` 表創建完成
- [x] 自動遷移系統正常運作
- [x] 數據庫結構驗證通過
- [x] 後端服務正常訪問新表

### UI優化 📋 **待實施**
- [ ] UploadModal 組件增強
- [ ] FileUploader 組件更新
- [ ] 設定頁面選項新增
- [ ] 現有上傳頁面整合
- [ ] 用戶體驗優化

### 整合測試 📋 **待實施**
- [ ] 端到端上傳測試
- [ ] 效能基準測試
- [ ] 錯誤處理測試
- [ ] 用戶介面測試
- [ ] 跨瀏覽器相容性測試

## 🚨 重要提醒

### 遵循 CLAUDE.md 指令
- ✅ 使用 Podman 容器管理
- ✅ 保護 `data/` 和 `uploads/` 目錄
- ✅ 執行完整的認證檢查
- ✅ 使用 TodoWrite 追蹤任務進度

### 安全性檢查
- ✅ 所有 API 端點都有認證保護
- ✅ 檔案上傳路徑驗證
- ✅ 檔案大小和類型限制
- ✅ 分塊完整性驗證

## 📚 相關文件

- [批量上傳功能一致性問題](./batch-upload-consistency-issue.md)
- [分塊上傳 API 規格](./chunk-upload-api-specification.md)（待建立）
- [用戶手冊：大檔案上傳指南](./user-guide-large-file-upload.md)（待建立）
- [分塊上傳測試報告](./chunk-upload-test-report.md)（待建立）

---

## 🔄 更新紀錄

| 日期 | 版本 | 更新內容 | 作者 |
|------|------|----------|------|
| 2025-06-15 | 1.0.0 | 初始整合計畫文檔 | Claude |
| 2025-06-15 | 1.1.0 | 新增測試計畫和實施檢查清單 | Claude |
| 2025-06-15 | 1.2.0 | 更新認證整合和數據庫遷移狀態為已完成 | Claude |

---

## 📞 支援和聯絡

如有任何問題或需要協助，請聯絡：
- **系統管理員**：<94work.net@gmail.com> (劉程維)
- **技術文檔**：查看 `docs/` 目錄下的相關文件
- **問題回報**：通過專案 issue 追蹤系統

---

**注意：此計畫文檔將根據實施進度持續更新，確保整合工作的順利進行。所有變更都會記錄在更新紀錄中，以便追蹤專案進展。**