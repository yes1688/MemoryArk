---
applyTo: "**/.gitignore,**/.gitattributes,**/*.git,**/*.md,**/*.sh,**/*.ps1"
---

# Git Best Practices

- All code, configuration, and infrastructure scripts should be under version control.
- Follow semantic commit messages (such as Conventional Commits).
- Clear branch strategy (e.g., GitFlow, Trunk Based Development).
- Strict Pull Request/Merge Request process, requiring review and testing.
- Use .gitignore and .gitattributes to manage project content and cross-platform consistency.
- Regularly rebase/merge to keep branches synchronized and clean.
- Use tags for releases and traceability.
- Never commit sensitive information; use git-secrets and pre-commit hooks.
- Double-check important operations (such as reset, force push).

> Git is the core of DevOps version control. All automation, deployment, IaC, and container scripts are recommended to be managed in version control.