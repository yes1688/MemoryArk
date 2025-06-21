<template>
  <div class="category-management">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="page-title">檔案分類管理</h1>
      <p class="page-subtitle">管理檔案的分類方式，提供多種組織檔案的選項</p>
    </div>

    <!-- 分類系統對比 -->
    <div class="classification-comparison">
      <div class="comparison-grid">
        <!-- 傳統資料夾系統 -->
        <div class="classification-card">
          <div class="card-header">
            <svg class="icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
            </svg>
            <h2>資料夾系統</h2>
          </div>
          <div class="card-content">
            <p class="description">傳統檔案管理方式，適合個人化組織</p>
            
            <div class="features">
              <h3>適用場景：</h3>
              <ul>
                <li>按年份組織（2024年、2025年）</li>
                <li>按活動分類（母親節、復活節）</li>
                <li>按部門管理（青年團契、婦女團契）</li>
                <li>個人專案檔案</li>
              </ul>
            </div>
            
            <div class="example-structure">
              <h3>範例結構：</h3>
              <div class="folder-tree">
                <div class="folder">📁 2024年活動</div>
                <div class="folder level-1">📁 母親節</div>
                <div class="folder level-2">📄 母親節活動照片.jpg</div>
                <div class="folder level-2">📄 感恩見證影片.mp4</div>
                <div class="folder level-1">📁 復活節</div>
                <div class="folder level-2">📄 復活節見證.docx</div>
              </div>
            </div>

            <div class="actions">
              <button @click="$router.push('/files')" class="action-btn primary">
                管理資料夾
              </button>
            </div>
          </div>
        </div>

        <!-- 教會特定分類系統 -->
        <div class="classification-card">
          <div class="card-header">
            <svg class="icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <h2>教會分類系統</h2>
          </div>
          <div class="card-content">
            <p class="description">專為教會設計的分類方式，基於教會功能</p>
            
            <div class="features">
              <h3>教會專屬分類：</h3>
              <ul>
                <li>安息日資料（講道、聖詩）</li>
                <li>共享資源（教材、表格）</li>
                <li>見證分享</li>
                <li>教會活動</li>
                <li>行政文件</li>
                <li>音樂詩歌</li>
              </ul>
            </div>
            
            <div class="category-list">
              <h3>目前分類：</h3>
              <div class="categories">
                <div class="category-item" v-for="category in categories" :key="category.id">
                  <div class="category-info">
                    <span class="category-name">{{ category.name }}</span>
                    <span class="category-count">{{ category.fileCount }} 個檔案</span>
                  </div>
                  <button @click="navigateToCategory(category.id)" class="view-btn">
                    檢視
                  </button>
                </div>
              </div>
            </div>

            <div class="actions">
              <button @click="$router.push('/shared')" class="action-btn primary">
                檢視共享資源
              </button>
              <button @click="$router.push('/sabbath')" class="action-btn secondary">
                檢視安息日資料
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 建議的混合使用方式 -->
    <div class="recommendation-section">
      <h2>建議的檔案組織策略</h2>
      <div class="strategy-grid">
        <div class="strategy-card">
          <h3>🏛️ 教會官方檔案</h3>
          <p>使用<strong>教會分類系統</strong></p>
          <ul>
            <li>安息日講道、聖詩</li>
            <li>官方教材和表格</li>
            <li>行政文件</li>
          </ul>
        </div>
        
        <div class="strategy-card">
          <h3>👥 個人或小組檔案</h3>
          <p>使用<strong>資料夾系統</strong></p>
          <ul>
            <li>個人見證和分享</li>
            <li>小組活動照片</li>
            <li>專案相關檔案</li>
          </ul>
        </div>
        
        <div class="strategy-card">
          <h3>🔄 混合使用</h3>
          <p>兩種系統<strong>並存</strong></p>
          <ul>
            <li>先用教會分類大分類</li>
            <li>再用資料夾細分組織</li>
            <li>靈活應用兩種方式</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFilesStore } from '@/stores/files'

const router = useRouter()
const filesStore = useFilesStore()

// 教會分類定義
const categories = ref([
  { id: 1, name: '安息日資料', fileCount: 0 },
  { id: 2, name: '共享資源', fileCount: 0 },
  { id: 3, name: '見證分享', fileCount: 0 },
  { id: 4, name: '教會活動', fileCount: 0 },
  { id: 5, name: '行政文件', fileCount: 0 },
  { id: 6, name: '音樂詩歌', fileCount: 0 }
])

// 計算各分類的檔案數量
const updateCategoryCounts = () => {
  categories.value.forEach(category => {
    category.fileCount = filesStore.files.filter(file => 
      (file as any).categoryId === category.id && !file.isDeleted
    ).length
  })
}

// 導航到特定分類
const navigateToCategory = (categoryId: number) => {
  switch (categoryId) {
    case 1:
      router.push('/sabbath')
      break
    case 2:
      router.push('/shared')
      break
    default:
      // 可以添加更多分類頁面
      alert(`分類 ${categoryId} 的專屬頁面正在開發中`)
  }
}

// 生命週期
onMounted(async () => {
  await filesStore.fetchFiles()
  updateCategoryCounts()
})
</script>

<style scoped>
.category-management {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* 頁面標題 */
.page-header {
  margin-bottom: 3rem;
  text-align: center;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 300;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* 分類系統對比 */
.classification-comparison {
  margin-bottom: 3rem;
}

.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.classification-card {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl);
  padding: 2rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-light);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-light);
}

.card-header .icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-primary);
}

.card-header h2 {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.description {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

.features h3,
.example-structure h3,
.category-list h3 {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.features ul {
  list-style: none;
  padding: 0;
}

.features li {
  padding: 0.5rem 0;
  color: var(--text-secondary);
  position: relative;
  padding-left: 1.5rem;
}

.features li::before {
  content: '•';
  color: var(--color-primary);
  position: absolute;
  left: 0;
}

/* 資料夾樹狀結構 */
.folder-tree {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 1rem;
  font-family: monospace;
  font-size: 0.875rem;
}

.folder {
  padding: 0.25rem 0;
  color: var(--text-primary);
}

.folder.level-1 {
  margin-left: 1rem;
}

.folder.level-2 {
  margin-left: 2rem;
  color: var(--text-secondary);
}

/* 分類列表 */
.categories {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.category-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.category-name {
  font-weight: 500;
  color: var(--text-primary);
}

.category-count {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.view-btn {
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.875rem;
  transition: background var(--duration-fast) var(--ease-smooth);
}

.view-btn:hover {
  background: var(--color-primary-dark);
}

/* 操作按鈕 */
.actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 1rem;
}

.action-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--duration-fast) var(--ease-smooth);
}

.action-btn.primary {
  background: var(--color-primary);
  color: white;
}

.action-btn.primary:hover {
  background: var(--color-primary-dark);
}

.action-btn.secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-medium);
}

.action-btn.secondary:hover {
  background: var(--bg-secondary);
}

/* 建議策略 */
.recommendation-section {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl);
  padding: 2rem;
  box-shadow: var(--shadow-md);
}

.recommendation-section h2 {
  font-size: 1.75rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  text-align: center;
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.strategy-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--border-light);
}

.strategy-card h3 {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.strategy-card p {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.strategy-card ul {
  list-style: none;
  padding: 0;
}

.strategy-card li {
  padding: 0.25rem 0;
  color: var(--text-tertiary);
  font-size: 0.875rem;
  position: relative;
  padding-left: 1rem;
}

.strategy-card li::before {
  content: '→';
  color: var(--color-primary);
  position: absolute;
  left: 0;
}

/* 響應式設計 */
@media (max-width: 1024px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
  
  .strategy-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .category-management {
    padding: 1rem;
  }
  
  .actions {
    flex-direction: column;
  }
}
</style>