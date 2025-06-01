---
applyTo: "**/*.py"
---

# Python Design and Syntax Guidelines

This guideline compiles Python-specific design principles, syntax conventions, and best practices.

## Design Principles
- Follow PEP8 style and official best practices.
- Prefer clear and readable syntax and naming.
- Make good use of built-in types and the standard library.
- Use exception handling (try/except) for error management.
- Use virtual environments and pip to manage dependencies.

## Syntax Conventions
- Use snake_case for variable, function, and module names.
- Use CamelCase for class names.
- Appropriately use type hints.

## OOP and SOLID Principles in Python
- Python supports object-oriented programming (OOP) with classes, inheritance, polymorphism, and encapsulation.
- SOLID principles also apply to Python, but pay attention to dynamic typing and duck typing:
  - Single Responsibility (SRP): Each class/function should do one thing.
  - Open/Closed (OCP): Use inheritance, mixins, and dynamic attributes for extensibility.
  - Liskov Substitution (LSP): Subclasses should seamlessly replace base classes; prefer abstract base classes (abc).
  - Interface Segregation (ISP): Split large interfaces into multiple small protocols or abstract classes.
  - Dependency Inversion (DIP): Depend on abstractions (protocols, abstract base classes) rather than concrete implementations; use dependency injection patterns.
- Make good use of Python's standard library tools such as abc, typing.Protocol, and dataclass to assist OOP design.

> This file can be expanded according to actual project needs.