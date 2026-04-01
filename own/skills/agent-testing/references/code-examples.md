# Agent Testing — Code Examples

All code examples from the agent testing skill, organized by testing layer.

> This file contains the full Python/TypeScript test implementations.
> Load when writing actual agent tests.

## Unit Tests

### Assertion-Based Output Testing (Python)
Tests for prompt rendering, output parsing, role instructions.

### Template Variable Substitution Testing
Tests for `PromptTemplate` — variable substitution, missing vars, extras.

### System Prompt Injection Testing (Security)
Parametrized tests with injection payloads (DAN, system overrides, etc.) and safe inputs.

### Tool Selection Testing
Tests for `select_tools()` — search queries, math queries, simple chat, max tools.

### Output Schema Validation (Python + TypeScript)
Pydantic/Zod schema validation — valid responses, missing fields, out-of-range confidence.

## Scenario Tests

### Conversation Replay Testing
JSON fixture-based conversation replay with tool call and content assertions.

### State Machine Testing
`AgentStateMachine` transitions: IDLE → THINKING → TOOL_CALLING → RESPONDING → FALLBACK.

### Error Recovery Testing
Retry on tool failure, graceful degradation, invalid LLM output recovery, context overflow.

### Handoff Testing
Multi-agent orchestrator testing — research→writing handoff, review rejection→rewrite.

## Evaluation Suites (LLM-as-Judge)

### LLMJudge Class
OpenAI-based judge with criteria scoring (1-5), pass thresholds, JSON output.

### Evaluation Test Suite
Parametrized quality tests: factual, coding, safety cases with criteria + thresholds.

### Regression Detection
Compare agent output against known-good baselines, detect score degradation.

### A/B Testing Framework
Compare two prompt versions on same test cases, statistical significance.

### Safety and Boundary Testing
Harmful request refusal, PII handling, role-breaking attempts, context manipulation.

## Prompt Versioning

### YAML-Based Prompt Definitions
Versioned prompt files with metadata, variables, templates.

### Prompt Changelog Format
`[version] - date` with Changed/Removed/Test Results sections.

## CI/CD Integration

### GitHub Actions Workflow
Three-tier job: unit (every push) → scenario (on PR) → evaluation (nightly).

### Cost-Aware Test Execution
Model cost tracking during tests, budget enforcement.

---

**Note**: For the full code of each section, read the original source at the commit where this reference was created. The examples above describe the patterns — the actual implementations are extensive Python/TypeScript test suites.
