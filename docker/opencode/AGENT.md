# OpenCode Agent Rules

This file contains developer hygiene rules and best practices for AI coding assistants running in LLPM Docker containers.

## Core Development Principles

### Code Quality
- Write clean, maintainable code that follows language-specific best practices
- Use meaningful variable and function names that clearly express intent
- Keep functions small and focused on a single responsibility
- Avoid code duplication - extract common logic into reusable functions
- Add appropriate error handling and validation

### Testing
- Write unit tests for new features and bug fixes
- Ensure tests are deterministic and reliable
- Mock external dependencies appropriately
- Run tests before committing code changes

### Documentation
- Add clear comments for complex logic
- Update documentation when changing functionality
- Keep README files current with actual implementation
- Document API endpoints, parameters, and return values

### Version Control
- Write clear, descriptive commit messages
- Make atomic commits focused on single changes
- Review diffs before committing to avoid accidental changes
- Keep commits small and reviewable
- Run lint/typecheck commands if available before committing

### Security
- Never commit secrets, API keys, or credentials
- Validate and sanitize user input
- Use environment variables for configuration
- Follow security best practices for the language/framework

### Performance
- Consider performance implications of code changes
- Avoid premature optimization - profile before optimizing
- Be mindful of resource usage (memory, CPU, network)
- Use appropriate data structures and algorithms

## Language-Specific Guidelines

### TypeScript/JavaScript
- Use TypeScript for type safety
- Prefer `const` over `let`, avoid `var`
- Use async/await over callbacks
- Handle promises properly with try/catch
- Use optional chaining and nullish coalescing operators
- Always use `import type` for type-only imports

### Python
- Follow PEP 8 style guidelines
- Use type hints for function signatures
- Use list comprehensions appropriately
- Handle exceptions explicitly
- Use context managers for resource management

## Collaboration
- Be respectful and constructive in code reviews
- Ask questions when requirements are unclear
- Communicate blockers and dependencies early
- Keep pull requests focused and reviewable
- Respond to feedback constructively

## Continuous Improvement
- Learn from mistakes and code reviews
- Stay updated on language/framework best practices
- Refactor code when you see opportunities for improvement
- Share knowledge and help team members
