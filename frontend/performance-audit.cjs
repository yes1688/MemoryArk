#!/usr/bin/env node

/**
 * 前端性能審計腳本
 * 檢查打包大小、依賴分析、程式碼品質等
 */

const fs = require('fs')
const path = require('path')

class PerformanceAuditor {
  constructor() {
    this.results = {
      bundleSize: {},
      dependencies: {},
      codeQuality: {},
      recommendations: []
    }
  }

  // 分析打包大小
  analyzeBundleSize() {
    console.log('📦 分析打包大小...')
    
    const distPath = path.join(__dirname, 'dist')
    if (!fs.existsSync(distPath)) {
      console.log('❌ 找不到 dist 資料夾，請先執行 npm run build')
      return
    }

    const files = this.getFilesRecursively(distPath)
    let totalSize = 0
    const fileTypes = {}

    files.forEach(file => {
      const stats = fs.statSync(file)
      const ext = path.extname(file)
      const size = stats.size

      totalSize += size
      
      if (!fileTypes[ext]) {
        fileTypes[ext] = { count: 0, size: 0, files: [] }
      }
      
      fileTypes[ext].count++
      fileTypes[ext].size += size
      fileTypes[ext].files.push({
        name: path.relative(distPath, file),
        size: this.formatSize(size)
      })
    })

    this.results.bundleSize = {
      totalSize: this.formatSize(totalSize),
      fileTypes: Object.entries(fileTypes).map(([ext, data]) => ({
        extension: ext || '無副檔名',
        count: data.count,
        totalSize: this.formatSize(data.size),
        files: data.files.sort((a, b) => this.parseSize(b.size) - this.parseSize(a.size))
      }))
    }

    console.log(`📦 總大小: ${this.results.bundleSize.totalSize}`)
    
    // 檢查是否有大檔案
    files.forEach(file => {
      const stats = fs.statSync(file)
      if (stats.size > 1024 * 1024) { // 大於 1MB
        this.results.recommendations.push({
          type: 'warning',
          message: `大檔案警告: ${path.relative(distPath, file)} (${this.formatSize(stats.size)})`
        })
      }
    })
  }

  // 分析依賴
  analyzeDependencies() {
    console.log('📚 分析依賴...')
    
    const packagePath = path.join(__dirname, 'package.json')
    if (!fs.existsSync(packagePath)) {
      console.log('❌ 找不到 package.json')
      return
    }

    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    const dependencies = packageJson.dependencies || {}
    const devDependencies = packageJson.devDependencies || {}

    this.results.dependencies = {
      production: Object.keys(dependencies).length,
      development: Object.keys(devDependencies).length,
      total: Object.keys(dependencies).length + Object.keys(devDependencies).length,
      heavyDependencies: []
    }

    // 檢查可能的重依賴
    const heavyPackages = ['lodash', 'moment', 'babel-polyfill', 'core-js']
    Object.keys(dependencies).forEach(dep => {
      if (heavyPackages.some(heavy => dep.includes(heavy))) {
        this.results.dependencies.heavyDependencies.push(dep)
        this.results.recommendations.push({
          type: 'info',
          message: `重依賴檢測: ${dep} - 考慮使用更輕量的替代方案`
        })
      }
    })

    console.log(`📚 生產依賴: ${this.results.dependencies.production}`)
    console.log(`📚 開發依賴: ${this.results.dependencies.development}`)
  }

  // 檢查程式碼品質
  analyzeCodeQuality() {
    console.log('🔍 檢查程式碼品質...')
    
    const srcPath = path.join(__dirname, 'src')
    const files = this.getFilesRecursively(srcPath)
    
    let totalLines = 0
    let totalFiles = 0
    const fileTypes = {}
    const issues = []

    files.forEach(file => {
      if (!['.vue', '.ts', '.js'].includes(path.extname(file))) return
      
      const content = fs.readFileSync(file, 'utf8')
      const lines = content.split('\n').length
      const ext = path.extname(file)
      
      totalLines += lines
      totalFiles++
      
      if (!fileTypes[ext]) {
        fileTypes[ext] = { files: 0, lines: 0 }
      }
      fileTypes[ext].files++
      fileTypes[ext].lines += lines

      // 檢查程式碼問題
      if (lines > 500) {
        issues.push(`大檔案: ${path.relative(srcPath, file)} (${lines} 行)`)
      }
      
      if (content.includes('console.log')) {
        issues.push(`包含 console.log: ${path.relative(srcPath, file)}`)
      }
      
      if (content.includes('any')) {
        issues.push(`使用 any 類型: ${path.relative(srcPath, file)}`)
      }
    })

    this.results.codeQuality = {
      totalFiles,
      totalLines,
      averageLinesPerFile: Math.round(totalLines / totalFiles),
      fileTypes,
      issues
    }

    console.log(`🔍 總檔案數: ${totalFiles}`)
    console.log(`🔍 總行數: ${totalLines}`)
    console.log(`🔍 平均每檔案行數: ${this.results.codeQuality.averageLinesPerFile}`)
    
    if (issues.length > 0) {
      console.log(`⚠️  發現 ${issues.length} 個潛在問題`)
    }
  }

  // 生成建議
  generateRecommendations() {
    console.log('💡 生成優化建議...')

    // 檢查打包大小
    const totalSizeBytes = this.parseSize(this.results.bundleSize.totalSize)
    if (totalSizeBytes > 5 * 1024 * 1024) { // 大於 5MB
      this.results.recommendations.push({
        type: 'warning',
        message: '打包大小過大，建議進行代碼分割和懶載入'
      })
    }

    // 檢查檔案數量
    if (this.results.codeQuality.totalFiles > 200) {
      this.results.recommendations.push({
        type: 'info',
        message: '檔案數量較多，建議進行模組化重構'
      })
    }

    // 檢查平均檔案大小
    if (this.results.codeQuality.averageLinesPerFile > 200) {
      this.results.recommendations.push({
        type: 'warning',
        message: '平均檔案行數過多，建議拆分大型組件'
      })
    }

    // 依賴數量檢查
    if (this.results.dependencies.production > 50) {
      this.results.recommendations.push({
        type: 'warning',
        message: '生產依賴過多，建議審查並移除不必要的依賴'
      })
    }
  }

  // 輸出報告
  generateReport() {
    this.analyzeBundleSize()
    this.analyzeDependencies()
    this.analyzeCodeQuality()
    this.generateRecommendations()

    console.log('\n' + '='.repeat(60))
    console.log('📊 MemoryArk 2.0 前端性能審計報告')
    console.log('='.repeat(60))

    console.log('\n📦 打包分析:')
    console.log(`   總大小: ${this.results.bundleSize.totalSize}`)
    this.results.bundleSize.fileTypes?.forEach(type => {
      console.log(`   ${type.extension}: ${type.count} 檔案, ${type.totalSize}`)
    })

    console.log('\n📚 依賴分析:')
    console.log(`   生產依賴: ${this.results.dependencies.production}`)
    console.log(`   開發依賴: ${this.results.dependencies.development}`)
    
    if (this.results.dependencies.heavyDependencies.length > 0) {
      console.log(`   重依賴: ${this.results.dependencies.heavyDependencies.join(', ')}`)
    }

    console.log('\n🔍 程式碼品質:')
    console.log(`   總檔案: ${this.results.codeQuality.totalFiles}`)
    console.log(`   總行數: ${this.results.codeQuality.totalLines}`)
    console.log(`   平均行數: ${this.results.codeQuality.averageLinesPerFile}`)
    
    if (this.results.codeQuality.issues?.length > 0) {
      console.log(`   潛在問題: ${this.results.codeQuality.issues.length} 個`)
    }

    console.log('\n💡 優化建議:')
    if (this.results.recommendations.length === 0) {
      console.log('   ✅ 沒有發現明顯的性能問題')
    } else {
      this.results.recommendations.forEach(rec => {
        const icon = rec.type === 'warning' ? '⚠️ ' : 'ℹ️ '
        console.log(`   ${icon}${rec.message}`)
      })
    }

    console.log('\n' + '='.repeat(60))
    console.log('審計完成 ✅')
    console.log('='.repeat(60))

    // 儲存詳細報告
    fs.writeFileSync(
      path.join(__dirname, 'performance-report.json'),
      JSON.stringify(this.results, null, 2)
    )
    console.log('\n📄 詳細報告已儲存至 performance-report.json')
  }

  // 工具方法
  getFilesRecursively(dir) {
    const files = []
    const items = fs.readdirSync(dir)
    
    items.forEach(item => {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath))
      } else {
        files.push(fullPath)
      }
    })
    
    return files
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  parseSize(sizeStr) {
    const match = sizeStr.match(/^([\d.]+)\s*([KMGT]?B)$/)
    if (!match) return 0
    
    const value = parseFloat(match[1])
    const unit = match[2]
    
    const multipliers = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4 }
    return value * (multipliers[unit] || 1)
  }
}

// 執行審計
const auditor = new PerformanceAuditor()
auditor.generateReport()