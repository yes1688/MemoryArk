# MemoryArk 2.0 E2E Testing Guide

## Overview

This comprehensive guide provides detailed information about MemoryArk 2.0's frontend architecture, user workflows, and recommendations for implementing End-to-End (E2E) testing using Playwright.

## Architecture Overview

### Technology Stack
- **Frontend**: Vue 3 + TypeScript + Tailwind CSS
- **State Management**: Pinia (Vue store)
- **Routing**: Vue Router 4
- **HTTP Client**: Axios
- **Testing**: Playwright (recommended)
- **Build Tool**: Vite
- **Design System**: Apple HIG + Windows 11 Fluent Design fusion

### Authentication Architecture
- **Primary**: Cloudflare Access (handles external authentication)
- **Secondary**: Internal user approval system
- **Multi-tier**: Cloudflare Auth → Registration → Admin Approval → Full Access

## User Journey Analysis

### 1. Authentication Flow

#### 1.1 Initial Access
```typescript
// Entry point: https://files.94work.net/
// Route Guard: src/router/index.ts (lines 82-135)

Flow:
1. Cloudflare Access Challenge
2. Internal Authentication Check
3. Route to appropriate view based on status
```

**Test Scenarios:**
- Unauthenticated user redirect to Cloudflare auth
- Authenticated but unregistered user redirect to registration
- Registered but pending user redirect to pending approval
- Fully authenticated user access to home

#### 1.2 Registration Process
```typescript
// Component: src/views/RegisterView.vue
// API: src/api/auth.ts (authApi.register)
// Store: src/stores/auth.ts

Key Elements:
- Name input (required): id="name"
- Phone input (optional): id="phone" 
- Reason textarea (optional): id="reason"
- Submit button: text="送出申請"
```

**Test Scenarios:**
- Form validation (required name field)
- Successful registration submission
- Error handling for network issues
- Auto-redirect after successful submission

#### 1.3 Pending Approval
```typescript
// Component: src/views/PendingApprovalView.vue
// Refresh functionality with manual status check

Key Elements:
- Status refresh button: text="重新檢查狀態"
- Loading state: text="檢查中..."
- Auto-redirect when approved
```

### 2. Main Application Workflows

#### 2.1 Home Dashboard
```typescript
// Component: src/views/HomeView.vue
// Store: src/stores/files.ts + src/stores/auth.ts

Key Elements:
- Greeting header: dynamic time-based greeting
- Statistics cards: file count, storage %, active users
- Quick action buttons:
  - Upload files: @click="navigateToAction('upload')"
  - Shared folder: @click="navigateToAction('shared')"  
  - Sabbath data: @click="navigateToAction('sabbath')"
  - All files: @click="navigateToAction('files')"
- Recent files widget: displays last 4 files
- Storage stats: progress bar with usage percentage
```

**Test Scenarios:**
- Dashboard loads with real data
- Quick action navigation works
- Storage stats display correctly
- Recent files update dynamically

#### 2.2 File Management
```typescript
// Component: src/views/FilesView.vue
// Store: src/stores/files.ts
// API: src/api/files.ts

Key UI Elements:
- Breadcrumb navigation: dynamically generated
- Search input: placeholder="搜尋檔案..."
- View mode toggle: grid/list buttons
- Upload button: text="上傳" 
- New folder button: text="新資料夾"
- File cards: with hover actions (download, delete)
```

**File Operations:**
1. **Upload Files**
   ```typescript
   // Component: src/components/UploadModal.vue
   // Drag & drop zone + file picker
   // Progress tracking: uploadProgress ref
   ```

2. **Create Folders**
   ```typescript
   // Component: src/components/CreateFolderModal.vue
   // Name input + parent folder selection
   ```

3. **File Actions**
   - Download: window.open(downloadUrl)
   - Delete: confirmation dialog + API call
   - Rename: inline editing
   - Move: drag & drop or context menu

**Test Scenarios:**
- File upload (single & multiple files)
- Folder creation and navigation
- Search functionality
- View mode switching
- File operations (download, delete, rename)
- Breadcrumb navigation

#### 2.3 Shared Resources
```typescript
// Component: src/views/SharedFolderView.vue
// Categorized church resource management

Key Features:
- Category sidebar: dynamic church categories
- Resource grid/list view
- Upload contributions
- Subscription notifications
- Download tracking
```

#### 2.4 Sabbath Data Management  
```typescript
// Component: src/views/SabbathDataView.vue
// Specialized view for church meeting data

Key Features:
- Date-based filtering
- Meeting type categorization
- Quick access to recent Sabbath files
```

#### 2.5 Admin Panel
```typescript
// Component: src/views/AdminView.vue
// Requires admin role: meta.requiresAdmin = true

Key Sections:
- System Statistics: AdminStats.vue
- User Management: AdminUsers.vue  
- Registration Approval: AdminRegistrations.vue
- File Management: AdminFiles.vue
```

## API Integration Patterns

### API Configuration
```typescript
// Base setup: src/api/index.ts
// Dynamic base URL: files.94work.net or localhost:7001
// Automatic Cloudflare Access header injection
// Error handling with redirect logic
```

### Key API Endpoints
```typescript
// Authentication
POST /api/auth/register
GET  /api/auth/status
GET  /api/auth/me

// File Management  
GET  /api/files?parent_id=X
POST /api/files/upload
POST /api/folders
PUT  /api/folders/{id}/rename
DELETE /api/files/{id}

// Admin
GET  /api/admin/users
GET  /api/admin/registrations  
PUT  /api/admin/registrations/{id}/approve
GET  /api/admin/stats
```

## Component Architecture

### UI Component System
```typescript
// Location: src/components/ui/
// Design: Apple HIG + Windows 11 Fluent fusion
// Key components:

AppButton: src/components/ui/button/AppButton.vue
- Variants: primary, secondary, danger, ghost, outline
- Sizes: small, medium, large
- Props: loading, disabled, fullWidth
- Test targets: variant classes, click events, loading states

AppInput: src/components/ui/input/AppInput.vue  
- Types: text, email, password, search, tel, url, number
- Features: prefix/suffix icons, clearable, validation
- Test targets: input events, validation, clear functionality

AppDialog: src/components/ui/dialog/AppDialog.vue
- Sizes: small, medium, large, xlarge, fullscreen
- Features: overlay close, escape key, focus management
- Test targets: open/close, keyboard navigation, focus trap
```

### File Upload Components
```typescript
// Primary: src/components/UploadModal.vue
// Secondary: src/components/FileUploader.vue

Key Features:
- Drag & drop support
- Multiple file selection  
- Progress tracking
- File type validation (100MB limit)
- Preview for images
```

## State Management (Pinia)

### Auth Store
```typescript
// Location: src/stores/auth.ts
// Manages: user session, auth status, registration flow

Key State:
- user: User | null
- authStatus: AuthStatus | null  
- isAuthenticated: computed boolean
- hasCloudflareAccess: computed boolean
- needsRegistration: computed boolean
- pendingApproval: computed boolean

Key Actions:
- checkAuthStatus(): validates current auth
- register(data): submits registration
- refreshAuth(): re-checks status
```

### Files Store  
```typescript
// Location: src/stores/files.ts
// Manages: file operations, navigation, uploads

Key State:
- files: FileInfo[]
- currentFolder: FileInfo | null
- breadcrumbs: BreadcrumbItem[]
- selectedFiles: FileInfo[]
- uploadProgress: number

Key Actions:
- fetchFiles(folderId): loads file list
- uploadFile(file, folderId): handles upload
- createFolder(name, parentId): creates folder
- navigateToFolder(folderId): handles navigation
- deleteFiles(fileIds): moves to trash
```

## E2E Testing Strategy

### Recommended Test Structure
```typescript
// tests/e2e/
├── auth/
│   ├── cloudflare-auth.spec.ts
│   ├── registration.spec.ts
│   └── pending-approval.spec.ts
├── dashboard/
│   ├── home-view.spec.ts
│   └── quick-actions.spec.ts
├── files/
│   ├── file-upload.spec.ts
│   ├── file-management.spec.ts
│   ├── folder-navigation.spec.ts
│   └── search-functionality.spec.ts
├── shared/
│   └── shared-resources.spec.ts
├── sabbath/
│   └── sabbath-data.spec.ts
└── admin/
    ├── user-management.spec.ts
    ├── registration-approval.spec.ts
    └── system-stats.spec.ts
```

### Critical Test Scenarios

#### 1. Authentication Flow Tests
```typescript
// Test: Cloudflare Access Integration
test('should redirect unauthenticated users to Cloudflare auth', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/cloudflare-auth/);
});

// Test: Registration Process
test('should complete user registration successfully', async ({ page }) => {
  await page.goto('/register');
  await page.fill('#name', 'Test User');
  await page.fill('#phone', '0987654321');
  await page.fill('#reason', 'Testing purpose');
  await page.click('button[type="submit"]');
  await expect(page.locator('.success-message')).toBeVisible();
});

// Test: Admin Approval Flow
test('admin should approve pending registrations', async ({ page }) => {
  // Login as admin
  await page.goto('/admin');
  await page.click('[data-tab="registrations"]');
  await page.click('[data-action="approve"]:first-child');
  await expect(page.locator('.approval-success')).toBeVisible();
});
```

#### 2. File Management Tests
```typescript
// Test: File Upload
test('should upload files successfully', async ({ page }) => {
  await page.goto('/files');
  await page.click('button:has-text("上傳")');
  
  // Upload via file picker
  const fileChooser = await page.waitForEvent('filechooser');
  await fileChooser.setFiles('./test-files/sample.pdf');
  
  await page.click('button:has-text("開始上傳")');
  await expect(page.locator('.upload-progress')).toBeVisible();
  await expect(page.locator('.upload-success')).toBeVisible();
});

// Test: Folder Navigation
test('should navigate folder hierarchy correctly', async ({ page }) => {
  await page.goto('/files');
  
  // Create folder
  await page.click('button:has-text("新資料夾")');
  await page.fill('input[name="folderName"]', 'Test Folder');
  await page.click('button:has-text("建立")');
  
  // Navigate into folder
  await page.click('[data-folder="Test Folder"]');
  await expect(page.locator('.breadcrumbs')).toContainText('Test Folder');
  
  // Navigate back
  await page.click('.breadcrumbs a:has-text("根目錄")');
  await expect(page.locator('.breadcrumbs')).not.toContainText('Test Folder');
});

// Test: Search Functionality
test('should search files correctly', async ({ page }) => {
  await page.goto('/files');
  await page.fill('input[placeholder="搜尋檔案..."]', 'test');
  await expect(page.locator('.file-card')).toHaveCount(0); // or expected count
});
```

#### 3. UI Component Tests
```typescript
// Test: AppButton Component
test('button should handle loading state', async ({ page }) => {
  await page.goto('/upload');
  await page.click('button:has-text("開始上傳")');
  await expect(page.locator('button:has-text("上傳中...")')).toBeVisible();
  await expect(page.locator('.animate-spin')).toBeVisible();
});

// Test: AppDialog Component  
test('dialog should close on escape key', async ({ page }) => {
  await page.goto('/files');
  await page.click('button:has-text("上傳")');
  await expect(page.locator('.dialog-overlay')).toBeVisible();
  
  await page.keyboard.press('Escape');
  await expect(page.locator('.dialog-overlay')).not.toBeVisible();
});

// Test: File Drag & Drop
test('should support drag and drop file upload', async ({ page }) => {
  await page.goto('/files');
  await page.click('button:has-text("上傳")');
  
  // Simulate drag & drop
  await page.setInputFiles('.file-drop-zone input[type="file"]', './test-files/sample.pdf');
  await expect(page.locator('.selected-files')).toContainText('sample.pdf');
});
```

### Performance Testing
```typescript
// Test: Large File Upload
test('should handle large file uploads with progress', async ({ page }) => {
  test.setTimeout(60000); // 1 minute timeout
  
  await page.goto('/files');
  await page.click('button:has-text("上傳")');
  
  // Upload large file (within 100MB limit)
  const fileChooser = await page.waitForEvent('filechooser');
  await fileChooser.setFiles('./test-files/large-video.mp4');
  
  await page.click('button:has-text("開始上傳")');
  
  // Monitor progress
  const progressBar = page.locator('.upload-progress .bg-blue-600');
  await expect(progressBar).toBeVisible();
  
  // Wait for completion
  await expect(page.locator('.upload-success')).toBeVisible({ timeout: 60000 });
});
```

### Mobile Responsiveness Tests
```typescript
// Test: Mobile View
test('should adapt to mobile screen sizes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  await page.goto('/');
  
  // Check responsive navigation
  await expect(page.locator('.mobile-menu')).toBeVisible();
  
  // Check responsive file grid
  await page.goto('/files');
  await expect(page.locator('.files-grid')).toHaveClass(/grid-cols-2/);
});
```

## Test Data Management

### Mock Data Setup
```typescript
// Mock user data for different auth states
const testUsers = {
  admin: { email: 'admin@test.com', role: 'admin' },
  user: { email: 'user@test.com', role: 'user' },
  pending: { email: 'pending@test.com', status: 'pending' }
};

// Mock file data for testing
const testFiles = [
  { name: 'test-document.pdf', size: 1024000, type: 'application/pdf' },
  { name: 'test-image.jpg', size: 512000, type: 'image/jpeg' },
  { name: 'test-video.mp4', size: 5120000, type: 'video/mp4' }
];
```

### Environment Configuration
```typescript
// Test environment variables
const testConfig = {
  baseURL: 'http://localhost:5173',
  apiURL: 'http://localhost:7001/api',
  timeout: 30000,
  retries: 2
};
```

## Browser Compatibility Testing

### Target Browsers
- Chrome (latest)
- Firefox (latest)  
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Android Chrome)

### Playwright Configuration
```typescript
// playwright.config.ts example
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } }
  ]
});
```

## Accessibility Testing

### Key Areas to Test
- Keyboard navigation throughout all views
- Screen reader compatibility (ARIA labels)
- Focus management in modals
- Color contrast compliance
- Alt text for images

```typescript
// Test: Keyboard Navigation
test('should support full keyboard navigation', async ({ page }) => {
  await page.goto('/');
  
  // Tab through all interactive elements
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  
  // Test modal focus trap
  await page.click('button:has-text("上傳")');
  await page.keyboard.press('Tab');
  await expect(page.locator('.dialog-content :focus')).toBeVisible();
});
```

## Integration Testing

### API Integration Tests
```typescript
// Test: API Error Handling
test('should handle API errors gracefully', async ({ page }) => {
  // Mock API failure
  await page.route('/api/files', route => route.abort());
  
  await page.goto('/files');
  await expect(page.locator('.error-message')).toBeVisible();
  await expect(page.locator('.error-message')).toContainText('網路連線錯誤');
});
```

### State Persistence Tests
```typescript
// Test: Store State Persistence
test('should maintain state across page reloads', async ({ page }) => {
  await page.goto('/files');
  await page.fill('input[placeholder="搜尋檔案..."]', 'test query');
  
  await page.reload();
  // Note: Search state might not persist - depends on implementation
  // Test actual persistence behavior
});
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install
        
      - name: Start application
        run: npm run dev &
        
      - name: Run E2E tests
        run: npx playwright test
        
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Conclusion

This guide provides a comprehensive foundation for implementing E2E testing for MemoryArk 2.0. The testing strategy covers:

1. **User Authentication Flow** - Multi-tier auth system
2. **Core File Management** - Upload, organize, share
3. **Admin Functionality** - User management, approvals
4. **UI Component Testing** - Design system components
5. **Performance & Accessibility** - Cross-browser, responsive, accessible

The Vue 3 + TypeScript architecture with Pinia state management provides clear separation of concerns, making it ideal for comprehensive E2E testing with Playwright.

Key priorities for initial test implementation:
1. Authentication flow (critical path)
2. File upload and management (core functionality)  
3. Admin approval workflow (business critical)
4. Mobile responsiveness (user experience)
5. Error handling and edge cases (robustness)

This foundation should enable robust, maintainable E2E test suites that ensure MemoryArk 2.0's reliability and user experience quality.