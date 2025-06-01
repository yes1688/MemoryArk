---
applyTo: "**/*.go"
---

# Golang Error Handling Best Practices

Go adopts an explicit error passing philosophy (error return value), emphasizing simple and predictable error flows.

## Principles
- Always check errors with `if err != nil`; avoid try/catch.
- Errors should be meaningful; use errors.Wrap or custom error types.
- Important errors should be logged and propagated upward when appropriate.
- Always check errors for external API/IO operations to avoid silent failures.
- Use panic only for unrecoverable errors (e.g., program startup failure).

> Advanced: Use errors.Is/As for error type checking, or error chains to provide more context.