# CI/CD Setup

This project uses GitHub Actions for continuous integration and deployment.

## Workflows

### 1. CI - Pull Request (`ci.yml`)

Runs on every pull request to the `main` branch.

**Steps:**
1. Checkout code
2. Setup Bun runtime
3. Install dependencies
4. Run Prettier format check
5. Build the plugin
6. Run test suite
7. Generate coverage report
8. Upload coverage to Codecov (optional)

**Purpose:** Ensure code quality and prevent breaking changes from being merged.

### 2. CD - Publish (`publish.yml`)

Runs on every push to the `main` branch.

**Steps:**
1. Checkout code
2. Setup Bun runtime
3. Install dependencies
4. Run Prettier format check
5. Build the plugin
6. Run test suite
7. Configure GitHub Packages registry
8. Publish package to GitHub Packages

**Purpose:** Automatically publish new versions to GitHub Packages when changes are merged to main.

## Setup Requirements

### For the Repository

No special secrets needed! The workflows use:
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
- `CODECOV_TOKEN` - Optional, for coverage reports (add in repo secrets if you want coverage)

### For Users Installing the Package

Users need to configure their `.npmrc` file to authenticate with GitHub Packages:

```bash
@anime-pack:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

See [GitHub's documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) for more details.

## Version Management

Currently using manual versioning in `package.json`. Update the version number when making releases:

```bash
# Update version in package.json
bun version patch  # 0.2.3 -> 0.2.4
bun version minor  # 0.2.3 -> 0.3.0
bun version major  # 0.2.3 -> 1.0.0

# Commit and push
git add package.json
git commit -m "chore: bump version to X.X.X"
git push origin main

# The publish workflow will automatically deploy the new version
```

## Future Improvements

- [ ] Add semantic-release for automatic versioning
- [ ] Publish to npm registry (no authentication needed)
- [ ] Add GitHub release creation
- [ ] Add changelog generation
- [ ] Add version tags
