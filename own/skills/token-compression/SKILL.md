---
name: token-compression
description: >
  5-layer token compression engine that reduces AI context costs by 70-97%.
  Trigger: When context is too large, token budget is exceeded, session is long, or user asks to compress/optimize context.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [optimization, tokens, context, compression]
  category: optimization
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

## Purpose

Reduce token usage in AI coding sessions through 5 composable, deterministic compression layers. No LLM inference required for compression itself.

---

## When to Activate

- Context window approaching capacity (>60% used)
- User asks to "compress", "reduce tokens", "optimize context"
- Session has been running for many interactions
- Large codebases being loaded into context
- Before compaction/context reset events

---

## 5-Layer Compression Pipeline

Each layer is **independent and composable**. Apply in order for maximum savings.

### Layer 1: Rule Engine (4-8% savings)

Deterministic text transformations:

1. **Dedup lines** — Remove exact duplicate lines within each context block
2. **Strip markdown filler** — Remove decorative separators (`---`, `***`, `===`), empty headings, excessive blank lines
3. **Merge sections** — Combine adjacent sections with the same heading level
4. **Collapse imports** — Group import statements into single-line summaries

```
BEFORE (12 tokens):
import { foo } from './foo'
import { bar } from './bar'
import { baz } from './baz'

AFTER (6 tokens):
imports: foo, bar, baz from ./foo, ./bar, ./baz
```

### Layer 2: Dictionary Encoding (4-5% savings)

Auto-learn a codebook from repeated terms and substitute with short codes:

1. Scan context for terms appearing 3+ times
2. Assign `$XX` codes (e.g., `$01` = `authentication`, `$02` = `middleware`)
3. Replace all occurrences
4. Prepend codebook header

```
CODEBOOK: $01=authentication $02=middleware $03=PostgreSQL
The $01 $02 validates JWT tokens before querying $03.
```

### Layer 3: Observation Compression (~97% savings on session history)

Compress session JSONL observations into structured summaries:

1. Group observations by type (tool_use, file_change, command, search)
2. Deduplicate by content hash
3. Summarize each group into a compact block:
   - Files changed: list of paths + operation (created/modified/deleted)
   - Commands run: list of commands + exit codes
   - Searches: queries + result counts

### Layer 4: RLE Pattern Detection (2-3% savings)

Identify repeated structural patterns:

1. Detect repeated test blocks → `[8 similar test blocks for validateUser]`
2. Detect repeated config entries → `[12 env vars following KEY=value pattern]`
3. Detect repeated API routes → `[CRUD routes for /users, /posts, /comments]`

### Layer 5: Tiered Summary Protocol

Generate tiered summaries for progressive context loading:

| Tier | Target | Content |
|------|--------|---------|
| **L0** | ~200 tokens | One-sentence purpose + key file list |
| **L1** | ~500 tokens | Architecture overview + API surface + dependencies |
| **L2** | Full | Complete context with all details |

**Usage pattern**: Start with L0, expand to L1 if needed, load L2 only for active work area.

---

## Benchmark Mode

Before compressing, always run a benchmark to preview savings:

```
## Compression Benchmark
- Input: 45,230 tokens
- Layer 1 (Rules):      -1,850 tokens (4.1%)
- Layer 2 (Dictionary):  -2,100 tokens (4.6%)
- Layer 3 (Observations):-28,500 tokens (63.0%)
- Layer 4 (RLE):         -1,200 tokens (2.7%)
- Total savings:        -33,650 tokens (74.4%)
- Output: 11,580 tokens
```

Never apply compression without showing the benchmark first.

---

## Integration with Engram

When Engram memory is available:

1. Compress observations using Layer 3 before saving to Engram
2. Store L0 summaries as observation titles
3. Store L1 summaries as observation content
4. Keep L2 (full) only in the active session

---

## Rules

1. **Never compress code that is being actively edited** — only compress context/history
2. **Always show benchmark before compressing** — user must see the savings
3. **Preserve all file paths and line numbers** — these are navigation anchors
4. **Codebook must be reversible** — always include the codebook header
5. **Layer 3 is the big win** — prioritize observation compression for maximum savings
