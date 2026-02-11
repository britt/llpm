---
title: "Customer feature requests"
---

# Customer feature requests

This page summarizes which customers are waiting on which features.

## Source of truth

The source of truth is a Google Sheet:

- https://docs.google.com/spreadsheets/d/15aQSU5Qdqqi08-_Yhdv8buK_GgXIeQVHqfa3u-DV7B8/edit?gid=997300960#gid=997300960

That sheet is not available from within this repository, so this page is currently a template.

To complete this page, copy the sheet contents into the repository (for example, as `docs/customers.csv`) or paste an export (CSV or Markdown table) into this file, then populate the tables below.

Recommended workflow (keeps this page reviewable in Git):

1. Export the sheet to CSV.
2. Save the export into the repository (for example: `docs/customers.csv`).
3. Update the tables in this file from the CSV.
4. In the PR description, link to the spreadsheet tab used for the export.

Minimum required fields (add columns if the sheet contains more detail):

- `Customer`
- `Feature`
- `Notes / links`

Paste area (optional)

```text
# Paste a CSV export here (optional). Example headers:
Customer,Feature,Notes / links
```

This file is intentionally written so it can be updated without needing to access Google Docs from the documentation build environment.

## What to capture

Use short, customer-facing feature names. Prefer one feature per row in the “Features → customers waiting” table.

If the sheet includes extra columns (for example: priority, target version, owner, or status), either:

- Add columns to the tables below, or
- Capture those details in the “Notes / links” column.

## Customers → features they are waiting on

| Customer | Features waiting on | Notes / links |
| --- | --- | --- |
| _TBD_ | _TBD_ | _TBD_ |

## Features → customers waiting

| Feature | Customers waiting | Notes / links |
| --- | --- | --- |
| _TBD_ | _TBD_ | _TBD_ |

## Status definitions (optional)

If the sheet includes status/priority fields, define the meanings here so the tables stay consistent.

| Status | Meaning |
| --- | --- |
| _TBD_ | _TBD_ |
