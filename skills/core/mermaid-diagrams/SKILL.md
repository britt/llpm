---
name: mermaid-diagrams
description: "Create visual diagrams using Mermaid syntax for documentation, architecture, workflows, and data models"
tags:
  - diagram
  - visualization
  - mermaid
  - flowchart
  - sequence
  - architecture
  - documentation
---

# Mermaid Diagrams Skill

Use Mermaid syntax to create clear, maintainable diagrams directly in markdown. Mermaid diagrams are rendered by GitHub, GitLab, and many documentation tools.

## When to Use Mermaid

- **Flowcharts**: Process flows, decision trees, algorithms
- **Sequence Diagrams**: API calls, user interactions, system communication
- **Class Diagrams**: Object relationships, database schemas
- **State Diagrams**: State machines, workflow states
- **Entity Relationship Diagrams**: Database design
- **Gantt Charts**: Project timelines, task scheduling
- **Git Graphs**: Branch strategies, release flows

## Basic Syntax Examples

### Flowchart
```mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```

### Sequence Diagram
```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Database

    Client->>API: Request data
    API->>Database: Query
    Database-->>API: Results
    API-->>Client: Response
```

### Class Diagram
```mermaid
classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }

    class Post {
        +String title
        +String content
        +publish()
    }

    User "1" --> "*" Post : creates
```

### State Diagram
```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Review: submit
    Review --> Published: approve
    Review --> Draft: reject
    Published --> [*]
```

### Entity Relationship Diagram
```mermaid
erDiagram
    USER ||--o{ POST : creates
    USER {
        int id PK
        string name
        string email
    }
    POST {
        int id PK
        int user_id FK
        string title
        text content
    }
```

## Best Practices

1. **Keep it Simple**: Start with basic shapes and relationships
2. **Use Descriptive Labels**: Make node names clear and meaningful
3. **Limit Complexity**: Break complex diagrams into multiple smaller ones
4. **Add Context**: Include a brief description above the diagram
5. **Test Rendering**: Verify diagrams render correctly in your target environment

## Common Patterns

### API Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database

    U->>F: Click button
    F->>A: POST /api/resource
    A->>D: INSERT data
    D-->>A: Success
    A-->>F: 201 Created
    F-->>U: Show confirmation
```

### Decision Flow
```mermaid
flowchart TD
    Start[Receive Request] --> Auth{Authenticated?}
    Auth -->|No| Reject[Return 401]
    Auth -->|Yes| Valid{Valid Input?}
    Valid -->|No| BadReq[Return 400]
    Valid -->|Yes| Process[Process Request]
    Process --> Success[Return 200]
```

### System Architecture
```mermaid
flowchart LR
    Client[Client App]
    LB[Load Balancer]
    API1[API Server 1]
    API2[API Server 2]
    Cache[(Redis Cache)]
    DB[(Database)]

    Client --> LB
    LB --> API1
    LB --> API2
    API1 --> Cache
    API2 --> Cache
    API1 --> DB
    API2 --> DB
```

## Syntax Reference

### Node Shapes
- `[Rectangle]` - Basic box
- `(Rounded)` - Rounded edges
- `{Diamond}` - Decision point
- `([Stadium])` - Pill shape
- `[[Subroutine]]` - Double border
- `[(Database)]` - Cylinder
- `((Circle))` - Circle

### Arrow Types
- `-->` - Solid arrow
- `-.->` - Dotted arrow
- `==>` - Thick arrow
- `--text-->` - Labeled arrow
- `---` - Line (no arrow)

### Styling
```mermaid
flowchart TD
    A[Normal]
    B[Highlighted]

    style B fill:#f96,stroke:#333,stroke-width:4px
```

## Tips for Documentation

1. **Inline Diagrams**: Embed directly in documentation for context
2. **Version Control**: Mermaid is text, so it diffs well in git
3. **Collaboration**: Team members can edit without special tools
4. **Automation**: Generate diagrams from code or data
5. **Accessibility**: Add alt text descriptions for screen readers

## Resources

- [Mermaid Official Docs](https://mermaid.js.org/)
- [Live Editor](https://mermaid.live/)
- GitHub/GitLab automatically render Mermaid in markdown

## Tool Usage

When asked to create diagrams:
1. Choose the appropriate Mermaid diagram type
2. Use clear, descriptive labels
3. Keep complexity manageable
4. Add a brief description above the diagram
5. Verify syntax is correct (no trailing commas, proper formatting)
