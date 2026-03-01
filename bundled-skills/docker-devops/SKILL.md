---
name: docker-devops
description: "DevOps and Docker operations for AI agents. Use when: building containers, managing infrastructure, CI/CD pipelines, deployment automation, monitoring, troubleshooting containers. NOT for: application code development (use coding-agent), database queries."
triggers:
  - docker
  - container
  - deploy
  - infrastructure
  - ci/cd
  - devops
  - monitoring
  - docker-compose
  - kubernetes
  - k8s
  - helm
  - terraform
---

# Docker & DevOps Agent Skill

## Overview

This skill enables agents to manage Docker containers, infrastructure, and DevOps workflows.

## Capabilities

### Docker Operations
- Build and manage Docker images
- Run and orchestrate containers
- Manage docker-compose stacks
- Container networking and volumes
- Resource limits and security

### Infrastructure
- Setup CI/CD pipelines
- Configure monitoring (Prometheus, Grafana)
- Manage secrets and environment variables
- Infrastructure as Code (Terraform)

### Deployment
- Deploy to VPS/cloud
- Zero-downtime deployments
- Rollback strategies
- Health checks and auto-recovery

## Tools Available

- `docker` CLI
- `docker-compose`
- `kubectl` (if configured)
- `terraform`
- `helm`

## Best Practices

1. Always use multi-stage builds for smaller images
2. Never commit secrets to Dockerfiles
3. Use health checks in containers
4. Implement proper logging
5. Monitor resource usage

## Safety Rules

- Test containers locally before deployment
- Use read-only volumes where possible
- Implement resource limits
- Never run containers as root in production
