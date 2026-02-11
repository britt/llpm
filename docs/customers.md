---
title: "Customer feature waitlist (input needed)"
description: "Template for summarizing which customers are waiting on which features; requires an exported source list to populate."
draft: true
toc: true
---

# Customer feature waitlist (input needed)

This page summarizes which customers are waiting on which features.

## Source needed

The work request references a Google Doc as the source of truth. That document is not available in this repository via the current tooling, so the customer/feature list cannot be populated here yet.

To complete this page, provide one of the following:

- Paste the Google Doc contents (or the relevant sections) into the ticket/thread.
- Export the Google Doc to Markdown and add it to the repository.
- Provide an accessible link (no-auth) that the documentation build tooling can read.

Once the source list is available, remove `draft: true` from the frontmatter.

## Summary (to be filled)

Add a short, customer-facing snapshot once the source list is available:

- Top customers blocked and the feature they are waiting on
- Common themes (e.g., integrations, performance, permissions)
- Any dependencies called out in the source

## Data format (recommended)

If pasting content, format each entry as a single row in a table so it is easy to scan and sort.

| Customer | Feature | Impact / why it matters | Priority / urgency (as stated) | Notes / links |
| --- | --- | --- | --- | --- |
| <Customer name> | <Feature> | <Use case / impact> | <P0/P1/etc or quote> | <Links to issues/PRDs, if present> |

## Customer → features mapping (to be filled)

Use the following format to keep entries scannable:

### <Customer name>

- **Waiting on**: <feature>
- **Why it matters**: <impact/use case>
- **Priority / urgency**: <as stated in source>
- **Notes**: <links to issues/PRDs, if present>

## Validation checklist

- Each customer name matches the source (avoid aliases unless the source uses them).
- Each feature name matches the product/engineering naming used elsewhere.
- Each “priority / urgency” value is either a direct quote or a clearly attributed label.
