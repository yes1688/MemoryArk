import { test, expect } from '@playwright/test';

/**
 * 認證流程 E2E 測試
 * 測試 MemoryArk 2.0 的雙層認證系統
 */

test.describe('Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // 清除所有認證狀態
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('未認證用戶被重定向到訪問拒絕頁面', async ({ page }) => {
    // 嘗試訪問需要認證的頁面
    await page.goto('/files');
    
    // 應該被重定向到訪問拒絕頁面
    await expect(page).toHaveURL('/access-denied');
    
    // 檢查頁面內容
    await expect(page.locator('h1')).toContainText('訪問被拒絕');
    await expect(page.locator('[data-testid="access-denied-message"]')).toBeVisible();
  });

  test('Cloudflare 認證但未註冊用戶被重定向到註冊頁面', async ({ page }) => {
    // 模擬 Cloudflare 認證但用戶未在系統中註冊
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'newuser@example.com'
    });
    
    await page.goto('/');
    
    // 應該被重定向到註冊頁面
    await expect(page).toHaveURL('/register');
    
    // 檢查註冊表單
    await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-display"]')).toContainText('newuser@example.com');
  });

  test('註冊流程完整測試', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    
    // 模擬 Cloudflare 認證
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': testEmail
    });
    
    await page.goto('/register');
    
    // 填寫註冊表單
    await page.fill('[data-testid="name-input"]', '測試用戶');
    await page.fill('[data-testid="phone-input"]', '0912345678');
    await page.fill('[data-testid="reason-textarea"]', '我想使用系統管理教會檔案');
    
    // 提交註冊
    await page.click('[data-testid="submit-button"]');
    
    // 檢查提交狀態
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('註冊申請已提交');
    
    // 應該被重定向到待審核頁面
    await expect(page).toHaveURL('/pending-approval');
  });

  test('待審核用戶看到正確的狀態頁面', async ({ page }) => {
    // 模擬待審核用戶
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'pending@example.com'
    });
    
    // 模擬 API 回應
    await page.route('/api/auth/status', async route => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            authenticated: true,
            user: null,
            registrationStatus: 'pending'
          }
        })
      });
    });
    
    await page.goto('/');
    
    // 應該在待審核頁面
    await expect(page).toHaveURL('/pending-approval');
    
    // 檢查頁面內容
    await expect(page.locator('[data-testid="pending-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-message"]')).toContainText('等待管理員審核');
  });

  test('已認證用戶可以正常訪問系統', async ({ page }) => {
    // 模擬已認證用戶
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'user@example.com'
    });
    
    // 模擬 API 回應
    await page.route('/api/auth/status', async route => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            authenticated: true,
            user: {
              id: 1,
              email: 'user@example.com',
              name: '測試用戶',
              role: 'user',
              status: 'active'
            }
          }
        })
      });
    });
    
    await page.goto('/');
    
    // 應該在主頁
    await expect(page).toHaveURL('/');
    
    // 檢查主頁元素
    await expect(page.locator('[data-testid="welcome-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-name"]')).toContainText('測試用戶');
    
    // 檢查導航功能
    await expect(page.locator('[data-testid="nav-files"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-shared"]')).toBeVisible();
  });

  test('管理員用戶可以訪問管理功能', async ({ page }) => {
    // 模擬管理員用戶
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'admin@example.com'
    });
    
    // 模擬 API 回應
    await page.route('/api/auth/**', async route => {
      if (route.request().url().includes('/status')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              authenticated: true,
              user: {
                id: 1,
                email: 'admin@example.com',
                name: '管理員',
                role: 'admin',
                status: 'active'
              }
            }
          })
        });
      } else {
        route.continue();
      }
    });
    
    await page.goto('/');
    
    // 檢查管理員專用導航
    await expect(page.locator('[data-testid="nav-admin"]')).toBeVisible();
    
    // 測試訪問管理頁面
    await page.click('[data-testid="nav-admin"]');
    await expect(page).toHaveURL('/admin');
    
    // 檢查管理功能
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
  });

  test('登出功能正常運作', async ({ page }) => {
    // 模擬已認證用戶
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'user@example.com'
    });
    
    await page.goto('/');
    
    // 找到並點擊登出按鈕
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // 檢查是否清除認證狀態
    const localStorageData = await page.evaluate(() => localStorage.getItem('user'));
    expect(localStorageData).toBeNull();
    
    // 應該被重定向到訪問拒絕頁面
    await expect(page).toHaveURL('/access-denied');
  });

  test('註冊表單驗證', async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'test@example.com'
    });
    
    await page.goto('/register');
    
    // 測試必填欄位驗證
    await page.click('[data-testid="submit-button"]');
    
    // 檢查錯誤訊息
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="name-error"]')).toContainText('姓名為必填項目');
    
    // 測試無效手機號碼
    await page.fill('[data-testid="name-input"]', '測試用戶');
    await page.fill('[data-testid="phone-input"]', '123'); // 無效格式
    await page.click('[data-testid="submit-button"]');
    
    await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('請輸入有效的手機號碼');
    
    // 修正後應該可以提交
    await page.fill('[data-testid="phone-input"]', '0912345678');
    await page.click('[data-testid="submit-button"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('認證狀態持久性', async ({ page, context }) => {
    // 設定認證
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'user@example.com'
    });
    
    await page.goto('/');
    
    // 檢查認證狀態
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    
    // 新開分頁
    const newPage = await context.newPage();
    await newPage.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'user@example.com'
    });
    
    await newPage.goto('/files');
    
    // 新分頁也應該保持認證狀態
    await expect(newPage.locator('[data-testid="files-list"]')).toBeVisible();
    
    await newPage.close();
  });

  test('多重視窗認證同步', async ({ context }) => {
    // 第一個視窗
    const page1 = await context.newPage();
    await page1.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'user@example.com'
    });
    
    await page1.goto('/');
    
    // 第二個視窗
    const page2 = await context.newPage();
    await page2.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'user@example.com'
    });
    
    await page2.goto('/files');
    
    // 兩個視窗都應該正常認證
    await expect(page1.locator('[data-testid="user-name"]')).toBeVisible();
    await expect(page2.locator('[data-testid="files-list"]')).toBeVisible();
    
    // 在一個視窗登出
    await page1.click('[data-testid="user-menu"]');
    await page1.click('[data-testid="logout-button"]');
    
    // 檢查另一個視窗是否同步更新（需要實作 broadcast channel 或類似機制）
    await page2.reload();
    await expect(page2).toHaveURL('/access-denied');
    
    await page1.close();
    await page2.close();
  });
});

test.describe('Authentication Security', () => {
  
  test('防止 header 偽造攻擊', async ({ page }) => {
    // 嘗試偽造認證 header
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'admin@fake.com',
      'X-Forwarded-For': '127.0.0.1',
      'X-Real-IP': '127.0.0.1'
    });
    
    await page.goto('/admin');
    
    // 應該被拒絕或重定向（取決於實際的安全實作）
    const url = page.url();
    expect(url).not.toContain('/admin');
  });

  test('會話超時處理', async ({ page }) => {
    // 模擬會話超時
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'user@example.com'
    });
    
    await page.goto('/');
    
    // 模擬伺服器回傳 401
    await page.route('/api/**', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '會話已過期' }
        })
      });
    });
    
    // 觸發 API 請求
    await page.click('[data-testid="nav-files"]');
    
    // 應該顯示錯誤訊息或重定向到登入
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});