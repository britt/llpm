---
title: "Breaking changes"
description: "User-facing output changes that may affect integrations or tests."
---

# Breaking changes

## Overview

This page summarizes user-visible changes that can break existing workflows.

Included issue links:

- [DOC-34: breaking change contributor guidelines](https://linear.app/docholiday/issue/DOC-34/breaking-change-contributor-guidelines)
- [DOC-33: lethal trifecta](https://linear.app/docholiday/issue/DOC-33/lethal-trifecta)
- [DOC-32: help](https://linear.app/docholiday/issue/DOC-32/help)

## Breaking changes in the reviewed commit range

### `ui-notification` chat messages change their on-screen formatting

In the reviewed commits, `ui-notification` messages in the chat UI change in two observable ways:

- Message content renders Markdown (the same way as `assistant` messages).
- Message content no longer uses a `System:` prefix.

Impacts:

- Any automated checks that assert exact terminal output (for example, snapshot tests or log parsers) may need to be updated to match the new formatting.

Source locations:

- `src/utils/messageDisplay.ts` (`getMessageDisplayContent`): `ui-notification` is treated like `assistant` for Markdown rendering, and unlike `system` for prefixing.
- `src/components/ChatInterface.tsx`: the message item display delegates to the shared helpers.

## Non-breaking internal refactors in the reviewed commit range

### Message display helpers are extracted into a utility module

Two helpers are moved into `src/utils/messageDisplay.ts` and imported from there:

- `getMessageDisplayContent(message)`
- `getMessageTextColor(message)`

This change primarily affects module boundaries/import paths used by internal code and tests.
