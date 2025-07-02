<template>
  <div class="glass-demo p-8 space-y-8">
    <h1 class="text-3xl font-bold text-primary mb-8">MemoryArk Liquid Glass 設計系統示例</h1>
    
    <!-- Glass Card 示例 -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-primary">Glass Cards - 玻璃卡片</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="glass-light rounded-xl p-6">
          <h3 class="font-semibold mb-2">Light Glass</h3>
          <p class="text-secondary text-sm">輕度玻璃效果，適合次要內容</p>
        </div>
        
        <div class="glass-medium rounded-xl p-6">
          <h3 class="font-semibold mb-2">Medium Glass</h3>
          <p class="text-secondary text-sm">中度玻璃效果，適合主要內容</p>
        </div>
        
        <div class="glass-heavy rounded-xl p-6">
          <h3 class="font-semibold mb-2">Heavy Glass</h3>
          <p class="text-secondary text-sm">重度玻璃效果，適合重要內容</p>
        </div>
        
        <div class="glass-extra-heavy rounded-xl p-6">
          <h3 class="font-semibold mb-2">Extra Heavy</h3>
          <p class="text-secondary text-sm">超重度玻璃效果，適合強調內容</p>
        </div>
      </div>
    </section>

    <!-- Glass Buttons 示例 -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-primary">Glass Buttons - 玻璃按鈕</h2>
      <div class="flex flex-wrap gap-4">
        <button class="glass-button">
          Default Glass Button
        </button>
        <button class="glass-button bg-primary-500 text-white">
          Primary Glass Button
        </button>
        <button class="glass-button bg-secondary-500 text-white">
          Secondary Glass Button
        </button>
      </div>
    </section>

    <!-- Glass Input 示例 -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-primary">Glass Inputs - 玻璃輸入框</h2>
      <div class="max-w-md space-y-4">
        <input 
          type="text" 
          placeholder="Glass Input Field" 
          class="glass-input w-full"
        />
        <input 
          type="email" 
          placeholder="Email Address" 
          class="glass-input w-full"
        />
        <textarea 
          placeholder="Glass Textarea" 
          class="glass-input w-full h-24 resize-none"
        ></textarea>
      </div>
    </section>

    <!-- Glass Navigation 示例 -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-primary">Glass Navigation - 玻璃導航</h2>
      <nav class="glass-nav">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-6">
            <span class="font-semibold">MemoryArk</span>
            <a href="#" class="hover:text-primary transition-colors">首頁</a>
            <a href="#" class="hover:text-primary transition-colors">檔案</a>
            <a href="#" class="hover:text-primary transition-colors">設定</a>
          </div>
          <div class="flex items-center space-x-4">
            <button class="glass-button">登入</button>
          </div>
        </div>
      </nav>
    </section>

    <!-- Glass Effects with Tailwind 示例 -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-primary">Tailwind Glass Utilities</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="backdrop-blur-glass-sm bg-glass-white border border-glass-white rounded-xl p-6">
          <h3 class="font-semibold mb-2">Tailwind Light</h3>
          <p class="text-secondary text-sm">使用 Tailwind utilities</p>
        </div>
        
        <div class="backdrop-blur-glass-md bg-glass-white-strong border border-glass-white rounded-xl p-6 shadow-glass-md">
          <h3 class="font-semibold mb-2">Tailwind Medium</h3>
          <p class="text-secondary text-sm">組合多個 utilities</p>
        </div>
        
        <div class="backdrop-blur-glass-lg bg-glass-white-heavy border border-glass-white-strong rounded-xl p-6 shadow-glass-lg">
          <h3 class="font-semibold mb-2">Tailwind Heavy</h3>
          <p class="text-secondary text-sm">完全自定義組合</p>
        </div>
      </div>
    </section>

    <!-- Interactive Glass 示例 -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-primary">Interactive Glass - 互動玻璃效果</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="glass-hover-light p-6 rounded-xl cursor-pointer transition-all duration-300">
          <h3 class="font-semibold mb-2">Hover Light</h3>
          <p class="text-secondary text-sm">懸停時增強玻璃效果</p>
        </div>
        
        <div class="glass-hover-heavy p-6 rounded-xl cursor-pointer transition-all duration-300">
          <h3 class="font-semibold mb-2">Hover Heavy</h3>
          <p class="text-secondary text-sm">懸停時大幅增強效果</p>
        </div>
      </div>
    </section>

    <!-- Glass Animation 示例 -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-primary">Glass Animations - 玻璃動畫</h2>
      <div class="flex flex-wrap gap-4">
        <div class="glass-fade-in glass-medium p-4 rounded-xl">
          <span>Fade In Animation</span>
        </div>
        <div class="glass-scale-in glass-medium p-4 rounded-xl">
          <span>Scale In Animation</span>
        </div>
        <div class="glass-shimmer glass-medium p-4 rounded-xl relative overflow-hidden">
          <span>Shimmer Effect</span>
        </div>
      </div>
    </section>

    <!-- Glass with Different Backgrounds 示例 -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-primary">Adaptive Glass - 自適應玻璃</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 淺色背景 -->
        <div class="bg-gradient-to-br from-blue-100 to-purple-100 p-8 rounded-2xl">
          <div class="glass-card mb-4">
            <h3 class="font-semibold mb-2">淺色背景</h3>
            <p class="text-secondary text-sm">玻璃效果在淺色背景上的表現</p>
          </div>
        </div>
        
        <!-- 深色背景 -->
        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl">
          <div class="glass-card mb-4">
            <h3 class="font-semibold mb-2 text-white">深色背景</h3>
            <p class="text-gray-300 text-sm">玻璃效果在深色背景上的表現</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Mobile Optimized Glass 示例 -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-primary">Mobile Optimized - 移動端優化</h2>
      <div class="glass-card max-w-sm mx-auto">
        <h3 class="font-semibold mb-2">移動端友好</h3>
        <p class="text-secondary text-sm mb-4">
          在移動設備上自動減少模糊效果以提升性能，
          同時保持視覺效果的一致性。
        </p>
        <button class="glass-button w-full">
          移動端按鈕
        </button>
      </div>
    </section>

    <!-- Usage Guidelines 示例 -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold text-primary">Usage Guidelines - 使用指南</h2>
      <div class="glass-card">
        <h3 class="font-semibold mb-4">最佳實踐</h3>
        <div class="space-y-3 text-sm text-secondary">
          <div class="flex items-start space-x-2">
            <span class="text-green-500 mt-1">✓</span>
            <span>使用 <code class="bg-gray-100 px-2 py-1 rounded">glass-light</code> 用於次要內容和背景元素</span>
          </div>
          <div class="flex items-start space-x-2">
            <span class="text-green-500 mt-1">✓</span>
            <span>使用 <code class="bg-gray-100 px-2 py-1 rounded">glass-medium</code> 用於主要內容卡片</span>
          </div>
          <div class="flex items-start space-x-2">
            <span class="text-green-500 mt-1">✓</span>
            <span>使用 <code class="bg-gray-100 px-2 py-1 rounded">glass-heavy</code> 用於模態框和彈出內容</span>
          </div>
          <div class="flex items-start space-x-2">
            <span class="text-red-500 mt-1">✗</span>
            <span>避免在低性能設備上過度使用重度玻璃效果</span>
          </div>
          <div class="flex items-start space-x-2">
            <span class="text-red-500 mt-1">✗</span>
            <span>避免在純色背景上使用玻璃效果（效果不明顯）</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// 玻璃效果演示組件
// 展示 MemoryArk Liquid Glass 設計系統的所有功能
</script>

<style scoped>
.glass-demo {
  /* 背景漸變讓玻璃效果更明顯 */
  background: linear-gradient(
    135deg,
    #667eea 0%,
    #764ba2 25%,
    #f093fb 50%,
    #f5576c 75%,
    #4facfe 100%
  );
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
  min-height: 100vh;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 確保文字在彩色背景上清晰可見 */
.glass-demo h1,
.glass-demo h2 {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

code {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.875em;
}
</style>