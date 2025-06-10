import { chromium, FullConfig } from '@playwright/test';

/**
 * 全域測試設定
 * 在所有測試開始前執行一次
 */
async function globalSetup(config: FullConfig) {
  console.log('🧪 開始 MemoryArk 2.0 E2E 測試設定...');
  
  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:7001';
  
  // 啟動瀏覽器進行健康檢查
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log(`🔍 檢查伺服器健康狀態: ${baseURL}`);
    
    // 等待伺服器就緒
    let attempts = 0;
    const maxAttempts = 30; // 最多等待 30 次（30 秒）
    
    while (attempts < maxAttempts) {
      try {
        const response = await page.goto(`${baseURL}/api/health`, {
          timeout: 10000,
          waitUntil: 'networkidle'
        });
        
        if (response?.ok()) {
          console.log('✅ 伺服器健康檢查通過');
          break;
        }
        
        throw new Error(`伺服器回應狀態: ${response?.status()}`);
        
      } catch (error) {
        attempts++;
        console.log(`⏳ 等待伺服器啟動... (嘗試 ${attempts}/${maxAttempts})`);
        
        if (attempts >= maxAttempts) {
          throw new Error(`伺服器無法在 ${maxAttempts} 秒內啟動: ${error}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 檢查前端是否可訪問
    console.log('🌐 檢查前端可訪問性...');
    const frontendResponse = await page.goto(baseURL, {
      timeout: 10000,
      waitUntil: 'networkidle'
    });
    
    if (!frontendResponse?.ok()) {
      throw new Error(`前端無法訪問: ${frontendResponse?.status()}`);
    }
    
    console.log('✅ 前端可訪問性檢查通過');
    
    // 預熱系統（載入基本資料）
    console.log('🔥 系統預熱中...');
    
    // 模擬管理員登入檢查系統狀態
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'admin@94work.net'
    });
    
    // 預載入重要頁面
    const criticalPages = [
      '/api/auth/status',
      '/api/files?limit=1',
      '/api/categories'
    ];
    
    for (const endpoint of criticalPages) {
      try {
        const response = await page.goto(`${baseURL}${endpoint}`, {
          timeout: 5000
        });
        console.log(`  ✓ ${endpoint}: ${response?.status()}`);
      } catch (error) {
        console.log(`  ⚠️  ${endpoint}: 無法預載入`);
      }
    }
    
    console.log('✅ 系統預熱完成');
    
    // 建立測試資料快照
    console.log('📸 建立測試環境快照...');
    
    // 儲存初始系統狀態
    const systemState = {
      timestamp: new Date().toISOString(),
      serverStatus: 'healthy',
      baseURL: baseURL,
      environment: process.env.NODE_ENV || 'test'
    };
    
    // 儲存到檔案供測試使用
    const fs = await import('fs/promises');
    await fs.writeFile(
      './test-results/system-state.json', 
      JSON.stringify(systemState, null, 2)
    );
    
    console.log('✅ 測試環境設定完成');
    
  } catch (error) {
    console.error('❌ 全域設定失敗:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;