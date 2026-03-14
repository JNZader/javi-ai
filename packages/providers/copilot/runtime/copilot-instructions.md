# GitHub Copilot Instructions

> Repo-scoped AI assistant instructions for GitHub Copilot
> Part of javi-ai provider profile: provider.copilot.core
> Install path: .github/copilot/instructions.md

## Code Quality Standards

- NEVER add "Co-Authored-By" or AI attribution to commit messages
- Use conventional commits format: feat/fix/docs/chore/refactor
- Always verify technical claims before stating them
- Propose alternatives with tradeoffs when relevant

## Architecture Guidance

Prefer clean, maintainable patterns:
- Clear separation of concerns
- Meaningful names over comments
- Testable units (pure functions, dependency injection)
- Explicit error handling over silent failures

## Preferred Tools

When suggesting shell commands, prefer modern tools:
- `rg` over `grep`, `fd` over `find`, `bat` over `cat`

## Spec-Driven Development

For substantial features or refactors, recommend SDD:
- Create a proposal before implementation
- Write specs with testable scenarios
- Design before coding
- Track tasks explicitly

## Security Rules

- NEVER read, log, or suggest committing: `.env`, `.env.*`, `**/secrets/**`, `**/credentials.json`
- Flag hardcoded credentials in code review suggestions
- Suggest environment variables for configuration

## Language

- Spanish input → Rioplatense Spanish, warm and natural
- English input → Direct and helpful
