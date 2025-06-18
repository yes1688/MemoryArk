/**
 * 智能預載機制 - 基於用戶行為的預測分析
 * 
 * 此模組分析用戶導航模式，預測可能的下一步操作，
 * 並智能預載相關資料夾，提升用戶體驗。
 */

// 導航歷史記錄
interface NavigationEntry {
  folderId: number | null
  timestamp: number
  loadTime: number  // 資料載入時間
  stayTime: number  // 停留時間
  source: 'direct' | 'breadcrumb' | 'folder-click' | 'search'
}

// 預載項目
interface PreloadItem {
  folderId: number | null
  priority: number  // 1-10，數字越高優先級越高
  confidence: number  // 0-1，預測置信度
  reason: string  // 預載原因
  timestamp: number
}

// 預載統計
interface PreloadStats {
  totalPreloads: number
  successfulPreloads: number  // 預載後實際被訪問的數量
  hitRate: number  // 命中率 (0-100%)
  averageLoadTime: number
  savedTime: number  // 節省的總時間
}

/**
 * 智能預載預測器
 */
export class SmartPreloadPredictor {
  private navigationHistory: NavigationEntry[] = []
  private preloadHistory: PreloadItem[] = []
  private stats: PreloadStats = {
    totalPreloads: 0,
    successfulPreloads: 0,
    hitRate: 0,
    averageLoadTime: 0,
    savedTime: 0
  }

  // 配置參數
  private readonly config = {
    maxHistorySize: 100,  // 保留的歷史記錄數量
    preloadConfidenceThreshold: 0.3,  // 預載的最低置信度
    maxPreloadItems: 5,  // 同時預載的最大項目數
    siblingPreloadWeight: 0.7,  // 同級資料夾權重
    parentPreloadWeight: 0.5,   // 父資料夾權重
    childPreloadWeight: 0.8,    // 子資料夾權重
    recentVisitWeight: 0.6,     // 最近訪問權重
    timeDecayFactor: 0.95       // 時間衰減因子
  }

  /**
   * 記錄用戶導航行為
   */
  recordNavigation(
    folderId: number | null, 
    loadTime: number, 
    source: NavigationEntry['source'] = 'direct'
  ): void {
    const now = Date.now()
    
    // 更新上一個記錄的停留時間
    if (this.navigationHistory.length > 0) {
      const lastEntry = this.navigationHistory[this.navigationHistory.length - 1]
      lastEntry.stayTime = now - lastEntry.timestamp
    }

    // 添加新記錄
    const entry: NavigationEntry = {
      folderId,
      timestamp: now,
      loadTime,
      stayTime: 0,
      source
    }

    this.navigationHistory.push(entry)

    // 限制歷史記錄大小
    if (this.navigationHistory.length > this.config.maxHistorySize) {
      this.navigationHistory.shift()
    }

    // 檢查是否命中預載
    this.checkPreloadHit(folderId)

    console.log(`[Predictor] Navigation recorded: folder ${folderId}, load time: ${loadTime}ms`)
  }

  /**
   * 預測下一步可能訪問的資料夾
   */
  predictNextFolders(currentFolderId: number | null, folderStructure?: any): PreloadItem[] {
    const predictions: PreloadItem[] = []
    const now = Date.now()

    // 分析導航模式
    const patterns = this.analyzeNavigationPatterns(currentFolderId)
    
    // 1. 基於歷史頻率的預測
    const frequentFolders = this.getFrequentlyVisitedFolders(currentFolderId)
    for (const folder of frequentFolders) {
      const confidence = this.calculateHistoryConfidence(folder.folderId, currentFolderId)
      if (confidence >= this.config.preloadConfidenceThreshold) {
        predictions.push({
          folderId: folder.folderId,
          priority: Math.round(confidence * 10),
          confidence,
          reason: `歷史訪問頻率 (${folder.count}次)`,
          timestamp: now
        })
      }
    }

    // 2. 基於導航模式的預測
    if (patterns.length > 0) {
      const patternPrediction = this.predictFromPatterns(patterns, currentFolderId)
      predictions.push(...patternPrediction)
    }

    // 3. 基於資料夾結構的預測 (如果提供了結構信息)
    if (folderStructure) {
      const structuralPredictions = this.predictFromStructure(currentFolderId, folderStructure)
      predictions.push(...structuralPredictions)
    }

    // 4. 基於時間模式的預測
    const timePredictions = this.predictFromTimePatterns(currentFolderId)
    predictions.push(...timePredictions)

    // 去重並按優先級排序
    const uniquePredictions = this.deduplicateAndSort(predictions)
    
    // 限制預載數量
    const finalPredictions = uniquePredictions.slice(0, this.config.maxPreloadItems)

    console.log(`[Predictor] Generated ${finalPredictions.length} predictions for folder ${currentFolderId}:`, 
      finalPredictions.map(p => `${p.folderId}(${(p.confidence * 100).toFixed(1)}%)`).join(', '))

    return finalPredictions
  }

  /**
   * 分析導航模式
   */
  private analyzeNavigationPatterns(currentFolderId: number | null): Array<{ pattern: (number | null)[], confidence: number }> {
    const patterns: Array<{ pattern: (number | null)[], confidence: number }> = []
    const minPatternLength = 2

    // 尋找重複的導航序列
    for (let length = minPatternLength; length <= 4; length++) {
      const sequences = this.extractSequences(length)
      for (const sequence of sequences) {
        if (sequence.pattern[sequence.pattern.length - 1] === currentFolderId) {
          patterns.push(sequence)
        }
      }
    }

    return patterns.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * 提取導航序列
   */
  private extractSequences(length: number): Array<{ pattern: (number | null)[], confidence: number }> {
    const sequences = new Map<string, number>()
    const total = Math.max(1, this.navigationHistory.length - length + 1)

    // 統計序列出現次數
    for (let i = 0; i <= this.navigationHistory.length - length; i++) {
      const pattern = this.navigationHistory.slice(i, i + length).map(entry => entry.folderId)
      const key = pattern.join('->')
      sequences.set(key, (sequences.get(key) || 0) + 1)
    }

    // 轉換為置信度
    return Array.from(sequences.entries())
      .map(([key, count]) => ({
        pattern: key.split('->').map(id => id === 'null' ? null : parseInt(id)),
        confidence: count / total
      }))
      .filter(seq => seq.confidence >= 0.2) // 至少20%的置信度
  }

  /**
   * 獲取經常訪問的資料夾
   */
  private getFrequentlyVisitedFolders(excludeFolderId: number | null): Array<{ folderId: number | null, count: number }> {
    const folderCounts = new Map<string, number>()
    const now = Date.now()

    // 統計訪問次數，考慮時間衰減
    this.navigationHistory.forEach(entry => {
      if (entry.folderId !== excludeFolderId) {
        const key = String(entry.folderId)
        const timeWeight = Math.pow(this.config.timeDecayFactor, (now - entry.timestamp) / (24 * 60 * 60 * 1000)) // 以天為單位
        folderCounts.set(key, (folderCounts.get(key) || 0) + timeWeight)
      }
    })

    return Array.from(folderCounts.entries())
      .map(([id, count]) => ({ folderId: id === 'null' ? null : parseInt(id), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // 返回前10個
  }

  /**
   * 計算基於歷史的置信度
   */
  private calculateHistoryConfidence(targetFolderId: number | null, currentFolderId: number | null): number {
    const transitions = this.navigationHistory.filter((entry, index) => {
      if (index === 0) return false
      const prevEntry = this.navigationHistory[index - 1]
      return prevEntry.folderId === currentFolderId && entry.folderId === targetFolderId
    })

    const totalFromCurrent = this.navigationHistory.filter((entry, index) => {
      if (index === 0) return false
      return this.navigationHistory[index - 1].folderId === currentFolderId
    }).length

    if (totalFromCurrent === 0) return 0

    const baseConfidence = transitions.length / totalFromCurrent
    
    // 考慮最近訪問的權重
    const recentTransitions = transitions.filter(entry => 
      Date.now() - entry.timestamp < 24 * 60 * 60 * 1000 // 24小時內
    )
    const recentWeight = recentTransitions.length / Math.max(1, transitions.length)

    return baseConfidence * (1 + recentWeight * this.config.recentVisitWeight)
  }

  /**
   * 基於模式預測
   */
  private predictFromPatterns(patterns: Array<{ pattern: (number | null)[], confidence: number }>, currentFolderId: number | null): PreloadItem[] {
    const predictions: PreloadItem[] = []
    const now = Date.now()

    for (const pattern of patterns.slice(0, 3)) { // 取前3個模式
      if (pattern.pattern.length > 1) {
        const nextFolderId = pattern.pattern[pattern.pattern.length - 1]
        if (nextFolderId !== currentFolderId) {
          predictions.push({
            folderId: nextFolderId,
            priority: Math.round(pattern.confidence * 8),
            confidence: pattern.confidence,
            reason: `導航模式匹配 (${pattern.pattern.join('→')})`,
            timestamp: now
          })
        }
      }
    }

    return predictions
  }

  /**
   * 基於資料夾結構預測
   */
  private predictFromStructure(currentFolderId: number | null, structure: any): PreloadItem[] {
    const predictions: PreloadItem[] = []
    const now = Date.now()

    // 這裡可以根據實際的資料夾結構API來實現
    // 暫時提供一個基本的實現框架

    // 預測同級資料夾
    if (structure.siblings) {
      structure.siblings.forEach((siblingId: number) => {
        if (siblingId !== currentFolderId) {
          predictions.push({
            folderId: siblingId,
            priority: Math.round(this.config.siblingPreloadWeight * 10),
            confidence: this.config.siblingPreloadWeight,
            reason: '同級資料夾',
            timestamp: now
          })
        }
      })
    }

    // 預測子資料夾
    if (structure.children) {
      structure.children.slice(0, 2).forEach((childId: number) => {
        predictions.push({
          folderId: childId,
          priority: Math.round(this.config.childPreloadWeight * 10),
          confidence: this.config.childPreloadWeight,
          reason: '子資料夾',
          timestamp: now
        })
      })
    }

    return predictions
  }

  /**
   * 基於時間模式預測
   */
  private predictFromTimePatterns(currentFolderId: number | null): PreloadItem[] {
    const predictions: PreloadItem[] = []
    const now = Date.now()
    const currentHour = new Date().getHours()

    // 分析相同時間段的訪問模式
    const sameTimeVisits = this.navigationHistory.filter(entry => {
      const entryHour = new Date(entry.timestamp).getHours()
      return Math.abs(entryHour - currentHour) <= 1 // 前後1小時內
    })

    if (sameTimeVisits.length > 3) {
      const timeBasedFolders = this.getFrequentFoldersFromEntries(sameTimeVisits, currentFolderId)
      
      timeBasedFolders.slice(0, 2).forEach(folder => {
        predictions.push({
          folderId: folder.folderId,
          priority: 6,
          confidence: 0.4,
          reason: `時間模式匹配 (${currentHour}:00時段)`,
          timestamp: now
        })
      })
    }

    return predictions
  }

  /**
   * 從特定條目中獲取頻繁資料夾
   */
  private getFrequentFoldersFromEntries(entries: NavigationEntry[], excludeFolderId: number | null): Array<{ folderId: number | null, count: number }> {
    const folderCounts = new Map<string, number>()

    entries.forEach(entry => {
      if (entry.folderId !== excludeFolderId) {
        const key = String(entry.folderId)
        folderCounts.set(key, (folderCounts.get(key) || 0) + 1)
      }
    })

    return Array.from(folderCounts.entries())
      .map(([id, count]) => ({ folderId: id === 'null' ? null : parseInt(id), count }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * 去重並排序預測結果
   */
  private deduplicateAndSort(predictions: PreloadItem[]): PreloadItem[] {
    const folderMap = new Map<string, PreloadItem>()

    // 去重，保留最高優先級的預測
    predictions.forEach(prediction => {
      const key = String(prediction.folderId)
      const existing = folderMap.get(key)
      
      if (!existing || prediction.priority > existing.priority) {
        folderMap.set(key, {
          ...prediction,
          reason: existing ? `${existing.reason} + ${prediction.reason}` : prediction.reason
        })
      }
    })

    // 按優先級排序
    return Array.from(folderMap.values())
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * 檢查預載命中
   */
  private checkPreloadHit(folderId: number | null): void {
    const recentPreloads = this.preloadHistory.filter(item => 
      Date.now() - item.timestamp < 10 * 60 * 1000 // 10分鐘內的預載
    )

    const hitPreload = recentPreloads.find(item => item.folderId === folderId)
    if (hitPreload) {
      this.stats.successfulPreloads++
      this.updateHitRate()
      
      console.log(`[Predictor] Preload HIT: folder ${folderId} (${hitPreload.reason})`)
    }
  }

  /**
   * 記錄預載操作
   */
  recordPreload(item: PreloadItem): void {
    this.preloadHistory.push(item)
    this.stats.totalPreloads++
    this.updateHitRate()

    // 限制預載歷史大小
    if (this.preloadHistory.length > this.config.maxHistorySize) {
      this.preloadHistory.shift()
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    if (this.stats.totalPreloads > 0) {
      this.stats.hitRate = (this.stats.successfulPreloads / this.stats.totalPreloads) * 100
    }
  }

  /**
   * 獲取預載統計
   */
  getStats(): PreloadStats {
    return { ...this.stats }
  }

  /**
   * 清除歷史記錄
   */
  clearHistory(): void {
    this.navigationHistory = []
    this.preloadHistory = []
    this.stats = {
      totalPreloads: 0,
      successfulPreloads: 0,
      hitRate: 0,
      averageLoadTime: 0,
      savedTime: 0
    }
    console.log('[Predictor] History cleared')
  }

  /**
   * 獲取調試信息
   */
  getDebugInfo(): any {
    return {
      navigationHistory: this.navigationHistory.slice(-10), // 最近10條
      preloadHistory: this.preloadHistory.slice(-10),
      stats: this.stats,
      config: this.config
    }
  }
}

// 全局預測器實例
export const globalPredictor = new SmartPreloadPredictor()

// 便捷函數
export function recordNavigation(folderId: number | null, loadTime: number, source?: NavigationEntry['source']): void {
  globalPredictor.recordNavigation(folderId, loadTime, source)
}

export function predictNextFolders(currentFolderId: number | null, folderStructure?: any): PreloadItem[] {
  return globalPredictor.predictNextFolders(currentFolderId, folderStructure)
}

export function getPreloadStats(): PreloadStats {
  return globalPredictor.getStats()
}

export function clearPredictionHistory(): void {
  globalPredictor.clearHistory()
}