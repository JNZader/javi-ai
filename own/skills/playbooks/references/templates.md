# Playbooks — Templates

Reusable playbook templates with `{{parameter}}` placeholders.

## Feature Implementation

```markdown
# Playbook: Implement {{feature_name}}

## Metadata
- **Author**: @{{author}}
- **Created**: {{date}}
- **Estimated**: 2 hours
- **Tags**: feature, {{domain}}
- **Branch**: feature/{{feature_slug}}

## Prerequisites
- [ ] Feature spec reviewed and approved
- [ ] Branch created from latest main

## Tasks
- [ ] Create data model/types in src/models/{{model_name}}.ts
- [ ] Add database migration in src/migrations/{{timestamp}}_add_{{table_name}}.sql
- [ ] Implement service layer in src/services/{{service_name}}.ts
- [ ] Add API routes in src/api/{{route_name}}.ts
- [ ] Write unit tests in tests/unit/{{service_name}}.test.ts
- [ ] Write integration tests in tests/integration/{{route_name}}.test.ts
- [ ] Update API documentation
- [ ] Run full test suite and linter
- [ ] Self-review: check diff against feature spec

## Post-completion
- [ ] Create pull request against main
- [ ] Request review from {{reviewer}}
```

## Bug Fix

```markdown
# Playbook: Fix {{bug_title}}

## Metadata
- **Estimated**: 30 min
- **Tags**: bugfix, {{severity}}
- **Issue**: {{issue_url}}

## Prerequisites
- [ ] Bug reproduced locally
- [ ] Root cause identified: {{root_cause_description}}

## Tasks
- [ ] Write failing test that reproduces the bug
- [ ] Apply fix in {{source_file}}:{{line_range}}
- [ ] Verify fix: run the failing test
- [ ] Check for similar patterns elsewhere
- [ ] Run full test suite for regressions

## Post-completion
- [ ] Create PR referencing issue {{issue_url}}
```

## Code Review Cleanup

```markdown
# Playbook: PR Review Fixes for #{{pr_number}}

## Tasks
- [ ] {{reviewer_comment_1}}
- [ ] {{reviewer_comment_2}}
- [ ] Run tests after fixes: `npm test`
- [ ] Push and re-request review
```

## Release Preparation

```markdown
# Playbook: Release v{{version}}

## Prerequisites
- [ ] All features merged, no critical bugs, QA sign-off

## Tasks
- [ ] Create release branch: `git checkout -b release/v{{version}}`
- [ ] Update version in package.json/pyproject.toml/Cargo.toml
- [ ] Generate changelog from commits
- [ ] Run full test suite on release branch
- [ ] Build production artifacts
- [ ] Test production build locally
- [ ] Tag: `git tag v{{version}}`
- [ ] Create GitHub release
- [ ] Deploy to production
- [ ] Verify deployment (smoke tests)

## Post-completion
- [ ] Merge release branch back to main
- [ ] Update dev version to {{next_version}}-dev
```

## Developer Onboarding

```markdown
# Playbook: Developer Onboarding

## Prerequisites
- [ ] GitHub org access granted
- [ ] Cloud console access granted

## Tasks
- [ ] Clone: `git clone {{repo_url}}`
- [ ] Install deps: `npm install`
- [ ] Copy .env.example to .env, fill local values
- [ ] Start local DB: `docker compose up -d postgres redis`
- [ ] Run migrations: `npm run db:migrate`
- [ ] Seed data: `npm run db:seed`
- [ ] Start dev server: `npm run dev`
- [ ] Verify at http://localhost:3000
- [ ] Run tests: `npm test`
- [ ] Read docs/architecture.md and CONTRIBUTING.md
```

## Migration

```markdown
# Playbook: Migrate from {{old_system}} to {{new_system}}

## Prerequisites
- [ ] New system credentials configured
- [ ] Data backup completed
- [ ] Rollback plan documented

## Phase 1: Preparation
- [ ] Create adapter interface in src/adapters/{{interface_name}}.ts
- [ ] Implement new adapter in src/adapters/{{new_adapter}}.ts
- [ ] Add feature flag `use_{{new_system}}`

## Phase 2: Dual-Write
- [ ] Enable dual-write to both systems
- [ ] Monitor 24h, check consistency

## Phase 3: Cutover
- [ ] Switch reads to new system
- [ ] Monitor 2h
- [ ] Disable old system writes

## Phase 4: Cleanup
- [ ] Remove feature flag
- [ ] Remove old adapter code
- [ ] Update docs
```
