---
applyTo: "**/*.js,**/*.ts"
---

# Node.js/TypeScript Performance Optimization Best Practices

Node.js/TS emphasizes event-driven and asynchronous programming; performance optimization should also consider maintainability.

## Common Optimization Focuses
- Use async/await and Promises for IO-intensive tasks.
- Avoid blocking the main thread; use worker_threads for CPU-intensive tasks.
- Analyze hot code paths with node --inspect and profiler.
- Cache data appropriately to reduce redundant queries.
- Use modular design and minimize global variables.

> Advanced: Use cluster and pm2 for multi-process deployment to increase throughput.