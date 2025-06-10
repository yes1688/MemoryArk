import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * 檔案管理核心功能 E2E 測試
 * 測試 MemoryArk 2.0 的檔案上傳、瀏覽、管理功能
 */

test.describe('File Management', () => {
  
  test.beforeEach(async ({ page }) => {
    // 設定為已認證用戶
    await page.setExtraHTTPHeaders({
      'CF-Access-Authenticated-User-Email': 'user@example.com'
    });
    
    // 模擬基本認證 API
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
  });

  test('檔案列表頁面載入和顯示', async ({ page }) => {
    // 模擬檔案列表 API
    await page.route('/api/files*', async route => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 1,
                name: '測試文件.pdf',
                size: 1024000,
                virtualPath: '/documents/測試文件.pdf',
                mimeType: 'application/pdf',
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z'
              },
              {
                id: 2,
                name: '圖片檔案.jpg',
                size: 512000,
                virtualPath: '/images/圖片檔案.jpg',
                mimeType: 'image/jpeg',
                createdAt: '2025-01-02T00:00:00Z',
                updatedAt: '2025-01-02T00:00:00Z'
              }
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1
            }
          }
        })
      });
    });
    
    await page.goto('/files');
    
    // 檢查頁面標題
    await expect(page.locator('[data-testid="page-title"]')).toContainText('檔案管理');
    
    // 檢查檔案列表
    await expect(page.locator('[data-testid="file-item"]')).toHaveCount(2);
    
    // 檢查第一個檔案的資訊
    const firstFile = page.locator('[data-testid="file-item"]').first();
    await expect(firstFile.locator('[data-testid="file-name"]')).toContainText('測試文件.pdf');
    await expect(firstFile.locator('[data-testid="file-size"]')).toContainText('1.0 MB');
    
    // 檢查檔案操作按鈕
    await expect(firstFile.locator('[data-testid="download-button"]')).toBeVisible();
    await expect(firstFile.locator('[data-testid="more-actions"]')).toBeVisible();
  });

  test('檔案上傳流程', async ({ page }) => {
    let uploadRequestBody = null;
    
    // 攔截上傳請求
    await page.route('/api/files/upload', async route => {
      uploadRequestBody = await route.request().postData();
      
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 3,
            name: 'test-upload.txt',
            size: 1024,
            virtualPath: '/uploads/test-upload.txt',
            message: '檔案上傳成功'
          }
        })
      });
    });
    
    await page.goto('/files');
    
    // 開啟上傳模態
    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();
    
    // 建立測試檔案
    const testContent = 'This is a test file content for E2E testing.';
    const testFile = Buffer.from(testContent);
    
    // 上傳檔案
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([{
      name: 'test-upload.txt',
      mimeType: 'text/plain',
      buffer: testFile
    }]);
    
    // 設定虛擬路徑
    await page.fill('[data-testid="virtual-path-input"]', '/uploads/test-upload.txt');
    
    // 選擇分類
    await page.selectOption('[data-testid="category-select"]', '1');
    
    // 確認上傳
    await page.click('[data-testid="confirm-upload"]');
    
    // 檢查上傳進度
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    
    // 檢查上傳成功訊息
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('檔案上傳成功');
    
    // 模態應該關閉
    await expect(page.locator('[data-testid="upload-modal"]')).not.toBeVisible();
    
    // 驗證請求內容
    expect(uploadRequestBody).toContain('test-upload.txt');
  });

  test('拖放檔案上傳', async ({ page }) => {
    await page.route('/api/files/upload', async route => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 4,
            name: 'drag-drop-file.pdf',
            size: 2048,
            message: '拖放上傳成功'
          }
        })
      });
    });
    
    await page.goto('/files');
    
    // 檢查拖放區域
    const dropZone = page.locator('[data-testid="drop-zone"]');
    await expect(dropZone).toBeVisible();
    
    // 模擬拖放操作
    const testFile = Buffer.from('PDF content here...');
    
    // 觸發拖入事件
    await dropZone.dispatchEvent('dragenter', {
      dataTransfer: {
        files: [{
          name: 'drag-drop-file.pdf',
          type: 'application/pdf',
          size: 2048
        }]
      }
    });
    
    // 檢查拖放視覺回饋
    await expect(dropZone).toHaveClass(/drag-over/);
    
    // 模擬放下檔案
    await dropZone.setInputFiles([{
      name: 'drag-drop-file.pdf',
      mimeType: 'application/pdf',
      buffer: testFile
    }]);
    
    // 檢查檔案被加入上傳佇列
    await expect(page.locator('[data-testid="upload-queue-item"]')).toBeVisible();
    
    // 開始上傳
    await page.click('[data-testid="start-upload"]');
    
    // 檢查成功訊息
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('拖放上傳成功');
  });

  test('檔案搜尋功能', async ({ page }) => {
    // 模擬搜尋 API
    await page.route('/api/files*', async route => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');
      
      let items = [];
      if (search === '測試') {
        items = [
          {
            id: 1,
            name: '測試文件.pdf',
            size: 1024000,
            virtualPath: '/documents/測試文件.pdf',
            mimeType: 'application/pdf'
          }
        ];
      }
      
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items, pagination: { page: 1, total: items.length } }
        })
      });
    });
    
    await page.goto('/files');
    
    // 輸入搜尋關鍵字
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('測試');
    
    // 檢查搜尋結果
    await expect(page.locator('[data-testid="file-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="file-name"]')).toContainText('測試文件.pdf');
    
    // 清除搜尋
    await searchInput.clear();
    await page.keyboard.press('Enter');
    
    // 應該顯示所有檔案（重新載入）
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
  });

  test('檔案篩選功能', async ({ page }) => {
    // 模擬分類 API
    await page.route('/api/categories', async route => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 1, name: '文件', path: '/documents' },
            { id: 2, name: '圖片', path: '/images' },
            { id: 3, name: '影片', path: '/videos' }
          ]
        })
      });
    });
    
    // 模擬篩選結果
    await page.route('/api/files*', async route => {
      const url = new URL(route.request().url());
      const category = url.searchParams.get('categoryId');
      
      let items = [];
      if (category === '2') {
        items = [
          {
            id: 2,
            name: '圖片檔案.jpg',
            size: 512000,
            virtualPath: '/images/圖片檔案.jpg',
            mimeType: 'image/jpeg',
            categoryId: 2
          }
        ];
      }
      
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items, pagination: { page: 1, total: items.length } }
        })
      });
    });
    
    await page.goto('/files');
    
    // 開啟篩選器
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
    
    // 選擇分類篩選
    await page.selectOption('[data-testid="category-filter"]', '2');
    
    // 套用篩選
    await page.click('[data-testid="apply-filter"]');
    
    // 檢查篩選結果
    await expect(page.locator('[data-testid="file-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="file-name"]')).toContainText('圖片檔案.jpg');
    
    // 檢查篩選指示器
    await expect(page.locator('[data-testid="active-filter"]')).toContainText('圖片');
  });

  test('檔案下載功能', async ({ page }) => {
    // 模擬下載 API
    await page.route('/api/files/1/download', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="測試文件.pdf"',
          'Content-Length': '1024000'
        },
        body: Buffer.from('PDF file content...')
      });
    });
    
    await page.goto('/files');
    
    // 設定下載監聽
    const downloadPromise = page.waitForEvent('download');
    
    // 點擊下載按鈕
    await page.click('[data-testid="file-item"]').first();
    await page.click('[data-testid="download-button"]');
    
    // 等待下載開始
    const download = await downloadPromise;
    
    // 檢查下載檔案名稱
    expect(download.suggestedFilename()).toBe('測試文件.pdf');
    
    // 檢查下載成功提示
    await expect(page.locator('[data-testid="download-success"]')).toBeVisible();
  });

  test('檔案重新命名', async ({ page }) => {
    // 模擬重新命名 API
    await page.route('/api/files/1', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              name: '新檔案名稱.pdf',
              message: '檔案重新命名成功'
            }
          })
        });
      }
    });
    
    await page.goto('/files');
    
    // 右鍵點擊檔案
    await page.click('[data-testid="file-item"]').first({ button: 'right' });
    
    // 選擇重新命名
    await page.click('[data-testid="context-menu-rename"]');
    
    // 檢查重新命名對話框
    await expect(page.locator('[data-testid="rename-dialog"]')).toBeVisible();
    
    // 輸入新名稱
    const nameInput = page.locator('[data-testid="new-name-input"]');
    await nameInput.clear();
    await nameInput.fill('新檔案名稱.pdf');
    
    // 確認重新命名
    await page.click('[data-testid="confirm-rename"]');
    
    // 檢查成功訊息
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('檔案重新命名成功');
    
    // 對話框應該關閉
    await expect(page.locator('[data-testid="rename-dialog"]')).not.toBeVisible();
  });

  test('檔案刪除功能', async ({ page }) => {
    // 模擬刪除 API
    await page.route('/api/files/1', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: '檔案已移至回收桶'
          })
        });
      }
    });
    
    await page.goto('/files');
    
    // 選擇檔案
    await page.click('[data-testid="file-checkbox"]').first();
    
    // 點擊刪除按鈕
    await page.click('[data-testid="delete-button"]');
    
    // 確認刪除對話框
    await expect(page.locator('[data-testid="delete-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-warning"]')).toContainText('將檔案移至回收桶');
    
    // 確認刪除
    await page.click('[data-testid="confirm-delete"]');
    
    // 檢查成功訊息
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('檔案已移至回收桶');
    
    // 檔案應該從列表中消失
    await expect(page.locator('[data-testid="file-item"]')).toHaveCount(1);
  });

  test('批量檔案操作', async ({ page }) => {
    await page.goto('/files');
    
    // 選擇多個檔案
    await page.click('[data-testid="file-checkbox"]').first();
    await page.click('[data-testid="file-checkbox"]').nth(1);
    
    // 檢查批量操作工具列
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('已選擇 2 個檔案');
    
    // 檢查批量操作按鈕
    await expect(page.locator('[data-testid="bulk-download"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-delete"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-move"]')).toBeVisible();
    
    // 取消選擇
    await page.click('[data-testid="clear-selection"]');
    
    // 批量操作工具列應該隱藏
    await expect(page.locator('[data-testid="bulk-actions"]')).not.toBeVisible();
  });

  test('檔案預覽功能', async ({ page }) => {
    await page.goto('/files');
    
    // 雙擊檔案開啟預覽
    await page.dblclick('[data-testid="file-item"]').first();
    
    // 檢查預覽模態
    await expect(page.locator('[data-testid="file-preview-modal"]')).toBeVisible();
    
    // 檢查預覽控制項
    await expect(page.locator('[data-testid="preview-toolbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="zoom-in"]')).toBeVisible();
    await expect(page.locator('[data-testid="zoom-out"]')).toBeVisible();
    await expect(page.locator('[data-testid="rotate"]')).toBeVisible();
    
    // 關閉預覽
    await page.click('[data-testid="close-preview"]');
    await expect(page.locator('[data-testid="file-preview-modal"]')).not.toBeVisible();
  });

  test('檔案分享連結生成', async ({ page }) => {
    // 模擬分享連結 API
    await page.route('/api/files/1/share', async route => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            shareUrl: 'https://files.94work.net/share/abc123',
            expiresAt: '2025-01-31T23:59:59Z',
            message: '分享連結已生成'
          }
        })
      });
    });
    
    await page.goto('/files');
    
    // 右鍵選單
    await page.click('[data-testid="file-item"]').first({ button: 'right' });
    await page.click('[data-testid="context-menu-share"]');
    
    // 檢查分享對話框
    await expect(page.locator('[data-testid="share-dialog"]')).toBeVisible();
    
    // 生成分享連結
    await page.click('[data-testid="generate-share-link"]');
    
    // 檢查生成的連結
    await expect(page.locator('[data-testid="share-url"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-url"]')).toHaveValue('https://files.94work.net/share/abc123');
    
    // 複製連結功能
    await page.click('[data-testid="copy-share-link"]');
    await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
  });
});

test.describe('File Management Error Handling', () => {
  
  test('上傳失敗處理', async ({ page }) => {
    // 模擬上傳失敗
    await page.route('/api/files/upload', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: '檔案大小超過限制'
          }
        })
      });
    });
    
    await page.goto('/files');
    
    // 嘗試上傳檔案
    await page.click('[data-testid="upload-button"]');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([{
      name: 'large-file.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(10 * 1024 * 1024) // 10MB
    }]);
    
    await page.click('[data-testid="confirm-upload"]');
    
    // 檢查錯誤訊息
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('檔案大小超過限制');
  });

  test('網路錯誤處理', async ({ page }) => {
    // 模擬網路錯誤
    await page.route('/api/files*', async route => {
      await route.abort('failed');
    });
    
    await page.goto('/files');
    
    // 檢查錯誤狀態
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // 測試重試功能
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
  });
});