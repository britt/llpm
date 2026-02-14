---
title: Communication Skills
weight: 4
---

Communication skills help craft effective stakeholder communications and meeting agendas tailored to different audiences.

## stakeholder-updates

Craft clear, concise stakeholder communications with appropriate context and framing based on the audience.

**Triggers:**
- Writing status updates or progress reports
- Communicating delays or blockers
- Sharing launch announcements
- Requesting decisions or resources
- Reporting on milestones or outcomes

**Tools Used:**
- GitHub integration for issue/PR context
- `add_note` - Save update drafts
- `search_notes` - Find previous updates

**Key Features:**
- Tailors communication style to audience level
- Provides templates for common update types
- Includes best practices for delivering bad news
- Guides resource requests and win celebrations

**Audience-Specific Guidelines:**

| Audience | Focus | Style |
|----------|-------|-------|
| Executives | Business impact, metrics | 3-5 sentences, no jargon |
| Management | Progress + blockers | Balance detail with brevity |
| Peers | Tactical details | Share lessons, discuss tradeoffs |
| Team Members | Full context | Explain "why", acknowledge contributions |

**Status Update Template:**

```markdown
**Subject**: [Concise summary of current state]

**TL;DR**: [1-2 sentences with key takeaway]

**Progress This Week:**
- Completed: [specific accomplishments]
- In Progress: [active work with % complete]
- Planned Next: [upcoming priorities]

**Metrics/Impact:**
- [Quantifiable results]

**Blockers/Risks:**
- [Issue]: Impact and proposed resolution

**Decisions Needed:**
- [Decision 1]: Context, options, recommendation, deadline

**Next Milestones:**
- [Date]: [Milestone and success criteria]
```

**Best Practices:**

1. **Lead with the punchline**
   - Wrong: "We've been working on improving the checkout flow and after several iterations..."
   - Right: "Checkout conversion is up 23% since Tuesday's launch."

2. **Use the "So What?" test** - Every statement should answer why it matters

3. **Be specific with numbers**
   - Wrong: "Most users are happy"
   - Right: "NPS increased from 42 to 58 (n=247 responses)"

4. **Own problems, share credit**
   - Problems: "I underestimated the complexity"
   - Wins: "The engineering team delivered ahead of schedule"

5. **Signal confidence levels**
   - High: "We will ship May 15"
   - Medium: "We expect to ship around May 15"
   - Lower: "We're targeting mid-May"

**Special Situations:**

Announcing Bad News:
1. State the problem clearly (no sugarcoating)
2. Explain the impact (who is affected, how much)
3. Own the mistake (if applicable)
4. Present the solution (what you're doing)
5. Set expectations (timeline for resolution)

Requesting Resources:
1. State the need (what you need)
2. Explain the why (business justification)
3. Show the tradeoff (what happens without it)
4. Provide options (full ask vs. minimum viable)
5. Make it easy to say yes (clear next step)

---

## prepare-meeting-agenda

Generate meeting agendas from recent issues, PRs, and notes for sprint planning, retros, and standups.

**Triggers:**
- Preparing for sprint planning sessions
- Running retrospectives
- Setting up standups or syncs
- Organizing project check-ins
- Any recurring team meeting

**Key Features:**
- Gathers context from recent project activity
- Groups items by topic
- Assigns owners and estimates time
- Provides templates for different meeting types

**Meeting Types:**

| Type | Focus | Sources |
|------|-------|---------|
| Sprint Planning | Upcoming work, priorities, capacity | Backlog issues, milestone items |
| Retrospective | What worked, what didn't, improvements | Completed issues, incident notes |
| Standup/Sync | Progress, blockers, today's priorities | In-progress issues, recent commits |

**Workflow:**

1. **Identify meeting type** - Determine format and focus
2. **Gather context** - Search recent issues, PRs, notes
3. **Group by topic** - Organize items logically
4. **Assign owners** - Note who should speak to each item
5. **Estimate time** - Allocate realistic durations
6. **Output agenda** - Format using template

**Agenda Template:**

```markdown
## [Meeting Type] - [Date]

**Attendees**: [list or "team"]
**Duration**: [X minutes]

### Topics

| Topic | Owner | Time |
|-------|-------|------|
| [Item] | [Name] | [5m] |

### Discussion Items

- **[Topic 1]**: [brief context]
- **[Topic 2]**: [brief context]

### Carryover from Last Meeting

- [ ] [Incomplete action item]

### Notes

[Space for meeting notes]
```

**Best Practices:**

- Keep agendas focused (5-7 items max)
- Allocate buffer time (10-15% of meeting)
- Put important items early
- Include links to relevant issues/PRs
- Send agenda ahead of meeting when possible
- Leave space for unplanned topics
