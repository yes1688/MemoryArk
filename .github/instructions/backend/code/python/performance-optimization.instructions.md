---
applyTo: "**/*.py"
---

# Python Performance Optimization Best Practices

Python is a dynamic language; performance optimization should prioritize readability and maintainability.

## Common Optimization Focuses
- Avoid unnecessary global variables and redundant computations.
- Use built-in data structures (list, dict, set) and comprehensions.
- Analyze hot code paths with cProfile and line_profiler.
- Use threading or multiprocessing for IO/CPU-intensive tasks.
- For extreme performance, consider Cython, Numba, or PyPy.

> Advanced: Use caching (functools.lru_cache) and async (asyncio) to improve performance.