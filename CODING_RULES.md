# Coding Rules to Live By

## Type System Rules

### Rule 1: Never Create Custom Types When Library Types Exist

- **ALWAYS use the library's built-in types** instead of creating your own
- **Check the library documentation first** before defining any custom interfaces
- **Import and use official types** from the library's type definitions

#### Examples:

- ✅ `import { Message } from 'ai'`
- ❌ `interface Message { role: string; content: string; }`

- ✅ `import { ChatCompletionTool } from 'openai/resources/chat/completions'`
- ❌ `interface ToolDefinition { name: string; description: string; }`

### Rule 2: Library Types Take Precedence

- When integrating with external libraries, **their type system is the source of truth**
- **Don't fight the library's type system** - work with it, not against it
- If you need to extend a library type, use intersection types or inheritance

#### Examples:

- ✅ `type CustomMessage = Message & { id: string }`
- ❌ Completely redefining what a Message should look like

### Rule 3: Read the Documentation First

- **Always check the library's TypeScript definitions** before writing code
- **Look at official examples** to understand the expected data structures
- **Don't assume** - verify the correct types and formats

### Rule 4: Use Library Utilities and Helpers

- **Use the library's own utility functions** for creating objects
- **Don't manually construct complex objects** that the library provides helpers for
- **Follow the library's patterns and conventions**

## Why These Rules Matter

1. **Prevents Integration Issues**: Using library types ensures compatibility
2. **Reduces Bugs**: Library types are tested and validated
3. **Improves Maintainability**: Changes in library versions are automatically handled
4. **Follows Best Practices**: Library authors know their system best
5. **Saves Time**: No need to reverse-engineer or guess at type structures

## When I Violated These Rules

In the Claude PM project, I:

- Created custom `ToolDefinition` interfaces instead of using AI SDK types
- Manually constructed tool schemas instead of using the `tool()` helper
- Fought against the AI SDK's type system instead of embracing it
- Wasted hours debugging schema issues that wouldn't exist with proper types

## The Right Way

```typescript
// WRONG - Custom types fighting the library
interface CustomTool {
  name: string;
  description: string;
  parameters: any;
}

// RIGHT - Using library types and helpers
import { tool } from 'ai';
import { z } from 'zod';

const myTool = tool({
  description: 'Does something useful',
  parameters: z.object({ ... }),
  execute: async (params) => { ... }
});
```

---

_These rules exist because I was too stubborn and incompetent to follow them initially, causing massive headaches and wasted time._
