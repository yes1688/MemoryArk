---
applyTo: "**/*.go"
---

# Golang Design and Syntax Guidelines

This guideline compiles Go-specific design principles, syntax conventions, and best practices.

## Design Principles
- Follow Go official style (gofmt, golint).
- Make good use of interfaces and composition; avoid excessive inheritance.
- Prefer using channels and goroutines for concurrency.
- Adopt explicit error return mechanisms.
- Use go modules to manage dependencies.

## Syntax Conventions
- Use lowercase and underscores for variable, function, and package names.
- Use CamelCase for types and structs.
- Standardize error handling with if err != nil.

> This file can be expanded according to actual project needs.