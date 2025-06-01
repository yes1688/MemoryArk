---
applyTo: "**/*.{php,java,cs}"
---

# General Performance Optimization Principles (Backend)

This guideline compiles general principles for backend performance optimization, applicable to most backend languages and frameworks.

## Optimization Focuses
- SQL optimization: Improve query structure, add indexes, and mitigate N+1 problems.
- Caching strategies: Implement multi-level caching, including memory, distributed, and HTTP caches.
- Resource pooling: Use connection pools, thread pools, and other resource pooling techniques.
- Asynchronous processing: Use event-driven models to handle time-consuming operations.
- Batch processing: Combine multiple small operations into batch operations to reduce overhead.
- Data sharding: Horizontally or vertically shard data based on usage patterns.
- Read-write separation: Separate read and write operations to different resources to increase throughput.

> This file can be expanded according to actual project needs.
> For language-specific performance optimization best practices (Go, Rust, Python, Node.js, etc.), refer to the corresponding language files under code/.