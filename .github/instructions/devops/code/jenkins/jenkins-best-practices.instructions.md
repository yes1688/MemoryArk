---
applyTo: "**/Jenkinsfile,**/*.jenkins,**/*.groovy"
---

# Jenkins Best Practices

- Use Pipeline as Code (Jenkinsfile) to manage workflows with version traceability.
- Prefer Declarative Pipeline for clear structure and maintainability.
- Clearly separate stages: build, test, deploy, notify.
- Use parameterized builds to support multiple environments and flexible deployments.
- Manage credentials and secrets with the Credentials Plugin.
- Use Shared Library to reuse scripts and workflows.
- Add error handling and notifications (such as post, catch) to each step.
- Regularly upgrade Jenkins and plugins to avoid security risks.
- Monitor Jenkins performance and resources to avoid single-point bottlenecks.

> Jenkins is suitable for self-hosted, private, and complex custom workflow needs. It can be integrated with container technologies such as Podman, Docker, and K8s.