---
applyTo: "**/*.js,**/*.ts"
---

# Node.js/TypeScript Error Handling Best Practices

Node.js/TS emphasizes asynchronous error handling and explicit exception management.

## Principles
- Use try/catch in async/await functions to catch exceptions.
- Promises should have .catch() to handle rejections.
- Log errors appropriately to avoid silent failures.
- Do not use throw to control normal flow.
- Custom error types can enhance semantic clarity.

> Advanced: Use process.on('uncaughtException') and unhandledRejection to monitor global errors.