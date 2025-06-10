import { FullConfig } from '@playwright/test';

/**
 * 全域測試清理
 * 在所有測試結束後執行一次
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 開始 MemoryArk 2.0 E2E 測試清理...');
  
  try {
    // 清理測試產生的檔案
    console.log('📂 清理測試檔案...');
    
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // 清理暫存檔案
    const tempFiles = [
      './test-results/temp-uploads',
      './test-results/screenshots/temp',
    ];
    
    for (const tempPath of tempFiles) {
      try {
        await fs.rm(tempPath, { recursive: true, force: true });
        console.log(`  ✓ 已清理: ${tempPath}`);
      } catch (error) {
        console.log(`  ⚠️  無法清理: ${tempPath}`);
      }
    }
    
    // 產生測試摘要報告
    console.log('📊 產生測試摘要...');
    
    try {
      // 讀取測試結果
      const resultsPath = './test-results/results.json';
      let testResults = null;
      
      try {
        const resultsData = await fs.readFile(resultsPath, 'utf-8');
        testResults = JSON.parse(resultsData);
      } catch (error) {
        console.log('  ⚠️  無法讀取測試結果檔案');
      }
      
      // 建立摘要
      const summary = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test',
        baseURL: config.projects[0].use?.baseURL || 'http://localhost:7001',
        totalProjects: config.projects.length,
        cleanup: {
          tempFilesRemoved: tempFiles.length,
          status: 'completed'
        }
      };
      
      if (testResults) {
        summary.testResults = {
          totalSuites: testResults.suites?.length || 0,
          totalTests: testResults.stats?.total || 0,
          passed: testResults.stats?.passed || 0,
          failed: testResults.stats?.failed || 0,
          skipped: testResults.stats?.skipped || 0,
          duration: testResults.stats?.duration || 0
        };
      }
      
      // 儲存摘要
      await fs.writeFile(
        './test-results/test-summary.json',
        JSON.stringify(summary, null, 2)
      );
      
      console.log('✅ 測試摘要已產生');
      
      // 顯示測試結果統計
      if (summary.testResults) {
        console.log('\n📈 測試執行統計:');
        console.log(`  總測試數: ${summary.testResults.totalTests}`);
        console.log(`  通過: ${summary.testResults.passed}`);
        console.log(`  失敗: ${summary.testResults.failed}`);
        console.log(`  跳過: ${summary.testResults.skipped}`);
        console.log(`  執行時間: ${(summary.testResults.duration / 1000).toFixed(2)} 秒`);
      }
      
    } catch (error) {
      console.log('  ⚠️  無法產生測試摘要:', error.message);
    }
    
    // 檢查是否需要保留測試結果
    const keepResults = process.env.KEEP_TEST_RESULTS === 'true' || process.env.CI;
    
    if (!keepResults) {
      console.log('🗑️  清理測試結果檔案...');
      
      const resultsToClean = [
        './test-results/temp',
        './test-results/system-state.json'
      ];
      
      for (const resultPath of resultsToClean) {
        try {
          await fs.rm(resultPath, { recursive: true, force: true });
          console.log(`  ✓ 已清理: ${resultPath}`);
        } catch (error) {
          // 忽略清理錯誤
        }
      }
    } else {
      console.log('💾 保留測試結果檔案 (CI 環境或 KEEP_TEST_RESULTS=true)');
    }
    
    // 最終狀態檢查
    console.log('🔍 最終狀態檢查...');
    
    // 簡單的連線檢查確保系統仍正常運行
    const baseURL = config.projects[0].use?.baseURL;
    if (baseURL) {
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${baseURL}/api/health`, {
          timeout: 5000
        });
        
        if (response.ok) {
          console.log('✅ 系統狀態正常');
        } else {
          console.log('⚠️  系統狀態異常，可能需要檢查');
        }
      } catch (error) {
        console.log('⚠️  無法連接到系統，可能已關閉');
      }
    }
    
    console.log('✅ E2E 測試清理完成');
    
  } catch (error) {
    console.error('❌ 全域清理失敗:', error);
    // 不拋出錯誤，避免影響測試結果
  }
}

export default globalTeardown;