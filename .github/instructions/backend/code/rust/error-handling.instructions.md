---
applyTo: "**/*.rs"
---

# Rust Error Handling Philosophy and Practice

Rust emphasizes type safety and explicit error handling, distinguishing between recoverable (Result) and unrecoverable (panic!) errors.

## Principles
- Prefer using Result<T, E> to propagate errors; avoid panic!.
- Use the `?` operator to simplify error propagation.
- Custom error types should implement std::error::Error.
- Use panic! only for logically impossible situations.
- Use crates like thiserror/anyhow to enhance error handling flexibility.

> Advanced: Use match/if let to handle error branches and log error context.