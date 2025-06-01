---
applyTo: "**/*.go"
---

# Golang Refactoring Best Practices

This guideline compiles Go-specific refactoring principles and common patterns.

## Refactoring Recommendations
- Make good use of interfaces and composition; avoid excessive inheritance.
- Split large packages, focusing on single responsibility.
- Handle errors explicitly and unify error flows.
- Use goroutines and channels for concurrent refactoring.
- Use gofmt and golint tools to assist refactoring.

## Common Refactoring Patterns
- Extract interfaces and refactor goroutine flows.
- Split handlers, services, and repositories.
- Optimize data flow and error propagation.

> This file can be expanded according to actual project needs.