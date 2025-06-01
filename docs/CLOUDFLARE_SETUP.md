# Cloudflare Access 設置指南

本文檔說明如何為 MemoryArk 2.0 配置 Cloudflare Access，實現 Google 帳號驗證和訪問控制。

## 目錄

- [前置需求](#前置需求)
- [設置 Cloudflare Access](#設置-cloudflare-access)
- [配置身份提供者](#配置身份提供者)
- [創建訪問策略](#創建訪問策略)
- [應用程序配置](#應用程序配置)
- [測試驗證](#測試驗證)
- [故障排除](#故障排除)

## 前置需求

1. **Cloudflare 帳號**: 需要有效的 Cloudflare 帳號
2. **域名管理**: 域名必須託管在 Cloudflare
3. **Cloudflare 方案**: 建議使用 Pro 方案或以上（Free 方案有限制）
4. **Google Cloud 項目**: 用於 Google OAuth 配置

## 設置 Cloudflare Access

### 1. 啟用 Cloudflare Access

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇您的域名
3. 在左側菜單中找到 **Zero Trust**
4. 點擊 **Access** > **Applications**

### 2. 創建 Access 應用程序

點擊 **Add an application** 並選擇 **Self-hosted**

#### 應用程序配置

```
Application name: MemoryArk 2.0
Application domain: your-domain.com
Path: (留空，保護整個域名)
Application appearance:
  - App Launcher visibility: Visible
  - Logo URL: (可選)
Session duration: 24 hours
```

#### CORS 設置

```
CORS settings:
  - Allow all origins: No
  - Allowed origins: https://your-domain.com
  - Allow all methods: Yes
  - Allow all headers: Yes
  - Allow credentials: Yes
```

## 配置身份提供者

### 1. 設置 Google OAuth

在 [Google Cloud Console](https://console.cloud.google.com) 中：

1. **創建新項目或選擇現有項目**
2. **啟用 Google+ API**:
   - 轉到 APIs & Services > Library
   - 搜索 "Google+ API" 並啟用

3. **創建 OAuth 2.0 憑證**:
   - 轉到 APIs & Services > Credentials
   - 點擊 "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: Web application
   - Name: MemoryArk 2.0 Cloudflare Access

4. **配置重定向 URI**:
   ```
   Authorized redirect URIs:
   https://your-domain.cloudflareaccess.com/cdn-cgi/access/callback
   ```

5. **記錄客戶端 ID 和密鑰**

### 2. 在 Cloudflare 中添加身份提供者

1. 在 Cloudflare Zero Trust 中，轉到 **Settings** > **Authentication**
2. 點擊 **Add new** > **Google**
3. 輸入 Google OAuth 配置：

```
App ID: [Google OAuth Client ID]
Client Secret: [Google OAuth Client Secret]
```

4. **可選配置**:
   - Claims: 可以添加特定的聲明
   - Scopes: 默認範圍通常足夠

## 創建訪問策略

### 1. 基本策略配置

為 MemoryArk 2.0 應用程序創建策略：

```
Policy name: MemoryArk Church Members
Decision: Allow
```

### 2. 訪問規則

#### 方法一：基於電子郵件域名

```json
{
  "rules": [
    {
      "name": "Church Email Domain",
      "action": "allow",
      "conditions": [
        {
          "attribute": "email_domain",
          "operator": "in",
          "value": ["church.org", "truejc.org"]
        }
      ]
    }
  ]
}
```

#### 方法二：特定電子郵件地址

```json
{
  "rules": [
    {
      "name": "Approved Church Members",
      "action": "allow",
      "conditions": [
        {
          "attribute": "email",
          "operator": "in",
          "value": [
            "pastor@church.org",
            "admin@church.org",
            "member1@gmail.com",
            "member2@yahoo.com"
          ]
        }
      ]
    }
  ]
}
```

#### 方法三：Google 群組（進階）

如果您使用 Google Workspace：

```json
{
  "rules": [
    {
      "name": "Church Google Group",
      "action": "allow",
      "conditions": [
        {
          "attribute": "groups",
          "operator": "in",
          "value": ["church-members@church.org"]
        }
      ]
    }
  ]
}
```

### 3. 多重策略

您可以創建多個策略來實現更細緻的控制：

```json
{
  "policies": [
    {
      "name": "Church Administrators",
      "decision": "allow",
      "rules": [
        {
          "email": ["admin@church.org", "pastor@church.org"]
        }
      ]
    },
    {
      "name": "Church Members",
      "decision": "allow",
      "rules": [
        {
          "email_domain": ["church.org"]
        }
      ]
    },
    {
      "name": "Approved External Users",
      "decision": "allow",
      "rules": [
        {
          "email": ["member1@gmail.com", "member2@yahoo.com"]
        }
      ]
    }
  ]
}
```

## 應用程序配置

### 1. 獲取 Cloudflare Access 配置信息

在您的應用程序配置完成後，需要獲取以下信息：

1. **Audience Tag (AUD)**:
   - 在應用程序設置頁面可以找到
   - 格式類似: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0`

2. **Certificate URL**:
   ```
   https://your-domain.cloudflareaccess.com/cdn-cgi/access/certs
   ```

3. **Domain**:
   ```
   your-domain.com
   ```

### 2. 更新 MemoryArk 2.0 配置

在後端 `.env` 文件中添加：

```env
CLOUDFLARE_DOMAIN=your-domain.com
CLOUDFLARE_AUD=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
CLOUDFLARE_CERT_URL=https://your-domain.cloudflareaccess.com/cdn-cgi/access/certs
```

在前端 `.env` 文件中添加：

```env
VITE_CLOUDFLARE_DOMAIN=your-domain.com
VITE_CLOUDFLARE_REDIRECT_URL=https://your-domain.cloudflareaccess.com
```

### 3. 應用程序代碼整合

後端中間件示例（Go）：

```go
func CloudflareAccessMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 獲取 CF-Access-Jwt-Assertion header
        token := c.GetHeader("CF-Access-Jwt-Assertion")
        if token == "" {
            c.JSON(401, gin.H{"error": "Unauthorized"})
            c.Abort()
            return
        }

        // 驗證 JWT token
        claims, err := validateCloudflareJWT(token)
        if err != nil {
            c.JSON(401, gin.H{"error": "Invalid token"})
            c.Abort()
            return
        }

        // 將用戶信息添加到上下文
        c.Set("user_email", claims.Email)
        c.Set("user_name", claims.Name)
        c.Next()
    }
}
```

## 測試驗證

### 1. 基本訪問測試

1. 清除瀏覽器 cookie
2. 訪問 `https://your-domain.com`
3. 應該被重定向到 Cloudflare Access 登入頁面
4. 使用授權的 Google 帳號登入
5. 成功後應該能訪問應用程序

### 2. 測試不同用戶

- 使用授權用戶帳號測試（應該成功）
- 使用未授權用戶帳號測試（應該被拒絕）
- 測試會話過期（24小時後重新登入）

### 3. API 訪問測試

```bash
# 獲取 CF-Access-Jwt-Assertion token（從瀏覽器開發者工具）
TOKEN="your-jwt-token-here"

# 測試 API 訪問
curl -H "CF-Access-Jwt-Assertion: $TOKEN" \
     https://your-domain.com/api/health
```

## 故障排除

### 常見問題

#### 1. 無法訪問應用程序

**症狀**: 訪問域名時顯示 "Access Denied"

**解決方案**:
- 檢查用戶電子郵件是否在允許列表中
- 確認 Google OAuth 配置正確
- 檢查訪問策略是否正確設置

#### 2. 重定向循環

**症狀**: 瀏覽器不斷重定向

**解決方案**:
- 檢查 Google OAuth 重定向 URI 配置
- 確認 Cloudflare 應用程序域名設置正確
- 清除瀏覽器 cookie 和緩存

#### 3. JWT 驗證失敗

**症狀**: 後端返回 "Invalid token" 錯誤

**解決方案**:
- 確認 CLOUDFLARE_AUD 配置正確
- 檢查證書 URL 可訪問性
- 驗證時間同步（JWT 有時間限制）

#### 4. CORS 錯誤

**症狀**: 瀏覽器控制台顯示 CORS 錯誤

**解決方案**:
- 在 Cloudflare Access 應用程序中正確配置 CORS
- 確認允許的來源包含您的域名
- 檢查 "Allow credentials" 設置

### 調試工具

#### 1. JWT 解碼

使用 [jwt.io](https://jwt.io) 解碼 CF-Access-Jwt-Assertion token 查看內容

#### 2. Cloudflare 日誌

在 Cloudflare Dashboard 中查看 Access 日誌：
- 轉到 Zero Trust > Logs > Access

#### 3. 測試 API

```bash
# 測試證書端點
curl https://your-domain.cloudflareaccess.com/cdn-cgi/access/certs

# 測試應用程序可訪問性
curl -I https://your-domain.com
```

### 最佳實踐

1. **定期審查訪問策略**: 確保只有授權用戶可以訪問
2. **監控訪問日誌**: 定期檢查異常訪問活動
3. **會話管理**: 根據安全需求調整會話持續時間
4. **多重身份驗證**: 考慮啟用額外的安全層
5. **備份配置**: 記錄所有配置設置以便災難恢復

## 進階配置

### 1. 自定義登入頁面

可以自定義 Cloudflare Access 登入頁面的外觀：

```css
/* 自定義 CSS */
.cf-access-login {
    background: #f8f9fa;
}

.cf-access-card {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### 2. 服務令牌（Service Tokens）

對於 API 訪問，可以創建服務令牌：

1. 轉到 Zero Trust > Access > Service Tokens
2. 創建新令牌
3. 在 API 請求中使用 `CF-Access-Client-Id` 和 `CF-Access-Client-Secret` headers

### 3. 地理位置限制

可以基於地理位置添加額外限制：

```json
{
  "rules": [
    {
      "name": "Geographic Restriction",
      "conditions": [
        {
          "attribute": "country",
          "operator": "in",
          "value": ["TW", "US"]
        }
      ]
    }
  ]
}
```

需要更多幫助，請參考 [Cloudflare Access 官方文檔](https://developers.cloudflare.com/cloudflare-one/applications/) 或聯繫技術支援。
