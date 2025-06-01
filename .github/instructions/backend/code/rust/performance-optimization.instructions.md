---
applyTo: "**/*.rs"
---

# Rust Performance Optimization Best Practices

Rust is centered on zero-cost abstractions and memory safety; performance optimization should balance safety and maintainability.

## Common Optimization Focuses
- Use ownership/lifetime to avoid unnecessary clone/copy.
- Use iterators and zero-copy techniques to reduce memory allocations.
- Analyze hot code paths with cargo bench or a profiler.
- Use Rc/Arc/RefCell for flexibility when appropriate, but be mindful of synchronization overhead.
- Use multithreading (thread/spawn) and async/await for high concurrency.

> Advanced: Use unsafe for extreme optimization, but safety must be guaranteed.