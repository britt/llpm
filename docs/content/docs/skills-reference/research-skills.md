---
title: Research Skills
weight: 7
---

Research skills help gather information from web sources, summarize discussions, and synthesize knowledge from project notes.

## research-topic-summarize

Research topics via web search, synthesize detailed summaries with sources and optional screenshots.

**Triggers:**
- Evaluating a technology, library, or tool
- Learning about a new concept or pattern
- Comparing options (X vs Y)
- Gathering background for a decision

**Key Features:**
- Conducts thorough web research
- Synthesizes findings into structured summaries
- Captures screenshots of key visuals
- Cites sources for all claims

**Output Structure:**

```markdown
## Research: [Topic]

### Summary

[Paragraph overview - what it is, why it matters, current state]

### Background

[Context, history, or foundational concepts]

### Key Findings

#### [Finding 1 Title]

[Detailed explanation with specifics, numbers, examples]

#### [Finding 2 Title]

[Detailed explanation with evidence from sources]

### Comparisons

| Aspect | Option A | Option B |
|--------|----------|----------|
| [Criteria] | [Detail] | [Detail] |

### Visual References

- ![Description](screenshot-1.png) - [what this shows]

### Sources

1. [Title](url) - [what this source contributed]
2. [Title](url) - [what this source contributed]

### Analysis

- **Strengths**: [detailed pros]
- **Weaknesses**: [detailed cons]
- **Gaps**: [what the research didn't answer]

### Recommendation

[Actionable conclusion with reasoning]
```

**Research Guidelines:**

Depth of Coverage:
- Provide enough detail to make decisions without re-reading sources
- Include specific numbers, versions, dates when relevant
- Explain concepts, don't just name them
- Note conflicting information across sources

Source Quality:
- Prefer official documentation over blog posts
- Note publication dates (flag outdated info)
- Cite sources for all claims
- Include 3-5 quality sources minimum

**Screenshot Best Practices:**

- Use descriptive filenames: `redis-vs-memcached-comparison.png`
- Always include alt text descriptions
- Capture only relevant portions, not full pages
- Note the source URL in the description

When to capture screenshots:
- Architecture or flow diagrams
- Comparison tables
- Pricing or feature matrices
- UI examples (if evaluating tools)

---

## summarize-conversation-thread

Summarize GitHub issue/PR threads into key decisions, action items, and next steps.

**Triggers:**
- Catching up on a lengthy discussion
- Preparing to contribute to an existing thread
- Extracting decisions from a closed issue
- Identifying action items from a discussion

**Key Features:**
- Extracts key decisions and who made them
- Identifies action items with owners
- Notes unresolved questions
- Handles stale threads and heated discussions

**Output Structure:**

```markdown
## Summary: [Issue/PR Title]

**Status**: [Open/Closed] | **Comments**: [X] | **Last Activity**: [date]

### TL;DR

[2-3 sentence summary of the core discussion]

### Key Decisions

- **[Decision]**: [context and who decided]

### Action Items

- [ ] [Action] - @[owner]

### Open Questions

- [Unresolved question needing input]

### Next Steps

[What should happen next]
```

**What to Include:**

- Decisions made and who made them
- Action items with clear owners
- Unresolved questions or blockers
- Changes in direction or scope
- Links to key comments

**What to Skip:**

- Redundant "+1" or "me too" comments
- Off-topic tangents
- Superseded proposals
- Resolved sub-discussions

**Handling Edge Cases:**

| Situation | Approach |
|-----------|----------|
| Stale threads (>30 days) | Note this, flag if decisions may be outdated |
| Heated discussions | Present all perspectives neutrally |
| No resolution | Clearly state "No decision reached", summarize options |
| Long threads (50+ comments) | Break into phases if discussion evolved |

**Example:**

```markdown
## Summary: Add dark mode support (#142)

**Status**: Open | **Comments**: 23 | **Last Activity**: 2 days ago

### TL;DR

Team agreed to implement dark mode using CSS variables. Debate on whether to auto-detect system preference or default to light mode resolved in favor of auto-detect.

### Key Decisions

- **Use CSS variables**: Easier to maintain than separate stylesheets - @sarah
- **Auto-detect system preference**: Better UX, users can override - @mike

### Action Items

- [ ] Create color token system - @sarah
- [ ] Add toggle to settings page - @alex

### Next Steps

Sarah to submit initial PR with color variables by Friday.
```

---

## consolidate-notes-summary

Search project notes by topic, synthesize findings into a consolidated summary with cross-references.

**Triggers:**
- Gathering scattered knowledge on a topic
- Preparing a summary from multiple note sources
- Reviewing what's been documented about a subject
- Identifying gaps in documentation

**Key Features:**
- Searches notes by topic or tag
- Synthesizes information across sources
- Identifies patterns and conflicts
- Flags stale or outdated content

**Output Structure:**

```markdown
## Consolidated: [Topic]

**Sources**: [X notes reviewed] | **Date Range**: [earliest] to [latest]

### Summary

[Synthesized overview combining insights from all related notes]

### Key Points

- [Point 1] - from [note reference]
- [Point 2] - from [note reference]
- [Point 3] - from [note reference]

### Timeline

| Date | Event/Decision |
|------|----------------|
| [Date] | [What happened] |

### Cross-References

- **[Note 1 title]**: [how it relates to the topic]
- **[Note 2 title]**: [how it relates]

### Gaps

- [Information that's missing]
- [Topics that need more documentation]
- [Outdated content that needs refresh]
```

**Synthesis vs. Aggregation:**

| Do | Don't |
|----|-------|
| Combine related points into coherent insights | Just list content from each note |
| Find patterns across notes | Copy-paste sequentially |
| Resolve conflicts between sources | Ignore contradictions |

**Quality Checks:**

- Flag stale information (notes > 6 months old)
- Note contradictions between notes
- Identify outdated decisions that may need revisiting
- Highlight frequently referenced topics

**Handling Large Sets (>10 notes):**

- Group notes by subtopic
- Prioritize recent notes over old ones
- Summarize in layers (overview then details)

**Attribution:**

- Reference source notes for key points
- Include note titles or IDs for traceability
- Preserve original authors when known
