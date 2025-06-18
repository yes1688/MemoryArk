import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryCache, CacheKeyGenerator } from '@/utils/cache'
import type { CacheConfig, CacheEventListener } from '@/types/cache'

describe('MemoryCache', () => {
  let cache: MemoryCache
  
  beforeEach(() => {
    // 清理控制台模擬
    vi.clearAllMocks()
    
    // 創建新的快取實例
    cache = new MemoryCache({
      maxSize: 3,
      defaultTTL: 1000,
      cleanupInterval: 500,
      enableStatistics: true
    })
  })
  
  afterEach(() => {
    // 清理快取實例
    cache.destroy()
  })

  describe('基本功能', () => {
    it('應該能設置和獲取快取項目', () => {
      const key = 'test-key'
      const data = { value: 'test-data' }
      
      cache.set(key, data)
      const result = cache.get(key)
      
      expect(result).toEqual(data)
    })

    it('應該在快取項目不存在時返回 null', () => {
      const result = cache.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('應該能檢查快取項目是否存在', () => {
      const key = 'test-key'
      const data = 'test-data'
      
      expect(cache.has(key)).toBe(false)
      
      cache.set(key, data)
      expect(cache.has(key)).toBe(true)
    })

    it('應該能刪除快取項目', () => {
      const key = 'test-key'
      const data = 'test-data'
      
      cache.set(key, data)
      expect(cache.has(key)).toBe(true)
      
      const deleted = cache.delete(key)
      expect(deleted).toBe(true)
      expect(cache.has(key)).toBe(false)
    })

    it('應該能清空所有快取', () => {
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')
      
      expect(cache.getStatistics().currentSize).toBe(2)
      
      cache.clear()
      expect(cache.getStatistics().currentSize).toBe(0)
    })
  })

  describe('TTL 機制', () => {
    it('應該在 TTL 過期後返回 null', async () => {
      const key = 'ttl-test'
      const data = 'test-data'
      const shortTTL = 50 // 50ms
      
      cache.set(key, data, shortTTL)
      expect(cache.get(key)).toEqual(data)
      
      // 等待 TTL 過期
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(cache.get(key)).toBeNull()
    })

    it('應該使用預設 TTL 當未指定時', () => {
      const key = 'default-ttl-test'
      const data = 'test-data'
      
      cache.set(key, data)
      
      // 檢查快取項目確實存在
      expect(cache.get(key)).toEqual(data)
    })

    it('應該在 has() 檢查時清理過期項目', async () => {
      const key = 'expire-test'
      const data = 'test-data'
      const shortTTL = 50
      
      cache.set(key, data, shortTTL)
      expect(cache.has(key)).toBe(true)
      
      // 等待過期
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(cache.has(key)).toBe(false)
    })
  })

  describe('大小限制和 LRU 淘汰', () => {
    it('應該在快取滿時淘汰最久未使用的項目', () => {
      // maxSize 設為 3
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')
      cache.set('key3', 'data3')
      
      // 訪問 key1 和 key2 使其最近被使用
      cache.get('key1')
      cache.get('key2')
      
      // 添加第四個項目，應該淘汰 key3 (最久未使用)
      cache.set('key4', 'data4')
      
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(true)
      expect(cache.has('key3')).toBe(false) // 被淘汰
      expect(cache.has('key4')).toBe(true)
    })

    it('應該更新訪問統計', () => {
      const key = 'access-test'
      const data = 'test-data'
      
      cache.set(key, data)
      
      // 多次訪問
      cache.get(key)
      cache.get(key)
      cache.get(key)
      
      const stats = cache.getStatistics()
      expect(stats.totalRequests).toBe(3)
      expect(stats.cacheHits).toBe(3)
      expect(stats.cacheMisses).toBe(0)
      expect(stats.hitRate).toBe(100)
    })
  })

  describe('統計功能', () => {
    it('應該正確記錄命中和未命中統計', () => {
      cache.set('key1', 'data1')
      
      cache.get('key1') // 命中
      cache.get('key2') // 未命中
      cache.get('key1') // 命中
      
      const stats = cache.getStatistics()
      expect(stats.totalRequests).toBe(3)
      expect(stats.cacheHits).toBe(2)
      expect(stats.cacheMisses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(66.67, 1)
    })

    it('應該正確記錄當前大小', () => {
      const stats1 = cache.getStatistics()
      expect(stats1.currentSize).toBe(0)
      
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')
      
      const stats2 = cache.getStatistics()
      expect(stats2.currentSize).toBe(2)
    })
  })

  describe('前綴清理', () => {
    it('應該能根據前綴清理快取項目', () => {
      cache.set('user:1', 'userData1')
      cache.set('user:2', 'userData2')
      cache.set('post:1', 'postData1')
      cache.set('other:1', 'otherData1')
      
      const removedCount = cache.clearByPrefix('user:')
      
      expect(removedCount).toBe(2)
      expect(cache.has('user:1')).toBe(false)
      expect(cache.has('user:2')).toBe(false)
      expect(cache.has('post:1')).toBe(true)
      expect(cache.has('other:1')).toBe(true)
    })

    it('前綴不匹配時應該不刪除任何項目', () => {
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')
      
      const removedCount = cache.clearByPrefix('nonexistent:')
      
      expect(removedCount).toBe(0)
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(true)
    })
  })

  describe('事件監聽器', () => {
    it('應該在設置項目時觸發 onSet 事件', () => {
      const onSet = vi.fn()
      const listener: CacheEventListener = { onSet }
      
      cache.addListener(listener)
      cache.set('key1', 'data1')
      
      expect(onSet).toHaveBeenCalledWith('key1', 'data1')
    })

    it('應該在獲取項目時觸發 onGet 事件', () => {
      const onGet = vi.fn()
      const listener: CacheEventListener = { onGet }
      
      cache.addListener(listener)
      cache.set('key1', 'data1')
      
      cache.get('key1') // 命中
      cache.get('key2') // 未命中
      
      expect(onGet).toHaveBeenCalledWith('key1', true)
      expect(onGet).toHaveBeenCalledWith('key2', false)
    })

    it('應該在刪除項目時觸發 onDelete 事件', () => {
      const onDelete = vi.fn()
      const listener: CacheEventListener = { onDelete }
      
      cache.addListener(listener)
      cache.set('key1', 'data1')
      cache.delete('key1')
      
      expect(onDelete).toHaveBeenCalledWith('key1')
    })

    it('应該能移除事件監聽器', () => {
      const onSet = vi.fn()
      const listener: CacheEventListener = { onSet }
      
      cache.addListener(listener)
      cache.set('key1', 'data1')
      expect(onSet).toHaveBeenCalledTimes(1)
      
      cache.removeListener(listener)
      cache.set('key2', 'data2')
      expect(onSet).toHaveBeenCalledTimes(1) // 沒有增加
    })
  })

  describe('清理機制', () => {
    it('應該定期清理過期項目', async () => {
      // 創建一個快速清理的快取
      const fastCache = new MemoryCache({
        maxSize: 10,
        defaultTTL: 50, // 50ms
        cleanupInterval: 100, // 100ms
        enableStatistics: true
      })
      
      try {
        // 添加項目
        fastCache.set('key1', 'data1')
        fastCache.set('key2', 'data2')
        
        expect(fastCache.getStatistics().currentSize).toBe(2)
        
        // 等待項目過期和清理運行
        await new Promise(resolve => setTimeout(resolve, 200))
        
        const stats = fastCache.getStatistics()
        expect(stats.currentSize).toBeLessThan(2)
        expect(stats.cleanupRuns).toBeGreaterThan(0)
      } finally {
        fastCache.destroy()
      }
    })
  })

  describe('配置選項', () => {
    it('應該使用預設配置值', () => {
      const defaultCache = new MemoryCache()
      const stats = defaultCache.getStatistics()
      
      expect(stats.maxSize).toBe(100) // 預設 maxSize
      
      defaultCache.destroy()
    })

    it('應該能自定義配置', () => {
      const customConfig: Partial<CacheConfig> = {
        maxSize: 50,
        defaultTTL: 2000,
        enableStatistics: false
      }
      
      const customCache = new MemoryCache(customConfig)
      const stats = customCache.getStatistics()
      
      expect(stats.maxSize).toBe(50)
      
      customCache.destroy()
    })
  })

  describe('錯誤處理', () => {
    it('應該優雅處理監聽器錯誤', () => {
      const faultyListener: CacheEventListener = {
        onSet: vi.fn().mockImplementation(() => {
          throw new Error('Listener error')
        })
      }
      
      cache.addListener(faultyListener)
      
      // 應該不會拋出錯誤
      expect(() => {
        cache.set('key1', 'data1')
      }).not.toThrow()
    })
  })
})

describe('CacheKeyGenerator', () => {
  describe('files 方法', () => {
    it('應該為根資料夾生成正確的鍵', () => {
      const key = CacheKeyGenerator.files()
      expect(key).toBe('files:root')
    })

    it('應該為指定資料夾生成正確的鍵', () => {
      const key = CacheKeyGenerator.files(123)
      expect(key).toBe('files:123')
    })

    it('應該處理 null 資料夾ID', () => {
      const key = CacheKeyGenerator.files(null)
      expect(key).toBe('files:root')
    })

    it('應該包含查詢參數', () => {
      const params = { sort: 'name', order: 'asc' }
      const key = CacheKeyGenerator.files(123, params)
      expect(key).toBe('files:123?order=asc&sort=name')
    })

    it('應該對參數排序以確保一致性', () => {
      const params = { z: 'last', a: 'first', m: 'middle' }
      const key = CacheKeyGenerator.files(123, params)
      expect(key).toBe('files:123?a=first&m=middle&z=last')
    })
  })

  describe('folderDetails 方法', () => {
    it('應該生成資料夾詳情鍵', () => {
      const key = CacheKeyGenerator.folderDetails(456)
      expect(key).toBe('folder-details:456')
    })
  })

  describe('breadcrumbs 方法', () => {
    it('應該為根路徑生成麵包屑鍵', () => {
      const key = CacheKeyGenerator.breadcrumbs()
      expect(key).toBe('breadcrumbs:root')
    })

    it('應該為指定資料夾生成麵包屑鍵', () => {
      const key = CacheKeyGenerator.breadcrumbs(789)
      expect(key).toBe('breadcrumbs:789')
    })

    it('應該處理 null 資料夾ID', () => {
      const key = CacheKeyGenerator.breadcrumbs(null)
      expect(key).toBe('breadcrumbs:root')
    })
  })

  describe('authStatus 方法', () => {
    it('應該生成認證狀態鍵', () => {
      const key = CacheKeyGenerator.authStatus()
      expect(key).toBe('auth:status')
    })
  })

  describe('custom 方法', () => {
    it('應該生成自定義鍵', () => {
      const key = CacheKeyGenerator.custom('mytype', 'myid')
      expect(key).toBe('mytype:myid')
    })

    it('應該處理無ID的情況', () => {
      const key = CacheKeyGenerator.custom('mytype')
      expect(key).toBe('mytype:default')
    })

    it('應該包含參數', () => {
      const params = { filter: 'active', limit: 10 }
      const key = CacheKeyGenerator.custom('users', 'list', params)
      expect(key).toBe('users:list?filter=active&limit=10')
    })

    it('應該將所有值轉換為字串', () => {
      const params = { count: 42, active: true, ratio: 3.14 }
      const key = CacheKeyGenerator.custom('stats', 'summary', params)
      expect(key).toBe('stats:summary?active=true&count=42&ratio=3.14')
    })
  })
})