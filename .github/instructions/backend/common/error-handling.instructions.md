---
applyTo: "**/*.{php,java,cs}"
---

# General Error Handling Principles (Backend)

This guideline compiles general principles for backend error handling, applicable to most backend languages and frameworks.

## Basic Principles
- Transparent reporting: Clearly report the source and nature of problems, log details, but provide appropriate summaries externally.
- Moderate fault tolerance: Only implement service degradation in reasonable situations; avoid masking serious issues.
- Complete logging: Record errors and full context for diagnosis and repair.
- Structured errors: Use standardized error structures, including code, message, and remediation suggestions.

## Error Handling Layers
- API layer: Handle request validation errors and convert them to standard error responses.
- Business logic layer: Capture business rule violations and convert them to domain-specific errors.
- Data access layer: Handle data operation exceptions and encapsulate underlying database errors.
- Integration layer: Manage external service interaction errors, implement retry and degradation strategies.

> This file can be expanded according to actual project needs.
> For language-specific error handling best practices (Go, Rust, Python, Node.js, etc.), refer to the corresponding language files under code/.