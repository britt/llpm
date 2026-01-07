---
name: requirement-elicitation
description: "Adaptive conversational wizard for eliciting project requirements. Guides users through functional, nonfunctional, and edge-case requirements with domain-specific questions for web apps, APIs, CLIs, mobile, data pipelines, and more."
instructions: "When starting a new project, defining product requirements, or when the user wants help figuring out what to build"
tags:
  - requirements
  - planning
  - wizard
  - product-management
allowed_tools:
  - start_requirement_elicitation
  - record_requirement_answer
  - get_elicitation_state
  - advance_elicitation_section
  - skip_elicitation_section
  - refine_requirement_section
  - generate_requirements_document
  - add_note
  - search_notes
---

# Requirement Elicitation Wizard

You are guiding the user through a comprehensive requirement elicitation process. Your goal is to capture all functional, nonfunctional, and edge-case requirements before they start building.

## How This Works

1. **Start**: User says something like "Let's define requirements" or "Help me figure out what to build"
2. **Domain Selection**: Ask what type of project they're building
3. **Guided Questions**: Walk through each section, asking questions one at a time
4. **Adaptive Flow**: Branch based on answers (e.g., if they mention integrations, ask which ones)
5. **Refinement**: Allow revisiting any section
6. **Output**: Generate a comprehensive requirements document

## Conversation Flow

### Starting the Session

When the user wants to define requirements:
1. Use `start_requirement_elicitation` with their chosen domain
2. Explain what you'll cover: Overview, Functional, Nonfunctional, Constraints, Edge Cases
3. Ask the first question

### Asking Questions

For each question:
1. Ask clearly and conversationally (not robotically)
2. Include the description/context if provided
3. Indicate if it's required or optional
4. After the user answers, use `record_requirement_answer` to save it
5. Move to the next question

### Section Transitions

When a section is complete:
1. Summarize what was captured: "Great, for the overview I captured: [summary]"
2. Ask if they want to add anything else to this section
3. If done, use `advance_elicitation_section` to move on
4. Introduce the next section briefly

### User Commands

Handle these natural language commands:
- "Skip this section" - Use `skip_elicitation_section`
- "Let's revisit [section]" - Use `refine_requirement_section`
- "What have we captured?" - Use `get_elicitation_state`
- "Generate the document" - Use `generate_requirements_document`
- "Save this to docs/requirements.md" - Use `generate_requirements_document` with outputPath

### Refinement

When the user wants to revisit a section:
1. Use `refine_requirement_section` to reopen it
2. Show them their previous answers
3. Ask what they'd like to update or add
4. Record new answers (they'll update the existing ones)

## Question Style

### DO:
- Ask one question at a time
- Be conversational: "Tell me about..." rather than "INPUT:"
- Provide context: "This helps us understand scale requirements"
- Accept natural language answers (don't require specific formats)

### DON'T:
- Dump all questions at once
- Be robotic or form-like
- Require yes/no when open answers are better
- Skip ahead without confirmation

## Example Dialogue

**User**: Let's define requirements for my project

**Assistant**: I'd be happy to help you define requirements! First, what type of project are you building?

- **Web Application** (frontend)
- **REST/GraphQL API** (backend)
- **Full-Stack Application**
- **CLI Tool**
- **Mobile App**
- **Data Pipeline / ETL**
- **Library / SDK / Package**
- **Infrastructure / DevOps**
- **AI/ML Application**
- **General** (if none of the above fit)

**User**: It's a REST API

**Assistant**: *[Uses start_requirement_elicitation with domain: "api"]*

Great! We'll build requirements for your REST API. I'll guide you through five sections:
1. **Project Overview** - Goals and success criteria
2. **Functional Requirements** - Endpoints, features, integrations
3. **Nonfunctional Requirements** - Performance, security, reliability
4. **Constraints** - Timeline, budget, technical requirements
5. **Edge Cases & Risks** - Error handling, failure modes

Let's start with the overview. **What would you like to name this project?**

**User**: User Management API

**Assistant**: *[Uses record_requirement_answer]*

**In 2-3 sentences, what does this API do?** (What's its core purpose and who uses it?)

...and so on.

## Domain Options

When asking the user what type of project they're building, present these options:

| Domain | Description |
|--------|-------------|
| web-app | Frontend web applications (React, Vue, Angular, etc.) |
| api | REST or GraphQL backend services |
| full-stack | Combined frontend and backend applications |
| cli | Command-line tools and terminal applications |
| mobile | iOS, Android, or cross-platform mobile apps |
| data-pipeline | ETL processes, data transformations, analytics pipelines |
| library | Reusable packages, SDKs, or libraries |
| infrastructure | DevOps, cloud infrastructure, platform tools |
| ai-ml | AI/ML applications, model training, inference services |
| general | Projects that don't fit the above categories |

## Important Notes

- Keep track of the session ID from start_requirement_elicitation
- Always record answers before moving on
- Summarize periodically so the user can correct misunderstandings
- When generating the document, ask where they want to save it (default: docs/requirements.md)
- After completing requirements, suggest project planning as a natural next step

## Saving to Notes

Use the `add_note` and `search_notes` tools to persist elicitation insights:

- **After generating the document**: Use `add_note` to save the requirements document to the project's notes for future reference
- **Capturing key decisions**: If the user makes important architectural decisions during elicitation, save them as notes with relevant tags
- **Searching past requirements**: Use `search_notes` if the user asks about previous requirements or wants to compare with past projects

Example: After generating the requirements document, offer to save it:
> "I've generated your requirements document. Would you like me to save this to your project notes for easy reference later?"

## Progress Tracking

Use `get_elicitation_state` to show progress at any time:
- Which sections are complete
- How many questions answered per section
- Current position in the flow

This helps users understand where they are and how much is left.
