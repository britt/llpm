# {{agent_name}} Agent Rules

This file contains developer hygiene rules and best practices for AI coding assistants running in LLPM Docker containers.

## Core Development Principles

### Code Quality
- Write clean, maintainable code that follows language-specific best practices
- Use meaningful variable and function names that clearly express intent
- Keep functions small and focused on a single responsibility
- **DRY (Don't Repeat Yourself)**: Before coding something from scratch, search the codebase for similar operations, functions, or patterns and follow the same approach for consistency
- Avoid code duplication - extract common logic into reusable functions
- **YAGNI (You Aren't Gonna Need It)**: Only implement what is actually needed now, not what might be needed in the future
- **Clean up after yourself**: Delete unused code, imports, functions, and files when making changes that render them obsolete
- **No fake implementations**: Never hard code values or create fake/stub implementations unless explicitly asked to do so - always implement real, functional code
- **Prefer official SDKs**: Always use official SDKs and client libraries instead of making direct HTTP requests to REST APIs - SDKs provide better type safety, error handling, and maintenance
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
- Write clear, descriptive commit messages using conventional commits format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `refactor:` for code refactoring
  - `test:` for adding or updating tests
  - `chore:` for maintenance tasks
  - `perf:` for performance improvements
  - Add `!` after type or include `BREAKING CHANGE:` in footer for breaking changes
- Make atomic commits focused on single changes
- Review diffs before committing to avoid accidental changes
- Keep commits small and reviewable
- Run lint/typecheck commands if available before committing
- Use semantic versioning (semver) for version numbers:
  - MAJOR version for incompatible API changes or breaking changes
  - MINOR version for new features that maintain backward compatibility
  - PATCH version for bug fixes, documentation updates, and small improvements

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

{{#if agent_specific_rules}}
## {{agent_name}}-Specific Guidelines

{{{agent_specific_rules}}}
{{/if}}
