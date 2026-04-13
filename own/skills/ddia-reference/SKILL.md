---
name: ddia-reference
description: >
  Designing Data-Intensive Applications (DDIA) decision frameworks for architecture decisions.
  Quick-reference matrices for storage engines, replication, partitioning, and consistency models.
  Trigger: During sdd-design phase, when making data architecture decisions, or when choosing between
  storage strategies, replication topologies, or consistency guarantees.
license: MIT
metadata:
  author: JNZader
  version: "1.0"
  tags: [ddia, architecture, data-systems, distributed-systems]
  category: architecture
  source: luoling8192/ai-coding-principles
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

## Purpose

Provides decision matrices from "Designing Data-Intensive Applications" (Martin Kleppmann) for use during architecture design phases. Instead of guessing or defaulting to "just use Postgres", use these frameworks to make evidence-based storage and distribution decisions.

---

## When to Activate

- During sdd-design phase for any data-touching feature
- When choosing a database or storage engine
- When designing replication or partitioning strategies
- When selecting consistency guarantees for distributed systems
- Architecture reviews involving data flow or storage decisions

---

## Decision Framework 1: B-Tree vs LSM-Tree Storage Engines

### Decision Matrix

| Factor | B-Tree | LSM-Tree |
|--------|--------|----------|
| **Read performance** | Fast — O(log n) lookups | Slower — may check multiple SSTables |
| **Write performance** | Slower — random I/O, page splits | Fast — sequential writes to memtable |
| **Write amplification** | Lower (1 write per update) | Higher (compaction rewrites data) |
| **Space amplification** | Lower (in-place updates) | Higher (multiple versions until compaction) |
| **Predictable latency** | More predictable | Compaction can cause latency spikes |
| **Range queries** | Good — sorted pages | Good — sorted SSTables |
| **Concurrent writes** | Locks per page | Lock-free memtable writes |

### When to Choose

**Use B-Tree (PostgreSQL, MySQL InnoDB, SQLite) when**:
- Read-heavy workload (>80% reads)
- Need predictable latency (SLAs, real-time)
- Transaction isolation is critical (MVCC with B-trees)
- Dataset fits in memory or on fast SSDs
- Strong consistency required

**Use LSM-Tree (RocksDB, Cassandra, LevelDB, ScyllaDB) when**:
- Write-heavy workload (logging, time-series, event sourcing)
- Can tolerate occasional latency spikes from compaction
- Sequential disk I/O matters (spinning disks, cloud storage)
- High write throughput is the primary requirement
- Data is append-mostly (events, logs, metrics)

### Red Flags

- Choosing LSM for a transactional system with strict latency SLAs
- Choosing B-tree for a write-heavy event stream (will bottleneck on random I/O)
- Not considering compaction strategy (size-tiered vs leveled) for LSM

---

## Decision Framework 2: Replication Strategies

### Decision Matrix

| Factor | Single-Leader | Multi-Leader | Leaderless |
|--------|--------------|-------------|------------|
| **Write latency** | Higher (leader bottleneck) | Lower (local writes) | Lowest (any node) |
| **Read consistency** | Strong (read from leader) | Eventual | Eventual (tunable with quorums) |
| **Conflict handling** | No write conflicts | Must resolve conflicts | Must resolve conflicts |
| **Failover complexity** | Leader election needed | Automatic (other leaders exist) | No leader to fail |
| **Geographic distribution** | Poor (one leader location) | Good (leader per datacenter) | Good (any node serves) |
| **Use case fit** | Most applications | Multi-datacenter, offline-first | High availability, low latency |

### When to Choose

**Single-Leader (PostgreSQL streaming replication, MySQL replication) when**:
- Strong consistency is required
- Write conflicts are unacceptable (financial transactions, inventory)
- Single region deployment
- Team is small and wants simplicity
- Most web applications — this is the default choice

**Multi-Leader (CockroachDB, Citus, custom) when**:
- Multi-datacenter deployment with local write requirements
- Offline-first applications (each client is a "leader")
- Collaborative editing (CRDTs, OT)
- Can handle conflict resolution logic (last-write-wins, merge functions)

**Leaderless (Cassandra, DynamoDB, Riak) when**:
- Extreme availability requirements (no single point of failure)
- Can tolerate eventual consistency
- High write throughput across many nodes
- Anti-entropy and read-repair are acceptable overhead
- Shopping carts, session stores, DNS-like systems

### Conflict Resolution Strategies

When using multi-leader or leaderless, you MUST define a conflict resolution strategy:

| Strategy | Mechanism | Tradeoff |
|----------|-----------|----------|
| Last-Write-Wins (LWW) | Timestamp comparison | Simple but loses data silently |
| Custom merge function | Application-specific logic | Correct but complex to implement |
| CRDTs | Mathematically convergent types | No conflicts but limited data types |
| Version vectors | Track causal dependencies | Detects conflicts, app resolves |

---

## Decision Framework 3: Partitioning Patterns

### Decision Matrix

| Factor | Key Range | Hash | Composite |
|--------|-----------|------|-----------|
| **Range queries** | Excellent | Impossible | Possible on first key |
| **Hot spot risk** | High (sequential keys) | Low (uniform distribution) | Medium |
| **Rebalancing** | Split ranges | Consistent hashing | Per-partition |
| **Locality** | Related data together | Data scattered | Partial locality |
| **Implementation** | Sorted ranges | Hash ring / mod | Compound key design |

### When to Choose

**Key Range Partitioning when**:
- Range scans are the primary access pattern (time-series, logs by date)
- Data has natural ordering that queries exploit
- Can mitigate hot spots (prefix with tenant ID, reverse timestamp)
- Example: `sensor_id:2024-01-15` partitions by sensor, ranges by date

**Hash Partitioning when**:
- Uniform distribution is critical (no hot spots)
- Point lookups are the primary access pattern
- Range queries are not needed
- Example: partition by `hash(user_id)` for user profiles

**Composite Partitioning when**:
- Need both distribution AND locality
- First key determines partition (hash), second key determines sort within partition
- Example: `(hash(user_id), timestamp)` — user data distributed evenly, ordered by time within each partition
- Cassandra's partition key + clustering key is this pattern

### Hot Spot Mitigation

| Problem | Solution |
|---------|----------|
| Celebrity user (millions of followers) | Add random suffix to key, fan-out reads |
| Sequential timestamps | Prefix with hash of another dimension |
| Monotonic IDs | Use ULIDs or hash-based distribution |
| Skewed geographic data | Composite key with region + hash |

---

## Decision Framework 4: Consistency Models

### Spectrum (Strongest to Weakest)

| Model | Guarantee | Latency Cost | Use Case |
|-------|-----------|-------------|----------|
| **Linearizability** | Reads see most recent write | Highest (coordination required) | Leader election, locks, unique constraints |
| **Sequential consistency** | All nodes see same order | High | Distributed counters, queues |
| **Causal consistency** | Causally related ops ordered | Medium | Social feeds, chat (reply after post) |
| **Eventual consistency** | All nodes converge eventually | Lowest | Caching, DNS, shopping carts |

### Decision Guide

**Choose Linearizability when**:
- Correctness is non-negotiable (money, inventory, elections)
- You need compare-and-swap operations
- Single-leader with synchronous replication
- Accept: higher latency, lower availability (CAP theorem)

**Choose Causal Consistency when**:
- Need ordering guarantees without full linearizability
- Social features (see your own writes, read-after-write)
- Multi-leader setups where causal ordering suffices
- Good middle ground between correctness and performance

**Choose Eventual Consistency when**:
- Availability and latency are more important than immediate consistency
- Data conflicts can be resolved asynchronously
- Caching layers, CDNs, read replicas
- Accept: stale reads, conflict resolution complexity

### The CAP Theorem in Practice

CAP is often misunderstood. In practice, the choice is between:

| During Network Partition... | CP System | AP System |
|----------------------------|-----------|-----------|
| **Behavior** | Refuses writes, stays consistent | Accepts writes, may diverge |
| **User experience** | "Service unavailable" errors | Stale or conflicting data |
| **Recovery** | No conflicts to resolve | Must reconcile diverged state |
| **Examples** | ZooKeeper, etcd, Spanner | Cassandra, DynamoDB, CouchDB |

Most systems are CP in practice (PostgreSQL, MySQL) unless explicitly designed for AP.

---

## Quick Reference for sdd-design

When writing a technical design document, use this template for data decisions:

```markdown
### Data Architecture Decision

**Context**: {what data problem are we solving?}

**Storage Engine**: {B-Tree / LSM-Tree}
- Justification: {read/write ratio, latency requirements, data pattern}

**Replication**: {Single-Leader / Multi-Leader / Leaderless}
- Justification: {consistency needs, geographic distribution, availability requirements}

**Partitioning**: {Key Range / Hash / Composite / None}
- Justification: {access patterns, data volume, hot spot risk}
- Partition key: {the actual key design}

**Consistency**: {Linearizable / Causal / Eventual}
- Justification: {correctness requirements, latency budget, CAP tradeoff}

**Alternatives Considered**: {what was rejected and why}
```

---

## Critical Rules

1. NEVER default to "just use Postgres" without evaluating the read/write ratio and access patterns against the B-tree vs LSM-tree matrix
2. ALWAYS define a conflict resolution strategy when choosing multi-leader or leaderless replication — "eventual consistency" is not a strategy, it is a property
3. ALWAYS design the partition key based on the PRIMARY access pattern, not the data model — partition for queries, not for storage
4. NEVER choose linearizability unless you can justify the latency cost — most features only need causal or eventual consistency
5. Every data architecture decision in sdd-design MUST include the storage engine, replication, partitioning, and consistency choices with justification
6. Hot spot mitigation MUST be addressed for any partition scheme using sequential or skewed keys
