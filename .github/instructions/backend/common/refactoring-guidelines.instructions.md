---
applyTo: "**/*.{php,java,cs}"
---

# General Refactoring Principles (Backend)

This guideline compiles general principles for backend refactoring, applicable to most backend languages and frameworks.

## Refactoring Considerations
- Service compatibility: Ensure system integration points, API contracts, and external communications.
- Dependency chain analysis: Identify direct and indirect dependencies between services.
- Interface stability: Use "extend rather than modify" strategies; deprecate instead of directly deleting.
- Migration paths: Provide clear migration paths and compatibility layers for major changes.
- Iterative improvement: Break large refactoring into small steps and continuously verify system stability.

## Common Refactoring Patterns
- Service extraction, monolith decomposition, interface reorganization, middleware introduction, data access refactoring, cache introduction, asynchronization, etc.

> This file can be expanded according to actual project needs.