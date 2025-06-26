# LINE 信徒上傳管理界面設計

## 🎯 需求分析

在管理界面的檔案管理中新增 "LINE信徒上傳" 區域，按照用戶帳號分類顯示上傳的檔案，方便管理員查看和管理。

## 🗂️ 檔案組織結構

### 虛擬路徑設計
```
/LINE信徒上傳/
├── 個人上傳/
│   ├── 張三 (LINE_U123456789)/
│   │   ├── 2024-06/
│   │   │   ├── 主日聚會_20240615.jpg
│   │   │   └── 團契活動_20240620.jpg
│   │   └── 2024-07/
│   │       └── 夏令營_20240705.jpg
│   └── 李四 (LINE_U987654321)/
│       └── 2024-06/
│           └── 詩歌敬拜_20240618.jpg
└── 群組上傳/
    ├── 青年團契群組/
    │   ├── 張三上傳/
    │   │   └── 團契分享_20240610.jpg
    │   └── 王五上傳/
    │       └── 讀經心得_20240612.jpg
    └── 長老會議群組/
        └── 長老甲上傳/
            └── 會議記錄_20240614.jpg
```

## 🔧 後端 API 設計

### 1. LINE 檔案分類 API

```go
// backend/internal/api/handlers/admin_line_handler.go
package handlers

import (
    "net/http"
    "strconv"
    "github.com/gin-gonic/gin"
    "memoryark/internal/services"
)

type AdminLineHandler struct {
    lineService *services.LineService
    fileService *services.FileService
}

func NewAdminLineHandler(lineService *services.LineService, fileService *services.FileService) *AdminLineHandler {
    return &AdminLineHandler{
        lineService: lineService,
        fileService: fileService,
    }
}

// 取得 LINE 用戶分類檔案結構
func (h *AdminLineHandler) GetLineFileStructure(c *gin.Context) {
    structure, err := h.lineService.GetFileStructure()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "QUERY_FAILED",
                "message": "查詢檔案結構失敗",
            },
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    structure,
    })
}

// 取得特定用戶的上傳檔案
func (h *AdminLineHandler) GetUserFiles(c *gin.Context) {
    lineUserId := c.Param("userId")
    page := h.parseIntParam(c.Query("page"), 1)
    pageSize := h.parseIntParam(c.Query("pageSize"), 20)
    uploadType := c.Query("type") // "personal" 或 "group"

    offset := (page - 1) * pageSize

    files, total, err := h.lineService.GetUserFilesWithDetails(lineUserId, uploadType, pageSize, offset)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "QUERY_FAILED",
                "message": "查詢用戶檔案失敗",
            },
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "files": files,
            "pagination": gin.H{
                "page":       page,
                "pageSize":   pageSize,
                "total":      total,
                "totalPages": (total + int64(pageSize) - 1) / int64(pageSize),
            },
        },
    })
}

// 取得 LINE 上傳統計
func (h *AdminLineHandler) GetLineUploadStats(c *gin.Context) {
    stats, err := h.lineService.GetDetailedStats()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "STATS_FAILED",
                "message": "統計資料取得失敗",
            },
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": stats,
    })
}

// 批量管理 LINE 檔案
func (h *AdminLineHandler) BatchManageFiles(c *gin.Context) {
    var req struct {
        Action  string   `json:"action"`  // "move", "delete", "categorize"
        FileIds []string `json:"fileIds"` // UUID v7 格式
        Target  string   `json:"target"`  // 目標分類或路徑
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "INVALID_REQUEST",
                "message": "請求格式錯誤",
            },
        })
        return
    }

    result, err := h.lineService.BatchManageFiles(req.Action, req.FileIds, req.Target)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "OPERATION_FAILED",
                "message": err.Error(),
            },
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    result,
    })
}

func (h *AdminLineHandler) parseIntParam(param string, defaultValue int) int {
    if param == "" {
        return defaultValue
    }
    val, err := strconv.Atoi(param)
    if err != nil {
        return defaultValue
    }
    return val
}
```

### 2. LINE 服務擴展

```go
// backend/internal/services/line_service.go 新增方法

type LineFileStructure struct {
    PersonalUploads []LineUserNode `json:"personalUploads"`
    GroupUploads    []LineGroupNode `json:"groupUploads"`
    TotalFiles      int64 `json:"totalFiles"`
    TotalUsers      int64 `json:"totalUsers"`
    TotalGroups     int64 `json:"totalGroups"`
}

type LineUserNode struct {
    LineUserId   string           `json:"lineUserId"`
    LineUserName string           `json:"lineUserName"`
    FileCount    int64            `json:"fileCount"`
    LastUpload   time.Time        `json:"lastUpload"`
    MonthlyStats []MonthlyStats   `json:"monthlyStats"`
}

type LineGroupNode struct {
    LineGroupId   string         `json:"lineGroupId"`
    LineGroupName string         `json:"lineGroupName"`
    FileCount     int64          `json:"fileCount"`
    Users         []LineUserNode `json:"users"`
    LastUpload    time.Time      `json:"lastUpload"`
}

type MonthlyStats struct {
    Month     string `json:"month"`     // "2024-06"
    FileCount int64  `json:"fileCount"`
    FileSize  int64  `json:"fileSize"`
}

func (s *LineService) GetFileStructure() (*LineFileStructure, error) {
    structure := &LineFileStructure{}

    // 1. 取得個人上傳統計
    personalStats, err := s.getPersonalUploadStats()
    if err != nil {
        return nil, err
    }
    structure.PersonalUploads = personalStats

    // 2. 取得群組上傳統計
    groupStats, err := s.getGroupUploadStats()
    if err != nil {
        return nil, err
    }
    structure.GroupUploads = groupStats

    // 3. 取得總體統計
    structure.TotalFiles, _ = s.getTotalFileCount()
    structure.TotalUsers, _ = s.getTotalUserCount()
    structure.TotalGroups, _ = s.getTotalGroupCount()

    return structure, nil
}

func (s *LineService) getPersonalUploadStats() ([]LineUserNode, error) {
    var users []LineUserNode

    // 查詢個人上傳（沒有群組ID的記錄）
    rows, err := s.db.Raw(`
        SELECT 
            line_user_id,
            line_user_name,
            COUNT(*) as file_count,
            MAX(created_at) as last_upload
        FROM line_upload_records 
        WHERE (line_group_id IS NULL OR line_group_id = '')
        GROUP BY line_user_id, line_user_name
        ORDER BY last_upload DESC
    `).Rows()
    
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    for rows.Next() {
        var user LineUserNode
        err := rows.Scan(&user.LineUserId, &user.LineUserName, &user.FileCount, &user.LastUpload)
        if err != nil {
            continue
        }

        // 取得該用戶的月份統計
        monthlyStats, err := s.getUserMonthlyStats(user.LineUserId, "")
        if err == nil {
            user.MonthlyStats = monthlyStats
        }

        users = append(users, user)
    }

    return users, nil
}

func (s *LineService) getGroupUploadStats() ([]LineGroupNode, error) {
    var groups []LineGroupNode

    // 查詢群組統計
    rows, err := s.db.Raw(`
        SELECT 
            line_group_id,
            line_group_name,
            COUNT(*) as file_count,
            MAX(created_at) as last_upload
        FROM line_upload_records 
        WHERE line_group_id IS NOT NULL AND line_group_id != ''
        GROUP BY line_group_id, line_group_name
        ORDER BY last_upload DESC
    `).Rows()
    
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    for rows.Next() {
        var group LineGroupNode
        err := rows.Scan(&group.LineGroupId, &group.LineGroupName, &group.FileCount, &group.LastUpload)
        if err != nil {
            continue
        }

        // 取得該群組的用戶統計
        groupUsers, err := s.getGroupUserStats(group.LineGroupId)
        if err == nil {
            group.Users = groupUsers
        }

        groups = append(groups, group)
    }

    return groups, nil
}

func (s *LineService) getUserMonthlyStats(lineUserId, lineGroupId string) ([]MonthlyStats, error) {
    var stats []MonthlyStats

    query := `
        SELECT 
            strftime('%Y-%m', l.created_at) as month,
            COUNT(*) as file_count,
            COALESCE(SUM(f.file_size), 0) as file_size
        FROM line_upload_records l
        LEFT JOIN files f ON l.file_id = f.id
        WHERE l.line_user_id = ?
    `
    
    args := []interface{}{lineUserId}
    
    if lineGroupId != "" {
        query += " AND l.line_group_id = ?"
        args = append(args, lineGroupId)
    } else {
        query += " AND (l.line_group_id IS NULL OR l.line_group_id = '')"
    }
    
    query += " GROUP BY strftime('%Y-%m', l.created_at) ORDER BY month DESC LIMIT 12"

    rows, err := s.db.Raw(query, args...).Rows()
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    for rows.Next() {
        var stat MonthlyStats
        err := rows.Scan(&stat.Month, &stat.FileCount, &stat.FileSize)
        if err != nil {
            continue
        }
        stats = append(stats, stat)
    }

    return stats, nil
}

func (s *LineService) GetUserFilesWithDetails(lineUserId, uploadType string, limit, offset int) ([]LineFileDetail, int64, error) {
    var files []LineFileDetail
    var total int64

    // 建立查詢條件
    query := s.db.Table("line_upload_records l").
        Select(`
            l.id as record_id,
            l.line_user_id,
            l.line_user_name,
            l.line_group_id,
            l.line_group_name,
            l.line_message_id,
            l.message_type,
            l.created_at as upload_time,
            f.id as file_id,
            f.name as file_name,
            f.original_name,
            f.virtual_path,
            f.file_size,
            f.mime_type,
            f.description,
            f.tags
        `).
        Joins("LEFT JOIN files f ON l.file_id = f.id").
        Where("l.line_user_id = ?", lineUserId)

    // 根據上傳類型過濾
    if uploadType == "personal" {
        query = query.Where("(l.line_group_id IS NULL OR l.line_group_id = '')")
    } else if uploadType == "group" {
        query = query.Where("l.line_group_id IS NOT NULL AND l.line_group_id != ''")
    }

    // 計算總數
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // 查詢檔案列表
    rows, err := query.Order("l.created_at DESC").
        Limit(limit).
        Offset(offset).
        Rows()
    
    if err != nil {
        return nil, 0, err
    }
    defer rows.Close()

    for rows.Next() {
        var file LineFileDetail
        err := rows.Scan(
            &file.RecordId, &file.LineUserId, &file.LineUserName,
            &file.LineGroupId, &file.LineGroupName, &file.LineMessageId,
            &file.MessageType, &file.UploadTime,
            &file.FileId, &file.FileName, &file.OriginalName,
            &file.VirtualPath, &file.FileSize, &file.MimeType,
            &file.Description, &file.Tags,
        )
        if err != nil {
            continue
        }
        files = append(files, file)
    }

    return files, total, nil
}

type LineFileDetail struct {
    RecordId      string    `json:"recordId"`
    LineUserId    string    `json:"lineUserId"`
    LineUserName  string    `json:"lineUserName"`
    LineGroupId   *string   `json:"lineGroupId"`
    LineGroupName *string   `json:"lineGroupName"`
    LineMessageId string    `json:"lineMessageId"`
    MessageType   string    `json:"messageType"`
    UploadTime    time.Time `json:"uploadTime"`
    FileId        uint      `json:"fileId"`
    FileName      string    `json:"fileName"`
    OriginalName  string    `json:"originalName"`
    VirtualPath   string    `json:"virtualPath"`
    FileSize      int64     `json:"fileSize"`
    MimeType      string    `json:"mimeType"`
    Description   string    `json:"description"`
    Tags          string    `json:"tags"`
}
```

## 🎨 前端界面設計

### 1. 管理界面主頁面

```vue
<!-- frontend/src/views/admin/LineFileManagement.vue -->
<template>
  <div class="line-file-management">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="text-2xl font-bold text-gray-900">LINE 信徒上傳管理</h1>
      <div class="header-actions">
        <button @click="refreshData" class="btn-primary">
          <RefreshIcon class="w-4 h-4 mr-2" />
          重新整理
        </button>
        <button @click="exportData" class="btn-secondary">
          <DownloadIcon class="w-4 h-4 mr-2" />
          匯出報告
        </button>
      </div>
    </div>

    <!-- 統計卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon bg-blue-100">
          <PhotoIcon class="w-6 h-6 text-blue-600" />
        </div>
        <div class="stat-content">
          <h3 class="stat-title">總檔案數</h3>
          <p class="stat-value">{{ stats.totalFiles }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon bg-green-100">
          <UsersIcon class="w-6 h-6 text-green-600" />
        </div>
        <div class="stat-content">
          <h3 class="stat-title">活躍用戶</h3>
          <p class="stat-value">{{ stats.totalUsers }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon bg-purple-100">
          <UserGroupIcon class="w-6 h-6 text-purple-600" />
        </div>
        <div class="stat-content">
          <h3 class="stat-title">活躍群組</h3>
          <p class="stat-value">{{ stats.totalGroups }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon bg-orange-100">
          <CalendarIcon class="w-6 h-6 text-orange-600" />
        </div>
        <div class="stat-content">
          <h3 class="stat-title">本月上傳</h3>
          <p class="stat-value">{{ stats.monthlyUploads }}</p>
        </div>
      </div>
    </div>

    <!-- 檔案分類瀏覽 -->
    <div class="file-structure">
      <div class="section-tabs">
        <button 
          @click="activeTab = 'personal'"
          :class="['tab-button', { active: activeTab === 'personal' }]"
        >
          個人上傳 ({{ structure.personalUploads?.length || 0 }})
        </button>
        <button 
          @click="activeTab = 'group'"
          :class="['tab-button', { active: activeTab === 'group' }]"
        >
          群組上傳 ({{ structure.groupUploads?.length || 0 }})
        </button>
      </div>

      <!-- 個人上傳分類 -->
      <div v-if="activeTab === 'personal'" class="upload-section">
        <div class="user-grid">
          <div 
            v-for="user in structure.personalUploads" 
            :key="user.lineUserId"
            @click="selectUser(user)"
            class="user-card"
          >
            <div class="user-info">
              <div class="user-avatar">
                {{ user.lineUserName.charAt(0) }}
              </div>
              <div class="user-details">
                <h3 class="user-name">{{ user.lineUserName }}</h3>
                <p class="user-id">ID: {{ user.lineUserId }}</p>
                <p class="file-count">{{ user.fileCount }} 個檔案</p>
                <p class="last-upload">最後上傳: {{ formatDate(user.lastUpload) }}</p>
              </div>
            </div>
            
            <!-- 月份統計 -->
            <div class="monthly-stats">
              <div 
                v-for="stat in user.monthlyStats.slice(0, 3)" 
                :key="stat.month"
                class="month-stat"
              >
                <span class="month">{{ stat.month }}</span>
                <span class="count">{{ stat.fileCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 群組上傳分類 -->
      <div v-if="activeTab === 'group'" class="upload-section">
        <div class="group-list">
          <div 
            v-for="group in structure.groupUploads" 
            :key="group.lineGroupId"
            class="group-card"
          >
            <div class="group-header" @click="toggleGroup(group.lineGroupId)">
              <div class="group-info">
                <h3 class="group-name">{{ group.lineGroupName }}</h3>
                <p class="group-stats">
                  {{ group.fileCount }} 個檔案 · {{ group.users.length }} 位用戶
                </p>
                <p class="last-upload">最後上傳: {{ formatDate(group.lastUpload) }}</p>
              </div>
              <ChevronDownIcon 
                :class="['w-5 h-5 transition-transform', 
                        { 'rotate-180': expandedGroups.includes(group.lineGroupId) }]" 
              />
            </div>
            
            <!-- 群組用戶列表 -->
            <div 
              v-if="expandedGroups.includes(group.lineGroupId)"
              class="group-users"
            >
              <div 
                v-for="user in group.users" 
                :key="`${group.lineGroupId}-${user.lineUserId}`"
                @click="selectUser(user, group)"
                class="group-user-item"
              >
                <div class="user-info">
                  <div class="user-avatar small">
                    {{ user.lineUserName.charAt(0) }}
                  </div>
                  <div class="user-details">
                    <h4 class="user-name">{{ user.lineUserName }}</h4>
                    <p class="file-count">{{ user.fileCount }} 個檔案</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 檔案詳情側邊欄 -->
    <FileSidebar 
      v-if="selectedUser"
      :user="selectedUser"
      :group="selectedGroup"
      @close="closeFileSidebar"
      @fileAction="handleFileAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { lineFileApi } from '@/api/lineFile'
import FileSidebar from '@/components/admin/FileSidebar.vue'
import { formatDate } from '@/utils/date'

// 圖示
import { 
  RefreshIcon, DownloadIcon, PhotoIcon, UsersIcon, 
  UserGroupIcon, CalendarIcon, ChevronDownIcon 
} from '@heroicons/vue/24/outline'

// 響應式數據
const activeTab = ref('personal')
const expandedGroups = ref<string[]>([])
const selectedUser = ref(null)
const selectedGroup = ref(null)
const structure = ref({})
const stats = ref({})
const loading = ref(false)

// 載入數據
const loadData = async () => {
  loading.value = true
  try {
    const [structureRes, statsRes] = await Promise.all([
      lineFileApi.getFileStructure(),
      lineFileApi.getStats()
    ])
    
    structure.value = structureRes.data
    stats.value = statsRes.data
  } catch (error) {
    console.error('載入數據失敗:', error)
  } finally {
    loading.value = false
  }
}

// 選擇用戶
const selectUser = (user: any, group?: any) => {
  selectedUser.value = user
  selectedGroup.value = group || null
}

// 關閉側邊欄
const closeFileSidebar = () => {
  selectedUser.value = null
  selectedGroup.value = null
}

// 切換群組展開狀態
const toggleGroup = (groupId: string) => {
  const index = expandedGroups.value.indexOf(groupId)
  if (index > -1) {
    expandedGroups.value.splice(index, 1)
  } else {
    expandedGroups.value.push(groupId)
  }
}

// 重新整理數據
const refreshData = () => {
  loadData()
}

// 匯出報告
const exportData = async () => {
  try {
    const response = await lineFileApi.exportReport()
    // 處理檔案下載
  } catch (error) {
    console.error('匯出失敗:', error)
  }
}

// 處理檔案操作
const handleFileAction = (action: string, files: any[]) => {
  console.log('檔案操作:', action, files)
  // 實作檔案操作邏輯
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.line-file-management {
  @apply p-6 bg-gray-50 min-h-screen;
}

.page-header {
  @apply flex justify-between items-center mb-6;
}

.header-actions {
  @apply flex space-x-3;
}

.btn-primary {
  @apply flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors;
}

.btn-secondary {
  @apply flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors;
}

.stats-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8;
}

.stat-card {
  @apply bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center;
}

.stat-icon {
  @apply p-3 rounded-lg mr-4;
}

.stat-title {
  @apply text-sm font-medium text-gray-600 mb-1;
}

.stat-value {
  @apply text-2xl font-bold text-gray-900;
}

.section-tabs {
  @apply flex border-b border-gray-200 mb-6;
}

.tab-button {
  @apply px-6 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 transition-colors;
}

.tab-button.active {
  @apply text-blue-600 border-blue-600;
}

.user-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.user-card {
  @apply bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md cursor-pointer transition-shadow;
}

.user-info {
  @apply flex items-start mb-4;
}

.user-avatar {
  @apply w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg mr-4;
}

.user-avatar.small {
  @apply w-8 h-8 text-sm mr-3;
}

.user-name {
  @apply font-semibold text-gray-900 mb-1;
}

.user-id {
  @apply text-xs text-gray-500 mb-1;
}

.file-count {
  @apply text-sm text-gray-600 mb-1;
}

.last-upload {
  @apply text-xs text-gray-500;
}

.monthly-stats {
  @apply flex space-x-2;
}

.month-stat {
  @apply flex flex-col items-center p-2 bg-gray-50 rounded text-xs;
}

.month {
  @apply text-gray-500 mb-1;
}

.count {
  @apply font-semibold text-gray-900;
}

.group-list {
  @apply space-y-4;
}

.group-card {
  @apply bg-white rounded-xl shadow-sm border border-gray-200;
}

.group-header {
  @apply flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50;
}

.group-name {
  @apply font-semibold text-gray-900 mb-2;
}

.group-stats {
  @apply text-sm text-gray-600 mb-1;
}

.group-users {
  @apply border-t border-gray-200 p-4 space-y-2;
}

.group-user-item {
  @apply flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer;
}
</style>
```

### 2. 檔案詳情側邊欄

```vue
<!-- frontend/src/components/admin/FileSidebar.vue -->
<template>
  <div class="file-sidebar">
    <div class="sidebar-header">
      <h2 class="text-lg font-semibold text-gray-900">
        {{ user.lineUserName }} 的上傳檔案
      </h2>
      <button @click="$emit('close')" class="close-button">
        <XMarkIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- 用戶資訊 -->
    <div class="user-summary">
      <div class="user-avatar">
        {{ user.lineUserName.charAt(0) }}
      </div>
      <div class="user-info">
        <h3 class="user-name">{{ user.lineUserName }}</h3>
        <p class="user-id">LINE ID: {{ user.lineUserId }}</p>
        <p v-if="group" class="group-name">群組: {{ group.lineGroupName }}</p>
        <div class="user-stats">
          <span class="stat">{{ user.fileCount }} 個檔案</span>
          <span class="stat">最後上傳: {{ formatDate(user.lastUpload) }}</span>
        </div>
      </div>
    </div>

    <!-- 檔案篩選 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <button 
          @click="fileFilter = 'all'"
          :class="['filter-tab', { active: fileFilter === 'all' }]"
        >
          全部
        </button>
        <button 
          @click="fileFilter = 'image'"
          :class="['filter-tab', { active: fileFilter === 'image' }]"
        >
          圖片
        </button>
        <button 
          @click="fileFilter = 'video'"
          :class="['filter-tab', { active: fileFilter === 'video' }]"
        >
          影片
        </button>
      </div>
      
      <div class="search-box">
        <input 
          v-model="searchKeyword"
          placeholder="搜尋檔案名稱..."
          class="search-input"
        />
      </div>
    </div>

    <!-- 檔案列表 -->
    <div class="file-list">
      <div 
        v-for="file in filteredFiles" 
        :key="file.recordId"
        class="file-item"
        :class="{ selected: selectedFiles.includes(file.recordId) }"
        @click="toggleFileSelection(file.recordId)"
      >
        <div class="file-preview">
          <img 
            v-if="file.mimeType.startsWith('image/')"
            :src="getFilePreviewUrl(file.fileId)"
            :alt="file.fileName"
            class="preview-image"
          />
          <div v-else class="preview-placeholder">
            <DocumentIcon class="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div class="file-info">
          <h4 class="file-name">{{ file.originalName }}</h4>
          <p class="file-details">
            {{ formatFileSize(file.fileSize) }} · 
            {{ formatDate(file.uploadTime) }}
          </p>
          <p class="file-path">{{ file.virtualPath }}</p>
        </div>
        
        <div class="file-actions">
          <button @click.stop="previewFile(file)" class="action-button">
            <EyeIcon class="w-4 h-4" />
          </button>
          <button @click.stop="downloadFile(file)" class="action-button">
            <ArrowDownTrayIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 批量操作 -->
    <div v-if="selectedFiles.length > 0" class="batch-actions">
      <p class="selected-count">已選擇 {{ selectedFiles.length }} 個檔案</p>
      <div class="action-buttons">
        <button @click="batchDownload" class="batch-button download">
          <ArrowDownTrayIcon class="w-4 h-4 mr-2" />
          批量下載
        </button>
        <button @click="batchMove" class="batch-button move">
          <FolderIcon class="w-4 h-4 mr-2" />
          移動
        </button>
        <button @click="batchDelete" class="batch-button delete">
          <TrashIcon class="w-4 h-4 mr-2" />
          刪除
        </button>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>載入檔案中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { lineFileApi } from '@/api/lineFile'
import { formatDate, formatFileSize } from '@/utils/format'

// 圖示
import { 
  XMarkIcon, DocumentIcon, EyeIcon, ArrowDownTrayIcon,
  FolderIcon, TrashIcon
} from '@heroicons/vue/24/outline'

// Props
const props = defineProps<{
  user: any
  group?: any
}>()

// Emits
const emit = defineEmits<{
  close: []
  fileAction: [action: string, files: any[]]
}>()

// 響應式數據
const files = ref([])
const loading = ref(false)
const fileFilter = ref('all')
const searchKeyword = ref('')
const selectedFiles = ref<string[]>([])
const currentPage = ref(1)
const pageSize = 20

// 計算屬性
const filteredFiles = computed(() => {
  let result = files.value

  // 按檔案類型篩選
  if (fileFilter.value !== 'all') {
    result = result.filter(file => {
      if (fileFilter.value === 'image') {
        return file.mimeType.startsWith('image/')
      } else if (fileFilter.value === 'video') {
        return file.mimeType.startsWith('video/')
      }
      return true
    })
  }

  // 按關鍵字搜尋
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(file => 
      file.originalName.toLowerCase().includes(keyword) ||
      file.fileName.toLowerCase().includes(keyword)
    )
  }

  return result
})

// 載入檔案
const loadFiles = async () => {
  loading.value = true
  try {
    const uploadType = props.group ? 'group' : 'personal'
    const response = await lineFileApi.getUserFiles(
      props.user.lineUserId, 
      uploadType,
      { page: currentPage.value, pageSize }
    )
    
    files.value = response.data.files
  } catch (error) {
    console.error('載入檔案失敗:', error)
  } finally {
    loading.value = false
  }
}

// 切換檔案選擇
const toggleFileSelection = (fileId: string) => {
  const index = selectedFiles.value.indexOf(fileId)
  if (index > -1) {
    selectedFiles.value.splice(index, 1)
  } else {
    selectedFiles.value.push(fileId)
  }
}

// 預覽檔案
const previewFile = (file: any) => {
  // 實作檔案預覽邏輯
  console.log('預覽檔案:', file)
}

// 下載檔案
const downloadFile = (file: any) => {
  // 實作檔案下載邏輯
  console.log('下載檔案:', file)
}

// 批量操作
const batchDownload = () => {
  const selectedFileList = files.value.filter(f => selectedFiles.value.includes(f.recordId))
  emit('fileAction', 'download', selectedFileList)
}

const batchMove = () => {
  const selectedFileList = files.value.filter(f => selectedFiles.value.includes(f.recordId))
  emit('fileAction', 'move', selectedFileList)
}

const batchDelete = () => {
  const selectedFileList = files.value.filter(f => selectedFiles.value.includes(f.recordId))
  emit('fileAction', 'delete', selectedFileList)
}

// 取得檔案預覽 URL
const getFilePreviewUrl = (fileId: number) => {
  return `/api/files/${fileId}/preview`
}

// 監聽用戶變化
watch(() => props.user, () => {
  if (props.user) {
    loadFiles()
    selectedFiles.value = []
  }
}, { immediate: true })

onMounted(() => {
  if (props.user) {
    loadFiles()
  }
})
</script>

<style scoped>
/* 樣式定義 */
.file-sidebar {
  @apply fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col;
}

.sidebar-header {
  @apply flex justify-between items-center p-6 border-b border-gray-200;
}

.close-button {
  @apply p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors;
}

.user-summary {
  @apply flex items-start p-6 border-b border-gray-200;
}

.user-avatar {
  @apply w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg mr-4;
}

.user-name {
  @apply font-semibold text-gray-900 mb-1;
}

.user-id {
  @apply text-sm text-gray-500 mb-1;
}

.group-name {
  @apply text-sm text-purple-600 mb-2;
}

.user-stats {
  @apply flex flex-col space-y-1;
}

.stat {
  @apply text-xs text-gray-500;
}

.filter-section {
  @apply p-4 border-b border-gray-200;
}

.filter-tabs {
  @apply flex space-x-1 mb-3;
}

.filter-tab {
  @apply px-3 py-1 text-sm text-gray-600 rounded-md hover:bg-gray-100 transition-colors;
}

.filter-tab.active {
  @apply bg-blue-100 text-blue-600;
}

.search-input {
  @apply w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.file-list {
  @apply flex-1 overflow-y-auto p-4;
}

.file-item {
  @apply flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer mb-2 border border-transparent;
}

.file-item.selected {
  @apply bg-blue-50 border-blue-200;
}

.file-preview {
  @apply w-12 h-12 mr-3 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center;
}

.preview-image {
  @apply w-full h-full object-cover;
}

.preview-placeholder {
  @apply flex items-center justify-center w-full h-full;
}

.file-info {
  @apply flex-1 min-w-0;
}

.file-name {
  @apply font-medium text-gray-900 truncate mb-1;
}

.file-details {
  @apply text-xs text-gray-500 mb-1;
}

.file-path {
  @apply text-xs text-gray-400 truncate;
}

.file-actions {
  @apply flex space-x-1;
}

.action-button {
  @apply p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors;
}

.batch-actions {
  @apply p-4 border-t border-gray-200 bg-gray-50;
}

.selected-count {
  @apply text-sm text-gray-600 mb-3;
}

.action-buttons {
  @apply flex space-x-2;
}

.batch-button {
  @apply flex items-center px-3 py-2 text-sm rounded-lg transition-colors;
}

.batch-button.download {
  @apply bg-blue-100 text-blue-600 hover:bg-blue-200;
}

.batch-button.move {
  @apply bg-green-100 text-green-600 hover:bg-green-200;
}

.batch-button.delete {
  @apply bg-red-100 text-red-600 hover:bg-red-200;
}

.loading {
  @apply flex flex-col items-center justify-center p-8 text-gray-500;
}

.loading-spinner {
  @apply w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-2;
}
</style>
```

### 3. API 整合

```typescript
// frontend/src/api/lineFile.ts
import { apiClient } from './client'

export const lineFileApi = {
  // 取得檔案結構
  getFileStructure() {
    return apiClient.get('/admin/line/structure')
  },

  // 取得統計資料
  getStats() {
    return apiClient.get('/admin/line/stats')
  },

  // 取得用戶檔案
  getUserFiles(lineUserId: string, uploadType: string, pagination: any) {
    return apiClient.get(`/admin/line/users/${lineUserId}/files`, {
      params: {
        type: uploadType,
        ...pagination
      }
    })
  },

  // 批量操作檔案
  batchManageFiles(action: string, fileIds: string[], target?: string) {
    return apiClient.post('/admin/line/batch-manage', {
      action,
      fileIds,
      target
    })
  },

  // 匯出報告
  exportReport() {
    return apiClient.get('/admin/line/export', {
      responseType: 'blob'
    })
  }
}
```

## 🚀 路由配置

### 1. 後端路由

```go
// backend/internal/api/router.go 更新
func SetupRouter(cfg *config.Config, db *gorm.DB) *gin.Engine {
    // ... 原有程式碼
    
    // 管理員 LINE 檔案管理路由
    adminGroup := api.Group("/admin")
    adminGroup.Use(middleware.RequireRole("admin"))
    {
        lineAdmin := adminGroup.Group("/line")
        {
            lineAdmin.GET("/structure", adminLineHandler.GetLineFileStructure)
            lineAdmin.GET("/stats", adminLineHandler.GetLineUploadStats)
            lineAdmin.GET("/users/:userId/files", adminLineHandler.GetUserFiles)
            lineAdmin.GET("/groups/:groupId/files", adminLineHandler.GetGroupFiles)
            lineAdmin.POST("/batch-manage", adminLineHandler.BatchManageFiles)
            lineAdmin.GET("/export", adminLineHandler.ExportReport)
        }
    }
    
    return r
}
```

### 2. 前端路由

```typescript
// frontend/src/router/admin.ts
export const adminRoutes = [
  // ... 原有路由
  {
    path: '/admin/line-files',
    name: 'AdminLineFiles',
    component: () => import('@/views/admin/LineFileManagement.vue'),
    meta: {
      title: 'LINE 信徒上傳管理',
      requiresAuth: true,
      requiresAdmin: true
    }
  }
]
```

### 3. 管理員選單更新

```vue
<!-- frontend/src/components/admin/AdminSidebar.vue 更新 -->
<template>
  <nav class="admin-sidebar">
    <!-- ... 原有選單項目 -->
    
    <div class="menu-section">
      <h3 class="section-title">檔案管理</h3>
      <router-link to="/admin/files" class="menu-item">
        <FolderIcon class="w-5 h-5" />
        檔案管理
      </router-link>
      <router-link to="/admin/line-files" class="menu-item">
        <PhotoIcon class="w-5 h-5" />
        LINE 信徒上傳
      </router-link>
      <router-link to="/admin/categories" class="menu-item">
        <TagIcon class="w-5 h-5" />
        分類管理
      </router-link>
    </div>
  </nav>
</template>
```

## 📊 功能特色總結

### ✅ 核心功能
1. **分類瀏覽** - 按個人/群組分類檢視
2. **用戶檔案** - 查看特定用戶的所有上傳
3. **統計資訊** - 上傳數量、活躍用戶、月份趨勢
4. **批量操作** - 移動、刪除、下載多個檔案
5. **搜尋篩選** - 按檔案名稱、類型篩選

### 🎨 介面設計
1. **直觀導航** - 清楚的分頁和分類
2. **響應式布局** - 支援桌面和平板
3. **即時統計** - 動態顯示數據
4. **便捷操作** - 一鍵批量管理

這個設計讓管理員能夠輕鬆管理所有 LINE 用戶上傳的檔案，提供完整的可視性和控制能力！
