# GitHub Actions Secrets Setup Guide

This document outlines the process for setting up GitHub repository secrets required for the OpenCap CI/CD pipeline, following the Semantic Seed Venture Studio Coding Standards V2.0 for secure deployments.

## Required Secrets

The CI/CD pipeline requires the following secrets to be configured in your GitHub repository:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `CODECOV_TOKEN` | Token for uploading test coverage to Codecov | `a1b2c3d4-5678-90ab-cdef-ghijklmnopqr` |
| `DOCKERHUB_USERNAME` | Docker Hub username for pushing images | `opencap` |
| `DOCKERHUB_TOKEN` | Docker Hub access token for authentication | `dckr_pat_AbCdEfGhIjKlMnOpQrStUvWxYz` |

## Setting Up Secrets in GitHub

1. Navigate to your GitHub repository
2. Click on **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each of the required secrets one by one:

### CODECOV_TOKEN

1. Create an account or log in to [Codecov](https://codecov.io/)
2. Add your GitHub repository to Codecov
3. Locate your repository token in Codecov dashboard
4. Add it as `CODECOV_TOKEN` in GitHub

### DOCKERHUB_USERNAME and DOCKERHUB_TOKEN

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Navigate to **Account Settings** > **Security**
3. Create a new access token with appropriate permissions (read/write)
4. Copy the token immediately (it won't be shown again)
5. Add your Docker Hub username as `DOCKERHUB_USERNAME` and the token as `DOCKERHUB_TOKEN` in GitHub

## Verifying Secret Configuration

After adding all secrets, your GitHub repository's secrets page should show:

- `CODECOV_TOKEN`
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

## Security Considerations

- **Token Rotation**: Regularly rotate your Docker Hub tokens (recommended every 90 days)
- **Principle of Least Privilege**: Ensure Docker Hub tokens have only the permissions they need
- **Access Control**: Limit who can access and modify GitHub Actions workflow files

## Troubleshooting

If your CI/CD pipeline fails with authentication errors:

1. Verify that all secrets are correctly added to the repository
2. Check that Docker Hub token has not expired
3. Ensure Docker Hub token has sufficient permissions
4. Verify Codecov token is valid for your repository

## Next Steps

After configuring these secrets, your CI/CD pipeline should be able to:
- Upload test coverage reports to Codecov
- Build and push Docker images to Docker Hub
- Deploy to your environments as defined in the workflow

For additional help, consult the [GitHub Actions documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets) or [Docker Hub documentation](https://docs.docker.com/docker-hub/access-tokens/).
