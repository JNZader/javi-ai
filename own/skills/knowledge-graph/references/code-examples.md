# Knowledge Graph — Code Examples

## 1. Creating a Knowledge Graph Entry (Markdown)

### New Module Entry

```markdown
# JWT Middleware

**Domain**: auth
**Type**: module
**Related**: [[auth/session-store]], [[api/rate-limiter]], [[db/redis-config]]
**Engram**: kg/auth/jwt-middleware

## Description

Validates JWT tokens on all `/api/*` routes. Extracts user claims and attaches to request context. Rejects expired or malformed tokens with 401.

## Relationships

- **depends-on**: [[auth/session-store]] — checks token revocation list
- **depends-on**: [[db/redis-config]] — revocation list stored in Redis
- **used-by**: [[api/rate-limiter]] — rate limits are per-user after auth

## Conventions

- Always call `next()` after successful validation, never throw directly
- Token refresh is handled by a separate `/auth/refresh` endpoint, not middleware
- Use `req.user` for extracted claims, never re-parse the token downstream

## Gotchas

- Token expiry check uses server time — clock skew between services causes false rejections
- Empty `Authorization` header returns 401, missing header returns 403 (legacy behavior)
```

### Architectural Decision Entry

```markdown
# Event Sourcing for Payments

**Domain**: payments
**Type**: decision
**Related**: [[payments/payment-processor]], [[db/event-store]], [[api/webhooks]]
**Engram**: kg/payments/event-sourcing/decision

## Description

Adopted event sourcing for the payments domain to maintain full audit trail. Commands produce events, events are the source of truth, projections build read models.

## Relationships

- **enables**: [[payments/payment-processor]] — processes payment commands
- **depends-on**: [[db/event-store]] — stores event stream
- **affects**: [[api/webhooks]] — webhooks are projected from events

## Conventions

- Events are immutable — never modify stored events
- Projections are disposable — can be rebuilt from event stream
- Command handlers validate business rules BEFORE producing events

## Gotchas

- Event schema versioning: always use `version` field, upcasters handle old events
- Projection rebuild takes ~15 min for full history — use snapshots for hot paths
```

---

## 2. Engram Relationship Linking

### Save a Concept to Engram

```
mem_save(
  title: "kg/auth/jwt-middleware",
  topic_key: "kg/auth/jwt-middleware",
  type: "architecture",
  project: "my-app",
  content: "**What**: JWT validation middleware for /api/* routes
**Type**: module
**Links**: [[kg/auth/session-store]], [[kg/api/rate-limiter]], [[kg/db/redis-config]]
**Where**: src/middleware/auth.ts
**Conventions**: Always next() after validation, never throw. Use req.user for claims.
**Gotchas**: Clock skew causes false 401s. Empty vs missing Authorization header differ."
)
```

### Save a Decision Linked to Concepts

```
mem_save(
  title: "kg/payments/event-sourcing/decision",
  topic_key: "kg/payments/event-sourcing/decision",
  type: "decision",
  project: "my-app",
  content: "**What**: Adopted event sourcing for payments audit trail
**Why**: Regulatory requirement for complete payment history
**Links**: [[kg/payments/payment-processor]], [[kg/db/event-store]], [[kg/api/webhooks]]
**Where**: src/payments/ (entire domain)
**Learned**: Event schema versioning is critical — always include version field"
)
```

### Follow a Relationship Chain

```
# Step 1: Find the starting concept
mem_search(query: "kg/auth/jwt-middleware", project: "my-app")
# -> Returns observation with Links: [[kg/auth/session-store]], ...

# Step 2: Follow a link
mem_search(query: "kg/auth/session-store", project: "my-app")
# -> Returns session-store observation with its own Links

# Step 3: Get full content
mem_get_observation(id: {found_id})
# -> Full untruncated content with all relationships
```

### Save the Master Index

```
mem_save(
  title: "kg/_index",
  topic_key: "kg/_index",
  type: "architecture",
  project: "my-app",
  content: "# Knowledge Graph Index

## auth
- [[kg/auth/jwt-middleware]] — JWT validation middleware
- [[kg/auth/session-store]] — Token revocation and session tracking

## payments
- [[kg/payments/payment-processor]] — Command handler for payments
- [[kg/payments/event-sourcing/decision]] — Why we use event sourcing

## api
- [[kg/api/rate-limiter]] — Per-user rate limiting

## db
- [[kg/db/redis-config]] — Redis connection and config
- [[kg/db/event-store]] — Event sourcing persistence"
)
```

---

## 3. Consistency Check Patterns

### Dead Link Detection (Agent Workflow)

```
1. Read all .knowledge/**/*.md files
2. Extract all [[links]] using regex: \[\[([^\]]+)\]\]
3. For each link, check if .knowledge/{link}.md exists
4. Report missing targets:

   Dead Links Found:
   - [[auth/oauth-provider]] referenced in auth/jwt-middleware.md — FILE NOT FOUND
   - [[db/postgres-config]] referenced in payments/event-store.md — FILE NOT FOUND

   Suggested actions:
   - Create .knowledge/auth/oauth-provider.md if concept is real
   - Remove [[db/postgres-config]] link if concept was renamed to [[db/redis-config]]
```

### Orphan Detection (Agent Workflow)

```
1. List all .knowledge/**/*.md files (excluding _index.md)
2. For each file, search all OTHER files for [[{file-path}]]
3. If zero references found, flag as orphan:

   Orphan Concepts Found:
   - .knowledge/legacy/old-auth.md — zero incoming links
   - .knowledge/utils/string-helpers.md — zero incoming links

   Suggested actions:
   - Archive old-auth.md if superseded (add superseded-by link)
   - Link string-helpers.md from modules that use it, or remove if unused
```

### Engram Link Validation

```
1. mem_search(query: "kg/", project: "{project}", limit: 20)
2. For each observation, extract **Links** field
3. For each linked topic key, mem_search to verify it exists
4. Report broken engram links:

   Broken Engram Links:
   - kg/auth/jwt-middleware links to [[kg/auth/oauth-provider]] — NOT FOUND in engram
   
   Fix: Either create the missing observation or update the Links field
```
