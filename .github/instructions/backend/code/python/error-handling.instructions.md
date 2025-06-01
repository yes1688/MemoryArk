---
applyTo: "**/*.py"
---

# Python Error Handling Best Practices

Python uses exception handling, emphasizing clear and predictable error flows.

## Principles
- Prefer catching specific exception types; avoid bare except.
- Use try/except/finally to manage resource release.
- Custom exceptions should inherit from Exception.
- Log errors appropriately to avoid silent failures.
- Do not use exceptions to control normal flow.

> Advanced: Use contextlib/context manager for resource management, or logging/traceback for error tracking.