---
title: Contributing
weight: 4
---

## Overview

This section describes the contribution workflow for LLPM, including community trust requirements, development setup, testing expectations, pull requests, and issue reporting.

## Community trust (Vouch)

Contribution access is gated by the project's Vouch workflow.

- Vouched users can open issues and pull requests normally.
- Unvouched users have issues and pull requests closed automatically with instructions for getting vouched.
- Denounced users have issues and pull requests closed and locked.

### Get vouched

1. Engage with the project in discussions or existing issues.
2. Demonstrate familiarity with the codebase and project goals.
3. Ask a maintainer to vouch for the GitHub account.

Only the project owner can vouch or denounce users via `/vouch @username` and `/denounce @username` comments.

## Code of conduct

Contribution spaces (issues, pull requests, and discussions) require respectful and constructive collaboration. Spam and promotional posting results in denouncement.

## Getting Started

1. **[Development Setup]({{< relref "development-setup" >}})** - Configure a local development environment (Bun) and required API keys
2. **[Testing]({{< relref "testing" >}})** - Follow the TDD workflow and testing requirements

## Pull Request Workflow

1. Create a feature branch from `main`.
2. Make changes following the TDD workflow.
3. Verify everything passes:

   ```bash
   bun run test
   bun run lint
   bun run typecheck
   ```

4. Push the branch and open a pull request against `main`.
5. Populate the pull request description:
   - What the change does and why
   - How to test it
   - Any breaking changes

## Issues

Bug reports and feature suggestions should be authored by LLPM so the issue contains consistent context.

### Create an issue with LLPM

1. Launch LLPM.
2. Submit a prompt that instructs LLPM to author the issue.

Bug report:

```text
"Create an issue for [describe the bug]"
```

Feature request:

```text
"Create a feature request for [describe the feature]"
```

LLPM gathers the environment details, steps to reproduce, and relevant error context for bug reports. LLPM structures feature requests with a problem statement, proposed solution, and alternatives considered.

### Analyze an existing issue

Issue analysis uses the `/issue` slash command.

#### Prerequisites

- An active LLPM project configured with a GitHub repository
- A GitHub issue number

#### Execute an analysis

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

#### Risk types

Risk analysis reports the following risk types:

- `stale`
- `blocked`
- `deadline`
- `scope`
- `assignment`

See the subsections for detailed guidance on development setup and testing practices.
