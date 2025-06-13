<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '@/api/admin'
import type { User } from '@/types/auth'

const users = ref<User[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedRole = ref('all')

const roles = [
  { value: 'all', label: '全部角色' },
  { value: 'admin', label: '管理員' },
  { value: 'user', label: '一般用戶' }
]

const filteredUsers = computed(() => {
  // 確保 users.value 是陣列
  if (!Array.isArray(users.value)) {
    return []
  }
  
  let filtered = users.value

  if (searchQuery.value) {
    filtered = filtered.filter(user => 
      user.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  if (selectedRole.value !== 'all') {
    filtered = filtered.filter(user => user.role === selectedRole.value)
  }

  return filtered
})

const loadUsers = async () => {
  isLoading.value = true
  try {
    const response = await adminApi.getUsers()
    users.value = response.data?.users || []
  } catch (error) {
    console.error('載入用戶列表失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const updateUserRole = async (userId: number, newRole: string) => {
  try {
    await adminApi.updateUserRole(userId, newRole)
    await loadUsers() // 重新載入列表
  } catch (error) {
    console.error('更新用戶角色失敗:', error)
  }
}

const deleteUser = async (userId: number) => {
  if (!confirm('確定要刪除此用戶嗎？此操作無法復原。')) {
    return
  }

  try {
    // TODO: 實作刪除用戶功能
    console.log('刪除用戶功能尚未實作', userId)
    await loadUsers() // 重新載入列表
  } catch (error) {
    console.error('刪除用戶失敗:', error)
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
/* 管理員面板樣式 */
.admin-panel {
  background: var(--bg-elevated);
  border-color: var(--border-light);
}

/* 輸入框樣式 */
.admin-input {
  background: var(--bg-primary);
  border: 1px solid var(--border-medium);
  color: var(--text-primary);
  transition: all var(--duration-fast) var(--ease-smooth);
}

.admin-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* 表格樣式 */
.admin-table {
  border-collapse: separate;
  border-spacing: 0;
}

.admin-table-header {
  background: var(--bg-secondary);
}

.admin-table-th {
  color: var(--text-tertiary);
}

.admin-table-body {
  background: var(--bg-elevated);
}

.admin-table-row {
  border-top: 1px solid var(--border-light);
  transition: background-color var(--duration-fast) var(--ease-smooth);
}

.admin-table-row:hover {
  background: var(--bg-secondary);
}

/* 頭像樣式 */
.admin-avatar {
  background: var(--color-primary-light);
}

.admin-avatar-text {
  color: var(--color-primary-dark);
}

/* 選擇框樣式 */
.admin-select {
  background: var(--bg-primary);
  border: 1px solid var(--border-medium);
  color: var(--text-primary);
  transition: all var(--duration-fast) var(--ease-smooth);
}

.admin-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* 刪除按鈕樣式 */
.admin-delete-btn {
  color: var(--color-danger);
  transition: color var(--duration-fast) var(--ease-smooth);
}

.admin-delete-btn:hover {
  color: var(--color-danger-dark);
}
</style>

<template>
  <div class="space-y-6">
    <!-- 搜尋和篩選 -->
    <div class="p-4 rounded-lg border admin-panel">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋用戶名稱或電子郵件..."
            class="w-full px-3 py-2 rounded-md admin-input"
          />
        </div>
        <div class="sm:w-48">
          <select
            v-model="selectedRole"
            class="w-full px-3 py-2 rounded-md admin-input"
          >
            <option
              v-for="role in roles"
              :key="role.value"
              :value="role.value"
            >
              {{ role.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 用戶列表 -->
    <div class="rounded-lg overflow-hidden admin-panel">
      <div v-if="isLoading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2" style="color: var(--text-secondary);">載入中...</p>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="p-8 text-center" style="color: var(--text-tertiary);">
        <p>沒有找到符合條件的用戶</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full admin-table">
          <thead class="admin-table-header">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider admin-table-th">
                用戶
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider admin-table-th">
                角色
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider admin-table-th">
                註冊時間
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider admin-table-th">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="admin-table-body">
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="admin-table-row"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full flex items-center justify-center admin-avatar">
                      <span class="font-medium admin-avatar-text">
                        {{ user.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium" style="color: var(--text-primary);">
                      {{ user.name }}
                    </div>
                    <div class="text-sm" style="color: var(--text-secondary);">
                      {{ user.email }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <select
                  :value="user.role"
                  @change="updateUserRole(user.id, ($event.target as HTMLSelectElement).value)"
                  class="text-sm rounded px-2 py-1 admin-select"
                >
                  <option value="user">一般用戶</option>
                  <option value="admin">管理員</option>
                </select>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: var(--text-secondary);">
                {{ new Date(user.createdAt).toLocaleDateString() }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: var(--text-secondary);">
                <button
                  @click="deleteUser(user.id)"
                  class="font-medium admin-delete-btn"
                >
                  刪除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
