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

<template>
  <div class="space-y-6">
    <!-- 搜尋和篩選 -->
    <div class="bg-white p-4 rounded-lg border">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋用戶名稱或電子郵件..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div class="sm:w-48">
          <select
            v-model="selectedRole"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    <div class="bg-white rounded-lg border overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">載入中...</p>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="p-8 text-center text-gray-500">
        <p>沒有找到符合條件的用戶</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用戶
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                角色
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                註冊時間
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span class="text-blue-600 font-medium">
                        {{ user.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ user.name }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ user.email }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <select
                  :value="user.role"
                  @change="updateUserRole(user.id, ($event.target as HTMLSelectElement).value)"
                  class="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">一般用戶</option>
                  <option value="admin">管理員</option>
                </select>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ new Date(user.createdAt).toLocaleDateString() }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button
                  @click="deleteUser(user.id)"
                  class="text-red-600 hover:text-red-800 font-medium"
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
