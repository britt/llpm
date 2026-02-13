---
title: npm Trusted Publishing (GitHub Actions)
weight: 3
---

Configure GitHub Actions to publish the package to npm using **OIDC-based trusted publishing** (instead of an `NPM_TOKEN`).

## What the workflow requires

The repository includes an npm publish workflow at:

- `.github/workflows/npm-publish.yml`

This workflow is configured to:

- Run on **Node.js 24**.
- Install the latest npm before publishing:

  ```bash
  npm install -g npm@latest
  ```

- Publish with provenance enabled:

  ```bash
  npm publish --provenance --access public
  ```

The workflow does not set `NODE_AUTH_TOKEN` for the publish step.

## Configure trusted publishing on npmjs.com

Trusted publishing also requires a one-time configuration in the package settings on npmjs.com.

After the package exists on npm (after the initial publish), configure a **trusted publisher** for the package so that GitHub Actions can publish via OIDC.

## Initial publish note

The initial publish may require a manual token-based publish (or a bootstrap publish) before trusted publishing can be configured in npm package settings.
