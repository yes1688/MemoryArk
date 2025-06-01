---
applyTo: "**/*.rs"
---

# Rust Refactoring Best Practices

This guideline compiles Rust-specific refactoring principles and common patterns.

## Refactoring Recommendations
- Make good use of ownership, lifetime, and the borrow checker to ensure safe refactoring.
- Split large modules and traits, focusing on single responsibility.
- Use generics and trait objects for flexibility.
- Avoid excessive use of unsafe; prioritize safe code blocks.
- Use cargo clippy and fmt tools to assist refactoring.

## Common Refactoring Patterns
- Extract traits, modules, and generic structures.
- Optimize error handling and data flow.
- Reduce duplicate code and unsafe blocks.

> This file can be expanded according to actual project needs.