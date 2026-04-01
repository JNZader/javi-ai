# Playbooks — Advanced Patterns

## Conditional Tasks

```markdown
- [ ] Run test suite on staging
- [ ] [IF all tests pass] Deploy to production
- [ ] [IF any test fails] Create bug report and halt playbook
- [ ] [IF weekend] Skip Slack notification
```

Agent evaluates condition in brackets. False = mark as skipped.

## Parameterized Playbooks

Use `{{parameter}}` syntax for reusable playbooks:

```markdown
## Parameters
- `{{service_name}}`: Service to deploy
- `{{version}}`: Version tag
- `{{environment}}`: Target (staging/production)

## Tasks
- [ ] Build: `docker build -t {{service_name}}:{{version}} .`
- [ ] Push: `docker push registry/{{service_name}}:{{version}}`
- [ ] Deploy: `kubectl set image deployment/{{service_name}} app={{service_name}}:{{version}}`
```

**Instantiation**: `sed 's/{{service_name}}/user-api/g; s/{{version}}/2.1.0/g' template.md > active/deploy.md`

## Playbook Chaining

```markdown
## Metadata
- **Chain**: 01-implement.md → 02-test.md → 03-review.md → 04-deploy.md

## Tasks
- [ ] Execute playbook: .ai-playbooks/01-implement-feature.md
- [ ] Execute playbook: .ai-playbooks/02-write-tests.md
```

## Approval Gates

```markdown
- [x] Run migration on staging
- [ ] [APPROVAL REQUIRED] Approve production migration (@tech-lead)
- [ ] Run migration on production
```

Agent halts and notifies. Resumes when human checks the box.

## Rollback Tasks

```markdown
## Tasks
- [ ] Deploy v2.1.0 to production
- [ ] Run smoke tests

## Rollback (execute if any task above fails)
- [ ] Revert: `kubectl rollout undo deployment/api`
- [ ] Verify rollback
- [ ] Notify team
```

## Playbook Marketplace

```
team-playbooks/
  deploy/standard-deploy.md, hotfix-deploy.md, canary-deploy.md
  features/crud-feature.md, graphql-feature.md
  operations/incident-response.md, dependency-update.md
```

## Integration Patterns

### Playbooks vs SDD Tasks

| Scenario | Use Playbooks | Use SDD |
|----------|---------------|---------|
| Quick feature (< 2h) | Yes | Overkill |
| Complex multi-day | No | Yes |
| Repeatable process | Yes | No |
| Needs architecture decisions | No | Yes |

### Wave Executor Integration

```markdown
## Metadata
- **Execution mode**: parallel

## Tasks
- [ ] [PARALLEL] Implement GET /users in src/api/users.ts
- [ ] [PARALLEL] Implement GET /prefs in src/api/preferences.ts
- [ ] [SEQUENTIAL] Add integration tests for all endpoints
```

### Storage Conventions

```
.ai-playbooks/
  active/          # Currently executing
  templates/       # Reusable templates
  archive/         # Completed playbooks
```
