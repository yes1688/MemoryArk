# Copilot Instructions Backend Directory and File Planning Checklist

This document records detailed structure recommendations for the backend instructions directory for maintenance and reference.

## Directory Structure

```
.github/
  instructions/
    backend/
      common/
        OOP_SOLID_PHP_JAVA_CS.instructions.md         ← OOP/SOLID principles, only for PHP, Java, C#
        architecture-principles.instructions.md
        error-handling.instructions.md
        performance-optimization.instructions.md
        refactoring-guidelines.instructions.md
        ... (expand as needed)
      code/
        php/
          laravel-best-practices.instructions.md
          php-specific-guidance.instructions.md
        java/
          java-specific-guidance.instructions.md
        cs/
          cs-specific-guidance.instructions.md
        rust/
          rust-specific-guidance.instructions.md
        nodejs/
          nodejs-best-practices.instructions.md
        go/
          go-specific-guidance.instructions.md
        python/
          python-specific-guidance.instructions.md
        ... (expand as needed)
```

## Additional Notes

- OOP/SOLID file naming and applyTo example:
  - Filename: OOP_SOLID_PHP_JAVA_CS.instructions.md
  - applyTo: `**/*.{php,java,cs}`
- Place cross-language topics in common/, and each language in its own folder under code/.
- If topic content is highly similar but has minor language differences, consider a "single file, multiple language sections" approach; otherwise, separate files are recommended.
- File names should clearly distinguish topic and purpose for easy searching and maintenance.

> This checklist can be expanded or adjusted as needed.