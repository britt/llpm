---
title: Contributing
weight: 4
---

## Overview

This section describes the contribution workflow for LLPM, including development setup, testing expectations, pull requests, and issue reporting.

## Getting Started

1. **[Development Setup]({{< relref "development-setup" >}})** - Set up your local development environment with Bun and configure API keys
2. **[Testing]({{< relref "testing" >}})** - Learn about our TDD workflow and testing requirements

## Pull Request Workflow

1. Fork the repository and create a feature branch
2. Follow Test-Driven Development (TDD) practices - write tests first
3. Ensure all tests pass with `bun run test`
4. Verify coverage meets thresholds (90%+ lines/functions/statements, 85%+ branches)
5. Run `bun run lint` and `bun run typecheck` to check for errors
6. Submit your pull request with a clear description of changes

## Issues

Issue reporting uses the `issue` slash command to analyze an existing GitHub issue for risks.

### Prerequisites

- An active LLPM project configured with a GitHub repository
- A GitHub issue number

### Analyze an issue

Execute one of the following commands:

```text
/issue <number>
```

```text
/issue risks <number>
```

### Show issue command help

```text
/issue help
```

### Risk types

Risk analysis reports the following risk types:

- `stale`
- `blocked`
- `deadline`
- `scope`
- `assignment`

See the subsections for detailed guidance on development setup and testing practices.
