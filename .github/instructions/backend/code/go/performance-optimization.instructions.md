---
applyTo: "**/*.go"
---

# Golang Performance Optimization Best Practices

Go emphasizes simplicity and efficiency; performance optimization should prioritize readability and maintainability.

## Common Optimization Focuses
- Use goroutines and channels for concurrent processing.
- Avoid unnecessary memory allocations; reuse slices/buffers.
- Use sync.Pool to manage temporary objects.
- Analyze hot code paths with go tool pprof.
- Prefer simple, native data structures (map, slice).
- Batch IO operations to reduce syscall frequency.

> Advanced: For extreme optimization, unsafe/atomic can be used, but safety must be carefully evaluated.