---
title: "Datasource recording rules: problem statements (summary)"
---

This page summarizes the problem statements in **“Product Spec: Datasource Recording Rules”** and provides examples of how each problem can affect users.

## Source material

The source material for this page is a Notion document:

- https://www.notion.so/Product-Spec-Datasource-Recording-Rules-2fff366d7aa08079a5c5e6dad6e8eb65?pvs=13

## Problem statements and user impact

### Problem statement

"When editing an existing data source recording rule, the queries array is not populated correctly, rendering the query editor unusable."

**Why it causes problems**

- Editing becomes blocked because the rule’s saved query configuration does not load into the editor.
- Review workflows break because the running query cannot be verified from the editor.

**Example scenario**

1. An existing data source recording rule is opened in the recording rule editor.
2. The query editor does not display the previously saved query configuration.
3. The rule cannot be meaningfully edited because the editor state is empty or broken.

### Problem statement

"Users cannot modify or review the query configuration of their data source recording rules after initial creation, forcing workarounds such as deleting and recreating rules."

**Why it causes problems**

- Routine operational changes require rule recreation rather than an in-place edit.
- Rule recreation can introduce configuration drift when non-query settings do not match the original rule.
- Auditability suffers when routine updates require delete-and-recreate actions rather than tracked edits.

**Example scenario**

1. A data source recording rule is created with an initial query.
2. A query change becomes necessary (for example, adjusting a filter).
3. The query configuration cannot be reviewed or modified in the editor, so the rule is deleted and recreated to apply the update.

### Problem statement

"The fix previously applied to cloud recording rules was not extended to data source recording rules, creating an inconsistency across rule types."

**Why it causes problems**

- Similar editor workflows behave differently depending on rule type, which increases cognitive load.
- Troubleshooting becomes harder because issue reproduction depends on rule type rather than consistent editor behavior.
- Support burden increases because guidance differs for two rule types that otherwise look similar.

**Example scenario**

1. A cloud recording rule is edited and the query editor loads the saved queries.
2. A data source recording rule is edited and the query editor does not load the saved queries.
3. The difference is interpreted as a user error or data corruption, rather than an inconsistency between rule types.
