<template>
  <div class="daily-verse">
    <div class="verse-card">
      <div class="verse-header">
        <svg class="verse-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        <h3 class="verse-title">今日經文</h3>
      </div>
      
      <div class="verse-content">
        <blockquote class="verse-text">
          {{ currentVerse?.text }}
        </blockquote>
        <cite class="verse-reference">
          {{ currentVerse?.reference }}
        </cite>
      </div>
      
      <div class="verse-footer">
        <button 
          @click="getNewVerse" 
          class="refresh-btn"
          :disabled="isRefreshing"
          title="換一節經文"
        >
          <svg class="refresh-icon" :class="{ 'spinning': isRefreshing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import versesData from '@/data/verses.json'

interface Verse {
  id: number
  book: string
  chapter: number
  verse: number
  text: string
  reference: string
}

const currentVerse = ref<Verse | null>(null)
const isRefreshing = ref(false)

const getRandomVerse = (): Verse => {
  const verses = versesData.verses as Verse[]
  const randomIndex = Math.floor(Math.random() * verses.length)
  return verses[randomIndex]
}

const getDailyVerse = (): Verse => {
  const verses = versesData.verses as Verse[]
  const today = new Date()
  // 基於日期和用戶狀態產生穩定的隨機數
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
  const loginTimestamp = Date.now()
  // 結合日期和登入時間，確保每次登入都有不同的經節
  const seed = dayOfYear + Math.floor(loginTimestamp / (1000 * 60 * 60)) // 每小時變化
  const verseIndex = seed % verses.length
  return verses[verseIndex]
}

const getNewVerse = async () => {
  isRefreshing.value = true
  
  // 短暫延遲以顯示動畫效果
  await new Promise(resolve => setTimeout(resolve, 500))
  
  currentVerse.value = getRandomVerse()
  isRefreshing.value = false
}

onMounted(() => {
  // 初始載入時顯示當日經文
  currentVerse.value = getDailyVerse()
})
</script>

<style scoped>
.daily-verse {
  width: 100%;
  margin-bottom: var(--space-6);
}

.verse-card {
  background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #b45309 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-lg);
  color: white;
  position: relative;
  overflow: hidden;
}

.verse-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.verse-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.verse-icon {
  width: 24px;
  height: 24px;
  color: #fbbf24;
}

.verse-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #fbbf24;
  margin: 0;
}

.verse-content {
  margin-bottom: var(--space-4);
}

.verse-text {
  font-size: 1.125rem;
  line-height: 1.7;
  margin: 0 0 var(--space-3) 0;
  font-style: normal;
  position: relative;
  padding-left: var(--space-4);
}

.verse-text::before {
  content: '"';
  position: absolute;
  left: 0;
  top: -8px;
  font-size: 2rem;
  color: #fbbf24;
  font-family: serif;
}

.verse-reference {
  display: block;
  font-size: 0.875rem;
  color: #e5e7eb;
  font-style: normal;
  text-align: right;
  margin-top: var(--space-2);
}

.verse-footer {
  display: flex;
  justify-content: flex-end;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  color: white;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-smooth);
  backdrop-filter: blur(10px);
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.5s ease-in-out;
}

.refresh-icon.spinning {
  animation: spin 0.5s linear;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .verse-card {
    padding: var(--space-4);
  }
  
  .verse-text {
    font-size: 1rem;
    padding-left: var(--space-3);
  }
  
  .verse-text::before {
    font-size: 1.5rem;
    top: -4px;
  }
}

/* 深色模式適配 */
@media (prefers-color-scheme: dark) {
  .verse-card {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  }
}
</style>