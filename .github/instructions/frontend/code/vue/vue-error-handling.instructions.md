---
applyTo: "**/*.vue,**/*.ts,**/*.tsx"
---

# Vue 錯誤處理

> 本指令適用於 Vue 專案（含 JS/TS/TSX）。Vue 3/2 均支援 TypeScript，請依專案型態調整實踐細節。三種語言皆可共用本指引，型別安全與語法彈性可依需求調整。

- 使用 errorCaptured 鉤子攔截錯誤。
- API 請求錯誤以 try-catch 處理。
- 表單驗證與用戶提示友善。
