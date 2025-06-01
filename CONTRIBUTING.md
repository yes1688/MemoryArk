# 貢獻指南

感謝您對 MemoryArk 2.0 專案的興趣！本文檔將指導您如何參與專案貢獻。

## 目錄

- [開發環境設置](#開發環境設置)
- [代碼風格](#代碼風格)
- [提交流程](#提交流程)
- [Issue 報告](#issue-報告)
- [Pull Request 流程](#pull-request-流程)
- [代碼審查](#代碼審查)

## 開發環境設置

### 前置需求

- Go 1.21 或更高版本
- Node.js 18 或更高版本
- Git
- 推薦使用 VS Code 作為開發環境

### 克隆和設置

1. Fork 專案到您的 GitHub 帳號
2. 克隆您的 fork：
   ```bash
   git clone https://github.com/YOUR_USERNAME/MemoryArk2.git
   cd MemoryArk2
   ```

3. 添加原始倉庫為 upstream：
   ```bash
   git remote add upstream https://github.com/ORIGINAL_REPO/MemoryArk2.git
   ```

4. 設置開發環境：
   ```bash
   # 後端設置
   cd backend
   go mod download
   cp .env.example .env
   
   # 前端設置
   cd ../frontend
   npm install
   cp .env.example .env
   ```

## 代碼風格

### Go 代碼風格

- 使用 `gofmt` 格式化代碼
- 遵循 [Effective Go](https://golang.org/doc/effective_go.html) 指南
- 使用 `golangci-lint` 進行代碼檢查
- 函數和方法必須有適當的註釋
- 錯誤處理必須明確和完整

```go
// 示例：好的函數註釋
// CreateUser 創建新用戶並返回用戶ID
// 如果用戶已存在則返回 ErrUserExists 錯誤
func CreateUser(ctx context.Context, req *CreateUserRequest) (*User, error) {
    // 實現...
}
```

### TypeScript/Vue 代碼風格

- 使用 ESLint 和 Prettier 進行代碼格式化
- 遵循 Vue 3 組合式 API 最佳實踐
- 使用 TypeScript 嚴格模式
- 組件必須有明確的 props 和 emits 定義
- 使用 PascalCase 命名組件

```vue
<!-- 示例：好的 Vue 組件結構 -->
<script setup lang="ts">
interface Props {
  title: string
  items: string[]
}

interface Emits {
  (e: 'select', item: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>
```

### 提交信息格式

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-tw/) 格式：

```
<類型>[可選範圍]: <描述>

[可選正文]

[可選註腳]
```

類型包括：
- `feat`: 新功能
- `fix`: 錯誤修復
- `docs`: 文檔變更
- `style`: 代碼格式（不影響功能的變更）
- `refactor`: 重構（既不修復錯誤也不添加功能）
- `test`: 添加或修正測試
- `chore`: 構建過程或輔助工具的變更

示例：
```
feat(auth): 添加雙層認證系統

實現 Cloudflare Access 與內部用戶審核的雙層認證機制

- 添加用戶註冊申請 API
- 實現管理員審核功能
- 更新認證中間件

Closes #123
```

## Issue 報告

在創建新 Issue 之前，請：

1. 搜索現有 Issues 確認問題未被報告
2. 使用適當的 Issue 模板
3. 提供詳細的問題描述和重現步驟
4. 包含相關的錯誤信息和日誌
5. 標明您的環境信息（OS、瀏覽器、版本等）

### Bug 報告模板

```markdown
## Bug 描述
簡潔明確地描述 bug

## 重現步驟
1. 轉到 '...'
2. 點擊 '....'
3. 滾動到 '....'
4. 看到錯誤

## 期望行為
描述您期望發生的情況

## 實際行為
描述實際發生的情況

## 環境信息
- OS: [e.g. Windows 10, macOS 13.0, Ubuntu 20.04]
- 瀏覽器: [e.g. Chrome 120.0, Firefox 121.0]
- 版本: [e.g. 0.1.0]

## 額外信息
添加任何其他相關信息
```

## Pull Request 流程

1. **創建功能分支**：
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **進行開發**：
   - 遵循代碼風格指南
   - 添加必要的測試
   - 更新相關文檔

3. **提交變更**：
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

4. **同步上游變更**：
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

5. **推送到您的 fork**：
   ```bash
   git push origin feature/your-feature-name
   ```

6. **創建 Pull Request**：
   - 使用描述性標題
   - 填寫 PR 模板
   - 關聯相關 Issues
   - 添加適當的標籤

### Pull Request 模板

```markdown
## 變更描述
簡潔描述此 PR 的變更內容

## 變更類型
- [ ] Bug 修復 (不影響現有功能的修復)
- [ ] 新功能 (不影響現有功能的新增功能)
- [ ] 破壞性變更 (會導致現有功能不正常工作的修復或功能)
- [ ] 文檔更新

## 測試
- [ ] 單元測試通過
- [ ] 集成測試通過
- [ ] 手動測試完成

## 檢查清單
- [ ] 代碼遵循專案風格指南
- [ ] 自我審查代碼
- [ ] 添加必要的註釋
- [ ] 更新相關文檔
- [ ] 添加相應測試
- [ ] 所有測試通過

## 相關 Issues
Closes #(issue number)

## 截圖（如適用）
```

## 代碼審查

### 審查標準

- **功能性**: 代碼是否按預期工作？
- **可讀性**: 代碼是否易於理解？
- **可維護性**: 代碼是否易於修改和擴展？
- **性能**: 是否存在性能問題？
- **安全性**: 是否存在安全風險？
- **測試覆蓋率**: 是否有足夠的測試？

### 審查流程

1. **自動檢查**: CI/CD 管線會自動運行測試和代碼檢查
2. **人工審查**: 至少需要一位維護者的批准
3. **反馈處理**: 處理審查意見並更新 PR
4. **最終合併**: 通過所有檢查後合併到主分支

## 開發工作流程

### 分支策略

- `main`: 穩定的生產分支
- `develop`: 開發分支，用於整合新功能
- `feature/*`: 功能開發分支
- `bugfix/*`: 錯誤修復分支
- `hotfix/*`: 緊急修復分支

### 發布流程

1. 從 `develop` 創建 `release/*` 分支
2. 進行最終測試和文檔更新
3. 合併到 `main` 並打標籤
4. 合併回 `develop`

## 社群準則

- 保持友善和專業的態度
- 尊重不同的觀點和經驗
- 建設性地給出和接受反饋
- 專注於對專案最有利的方案
- 遵循 [行為準則](CODE_OF_CONDUCT.md)

## 獲得幫助

如果您需要幫助：

1. 查看 [文檔](docs/)
2. 搜索現有 [Issues](../../issues)
3. 在討論區提問
4. 聯繫維護者

感謝您的貢獻！🎉
