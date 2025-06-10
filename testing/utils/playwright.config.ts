import { defineConfig, devices } from '@playwright/test';

/**
 * MemoryArk 2.0 Playwright E2E 測試配置
 * 針對教會檔案管理系統的完整端到端測試
 */
export default defineConfig({
  // 測試檔案位置
  testDir: './e2e-tests',
  
  // 全域設定
  timeout: 30 * 1000, // 30 秒超時
  expect: {
    timeout: 5 * 1000, // 5 秒斷言超時
  },
  
  // 平行執行設定
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // CI 環境中禁止 .only
  retries: process.env.CI ? 2 : 0, // CI 環境重試 2 次
  workers: process.env.CI ? 1 : undefined, // CI 環境使用單一 worker
  
  // 測試報告
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['line'], // 終端輸出
  ],
  
  // 全域設定
  use: {
    // 基本設定
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:7001',
    
    // 追蹤設定
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 瀏覽器設定
    actionTimeout: 10 * 1000, // 10 秒操作超時
    navigationTimeout: 15 * 1000, // 15 秒導航超時
    
    // 語言設定
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
    
    // 權限設定
    permissions: ['clipboard-read', 'clipboard-write'],
    
    // 自動化設定
    headless: true, // CI 環境使用無頭模式
  },
  
  // 測試專案設定
  projects: [
    // 桌面瀏覽器測試
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 教會系統特定設定
        viewport: { width: 1920, height: 1080 },
        // 模擬 Cloudflare Access 環境
        extraHTTPHeaders: {
          'CF-Access-Authenticated-User-Email': 'test-admin@example.com',
        },
      },
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // 平板測試
    {
      name: 'tablet',
      use: { 
        ...devices['iPad Pro'],
        // 平板特定測試設定
      },
    },
    
    // 手機測試
    {
      name: 'mobile',
      use: { 
        ...devices['iPhone 13'],
        // 手機觸控和手勢測試
      },
    },
    
    // 管理員測試專案
    {
      name: 'admin-tests',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        extraHTTPHeaders: {
          'CF-Access-Authenticated-User-Email': 'admin@94work.net',
        },
      },
      testMatch: '**/admin/*.spec.ts',
    },
    
    // 一般用戶測試專案  
    {
      name: 'user-tests',
      use: { 
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'CF-Access-Authenticated-User-Email': 'user@example.com',
        },
      },
      testMatch: '**/user/*.spec.ts',
    },
    
    // 無障礙測試專案
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        // 輔助技術模擬
        forcedColors: 'active',
        reducedMotion: 'reduce',
      },
      testMatch: '**/accessibility/*.spec.ts',
    },
  ],
  
  // 全域設定鉤子
  globalSetup: require.resolve('./test-setup/global-setup.ts'),
  globalTeardown: require.resolve('./test-setup/global-teardown.ts'),
  
  // 輸出目錄
  outputDir: 'test-results/',
  
  // Web Server 設定（用於開發測試）
  webServer: process.env.E2E_START_SERVER ? {
    command: 'npm run dev',
    port: 3000,
    cwd: '../frontend',
    reuseExistingServer: !process.env.CI,
  } : undefined,
});