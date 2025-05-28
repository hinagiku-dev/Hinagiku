# Contributing to Hinagiku

Thank you for considering contributing to Hinagiku! This document outlines the process to help you submit pull requests (PRs) smoothly.

## Getting Started

1. **Fork** the repository and create your branch from `main`.
2. **Install dependencies** using `pnpm install`.
3. Follow the development instructions in [README.md](README.md) if you need more details.

## Pull Request Checklist

Before opening a PR, please make sure to complete the following steps:

- **Lint and format**
  ```sh
  pnpm lint
  pnpm format
  ```
- **Run tests** (if available)
  ```sh
  pnpm test
  ```
- **Interface changes**: If your PR modifies the user interface, update **both** English and Chinese strings in `messages/en.json` and `messages/zh.json` so the i18n (en/zh) remains complete.
- **Demonstration video**: When possible, attach a short screen recording or animated GIF that showcases your changes. This greatly helps reviewers understand the new functionality.
- Ensure your commit messages clearly describe your changes.
- Check that your branch merges cleanly with `main` and resolve any conflicts.

## Submitting a PR

1. Push your branch and open a pull request against the `main` branch.
2. Provide a clear description of what your PR does and reference any related issues.
3. If your changes affect documentation, update the relevant docs.
4. After opening the PR, make sure all CI checks pass.

By following these guidelines, you help maintain code quality and make reviews easier. We appreciate your contributions!
