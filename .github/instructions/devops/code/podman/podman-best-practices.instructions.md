---
applyTo: "**/Containerfile,**/Podmanfile,**/*.podman,**/*.sh,**/*.md"
---

# Podman Best Practices

- Prefer rootless mode for enhanced security.
- Use Containerfile/Podmanfile to manage image builds; automate common operations with scripts.
- Use podman-compose to manage multi-container applications.
- Build images with multi-stage and minimal base images.
- Each container should run a single service, following microservices principles.
- Use consistent naming conventions for images and containers to facilitate automation and maintenance.
- Mount logs, data, and configuration files to host directories for easy backup and debugging.
- Regularly clean up unused images, containers, and volumes to avoid resource waste.
- Integrate with systemd, K8s, Jenkins, etc., for automated deployment.

> Podman is suitable for automation, rootless operation, and integration with modern DevOps toolchains. All images, scripts, and configurations are recommended to be managed in git version control.