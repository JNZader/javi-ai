# Code Examples: Session Audit Trail

Full implementation references for audit trail emission, storage, and replay.

---

## TypeScript: AuditTrail Class

```typescript
/**
 * Audit trail manager for SDD workflow runs.
 * Emits events, persists to engram, supports replay.
 */

// --- Types ---

interface FileChange {
  path: string;
  action: 'created' | 'modified' | 'deleted';
}

interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
}

type AuditEvent =
  | { ts: string; type: 'run_started'; detail: { change: string } }
  | { ts: string; type: 'task_started'; detail: { id: string; description: string } }
  | { ts: string; type: 'task_completed'; detail: { id: string } }
  | { ts: string; type: 'task_failed'; detail: { id: string; reason: string } }
  | { ts: string; type: 'test_passed'; detail: { id: string; file: string } }
  | { ts: string; type: 'test_failed'; detail: { id: string; file: string; error: string } }
  | { ts: string; type: 'file_created'; detail: { path: string } }
  | { ts: string; type: 'file_modified'; detail: { path: string } }
  | { ts: string; type: 'file_deleted'; detail: { path: string } }
  | { ts: string; type: 'error'; detail: { message: string; recoverable: boolean } }
  | { ts: string; type: 'run_completed'; detail: { duration_ms: number } }
  | { ts: string; type: 'run_failed'; detail: { reason: string } };

interface AuditRun {
  version: 1;
  run_id: string;
  change_name: string;
  project: string;
  started_at: string;
  ended_at?: string;
  status: 'running' | 'completed' | 'failed' | 'killed';
  tasks_completed: string[];
  files_changed: FileChange[];
  tests_run: TestResults;
  events: AuditEvent[];
}

// --- Engram adapter (abstract — implement per environment) ---

interface EngramAdapter {
  save(title: string, topicKey: string, project: string, content: string): Promise<number>;
  update(id: number, content: string): Promise<void>;
  search(query: string, project: string): Promise<{ id: number; content: string }[]>;
  get(id: number): Promise<{ content: string }>;
}

// --- AuditTrail ---

class AuditTrail {
  private run: AuditRun;
  private observationId: number | null = null;

  constructor(
    private readonly engram: EngramAdapter,
    changeName: string,
    project: string,
  ) {
    const now = new Date().toISOString();
    this.run = {
      version: 1,
      run_id: `${changeName}-${now}`,
      change_name: changeName,
      project,
      started_at: now,
      status: 'running',
      tasks_completed: [],
      files_changed: [],
      tests_run: { passed: 0, failed: 0, skipped: 0 },
      events: [],
    };
  }

  // --- Lifecycle ---

  async start(): Promise<string> {
    this.emit({ type: 'run_started', detail: { change: this.run.change_name } });
    this.observationId = await this.engram.save(
      `audit/${this.run.project}/${this.run.run_id}`,
      `audit/${this.run.project}/${this.run.run_id}`,
      this.run.project,
      JSON.stringify(this.run, null, 2),
    );
    return this.run.run_id;
  }

  async complete(): Promise<void> {
    const now = new Date().toISOString();
    this.run.ended_at = now;
    this.run.status = 'completed';
    const durationMs = new Date(now).getTime() - new Date(this.run.started_at).getTime();
    this.emit({ type: 'run_completed', detail: { duration_ms: durationMs } });
    await this.persist();
  }

  async fail(reason: string): Promise<void> {
    this.run.ended_at = new Date().toISOString();
    this.run.status = 'failed';
    this.emit({ type: 'run_failed', detail: { reason } });
    await this.persist();
  }

  // --- Task events ---

  async taskStarted(id: string, description: string): Promise<void> {
    this.emit({ type: 'task_started', detail: { id, description } });
    await this.persist();
  }

  async taskCompleted(id: string): Promise<void> {
    this.run.tasks_completed.push(id);
    this.emit({ type: 'task_completed', detail: { id } });
    await this.persist();
  }

  async taskFailed(id: string, reason: string): Promise<void> {
    this.emit({ type: 'task_failed', detail: { id, reason } });
    await this.persist();
  }

  // --- File events ---

  async fileCreated(path: string): Promise<void> {
    this.run.files_changed.push({ path, action: 'created' });
    this.emit({ type: 'file_created', detail: { path } });
  }

  async fileModified(path: string): Promise<void> {
    this.run.files_changed.push({ path, action: 'modified' });
    this.emit({ type: 'file_modified', detail: { path } });
  }

  async fileDeleted(path: string): Promise<void> {
    this.run.files_changed.push({ path, action: 'deleted' });
    this.emit({ type: 'file_deleted', detail: { path } });
  }

  // --- Test events ---

  async testPassed(taskId: string, file: string): Promise<void> {
    this.run.tests_run.passed++;
    this.emit({ type: 'test_passed', detail: { id: taskId, file } });
  }

  async testFailed(taskId: string, file: string, error: string): Promise<void> {
    this.run.tests_run.failed++;
    this.emit({ type: 'test_failed', detail: { id: taskId, file, error } });
  }

  // --- Error events ---

  async error(message: string, recoverable: boolean): Promise<void> {
    this.emit({ type: 'error', detail: { message, recoverable } });
    await this.persist();
  }

  // --- Internal ---

  private emit(event: Omit<AuditEvent, 'ts'>): void {
    this.run.events.push({ ts: new Date().toISOString(), ...event } as AuditEvent);
  }

  private async persist(): Promise<void> {
    if (this.observationId) {
      await this.engram.update(this.observationId, JSON.stringify(this.run, null, 2));
    }
  }

  // --- Static: Replay ---

  static async replay(engram: EngramAdapter, project: string, runId: string): Promise<string> {
    const results = await engram.search(`audit/${project}/${runId}`, project);
    if (results.length === 0) throw new Error(`Run not found: ${runId}`);

    const full = await engram.get(results[0].id);
    const run: AuditRun = JSON.parse(full.content);

    return AuditTrail.formatReplay(run);
  }

  static formatReplay(run: AuditRun): string {
    const lines: string[] = [];
    const duration = run.ended_at
      ? `${Math.round((new Date(run.ended_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
      : 'in progress';

    lines.push(`## Audit Trail: ${run.run_id}\n`);
    lines.push(`**Change**: ${run.change_name}`);
    lines.push(`**Project**: ${run.project}`);
    lines.push(`**Status**: ${run.status}`);
    lines.push(`**Duration**: ${duration}`);
    lines.push(`**Started**: ${run.started_at}`);
    if (run.ended_at) lines.push(`**Ended**: ${run.ended_at}`);

    // Files changed
    if (run.files_changed.length > 0) {
      lines.push('\n### Files Changed\n');
      lines.push('| File | Action |');
      lines.push('|------|--------|');
      for (const f of run.files_changed) {
        lines.push(`| \`${f.path}\` | ${f.action} |`);
      }
    }

    // Test results
    const t = run.tests_run;
    if (t.passed + t.failed + t.skipped > 0) {
      lines.push('\n### Test Results\n');
      lines.push('| Passed | Failed | Skipped |');
      lines.push('|:------:|:------:|:-------:|');
      lines.push(`| ${t.passed} | ${t.failed} | ${t.skipped} |`);
    }

    // Event timeline
    lines.push('\n### Event Timeline\n');
    lines.push('| Time | Event | Detail |');
    lines.push('|------|-------|--------|');
    for (const e of run.events) {
      const time = e.ts.split('T')[1]?.split('.')[0] ?? e.ts;
      const detail = JSON.stringify(e.detail);
      lines.push(`| ${time} | ${e.type} | ${detail} |`);
    }

    return lines.join('\n');
  }

  // --- Static: List runs ---

  static async listRuns(engram: EngramAdapter, project: string): Promise<string[]> {
    const results = await engram.search(`audit/${project}`, project);
    return results.map((r) => {
      try {
        const run: AuditRun = JSON.parse(r.content);
        return `${run.run_id} — ${run.status} — ${run.started_at}`;
      } catch {
        return `(unparseable observation ${r.id})`;
      }
    });
  }
}
```

---

## Python: AuditTrail

```python
"""Audit trail manager for SDD workflow runs."""

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Literal, Protocol


# --- Types ---

EventType = Literal[
    "run_started", "task_started", "task_completed", "task_failed",
    "test_passed", "test_failed", "file_created", "file_modified",
    "file_deleted", "error", "run_completed", "run_failed",
]

RunStatus = Literal["running", "completed", "failed", "killed"]


@dataclass
class AuditEvent:
    ts: str
    type: EventType
    detail: dict


@dataclass
class FileChange:
    path: str
    action: Literal["created", "modified", "deleted"]


@dataclass
class TestResults:
    passed: int = 0
    failed: int = 0
    skipped: int = 0


@dataclass
class AuditRun:
    version: int = 1
    run_id: str = ""
    change_name: str = ""
    project: str = ""
    started_at: str = ""
    ended_at: str | None = None
    status: RunStatus = "running"
    tasks_completed: list[str] = field(default_factory=list)
    files_changed: list[FileChange] = field(default_factory=list)
    tests_run: TestResults = field(default_factory=TestResults)
    events: list[AuditEvent] = field(default_factory=list)

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2, default=str)


# --- Engram adapter protocol ---

class EngramAdapter(Protocol):
    def save(self, title: str, topic_key: str, project: str, content: str) -> int: ...
    def update(self, obs_id: int, content: str) -> None: ...
    def search(self, query: str, project: str) -> list[dict]: ...
    def get(self, obs_id: int) -> dict: ...


# --- AuditTrail ---

class AuditTrail:
    def __init__(self, engram: EngramAdapter, change_name: str, project: str):
        now = datetime.now(timezone.utc).isoformat()
        self.engram = engram
        self.observation_id: int | None = None
        self.run = AuditRun(
            run_id=f"{change_name}-{now}",
            change_name=change_name,
            project=project,
            started_at=now,
        )

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _emit(self, event_type: EventType, detail: dict) -> None:
        self.run.events.append(AuditEvent(ts=self._now(), type=event_type, detail=detail))

    def _persist(self) -> None:
        if self.observation_id:
            self.engram.update(self.observation_id, self.run.to_json())

    # --- Lifecycle ---

    def start(self) -> str:
        self._emit("run_started", {"change": self.run.change_name})
        topic = f"audit/{self.run.project}/{self.run.run_id}"
        self.observation_id = self.engram.save(topic, topic, self.run.project, self.run.to_json())
        return self.run.run_id

    def complete(self) -> None:
        now = self._now()
        self.run.ended_at = now
        self.run.status = "completed"
        started = datetime.fromisoformat(self.run.started_at)
        ended = datetime.fromisoformat(now)
        duration_ms = int((ended - started).total_seconds() * 1000)
        self._emit("run_completed", {"duration_ms": duration_ms})
        self._persist()

    def fail(self, reason: str) -> None:
        self.run.ended_at = self._now()
        self.run.status = "failed"
        self._emit("run_failed", {"reason": reason})
        self._persist()

    # --- Task events ---

    def task_started(self, task_id: str, description: str) -> None:
        self._emit("task_started", {"id": task_id, "description": description})
        self._persist()

    def task_completed(self, task_id: str) -> None:
        self.run.tasks_completed.append(task_id)
        self._emit("task_completed", {"id": task_id})
        self._persist()

    def task_failed(self, task_id: str, reason: str) -> None:
        self._emit("task_failed", {"id": task_id, "reason": reason})
        self._persist()

    # --- File events ---

    def file_created(self, path: str) -> None:
        self.run.files_changed.append(FileChange(path=path, action="created"))
        self._emit("file_created", {"path": path})

    def file_modified(self, path: str) -> None:
        self.run.files_changed.append(FileChange(path=path, action="modified"))
        self._emit("file_modified", {"path": path})

    def file_deleted(self, path: str) -> None:
        self.run.files_changed.append(FileChange(path=path, action="deleted"))
        self._emit("file_deleted", {"path": path})

    # --- Test events ---

    def test_passed(self, task_id: str, file: str) -> None:
        self.run.tests_run.passed += 1
        self._emit("test_passed", {"id": task_id, "file": file})

    def test_failed(self, task_id: str, file: str, error: str) -> None:
        self.run.tests_run.failed += 1
        self._emit("test_failed", {"id": task_id, "file": file, "error": error})

    # --- Error ---

    def error(self, message: str, recoverable: bool) -> None:
        self._emit("error", {"message": message, "recoverable": recoverable})
        self._persist()

    # --- Replay ---

    @staticmethod
    def replay(engram: EngramAdapter, project: str, run_id: str) -> str:
        results = engram.search(f"audit/{project}/{run_id}", project)
        if not results:
            raise ValueError(f"Run not found: {run_id}")

        full = engram.get(results[0]["id"])
        run_data = json.loads(full["content"])

        lines = [f"## Audit Trail: {run_data['run_id']}\n"]
        lines.append(f"**Change**: {run_data['change_name']}")
        lines.append(f"**Status**: {run_data['status']}")
        lines.append(f"**Started**: {run_data['started_at']}")
        if run_data.get("ended_at"):
            lines.append(f"**Ended**: {run_data['ended_at']}")

        # Files
        if run_data.get("files_changed"):
            lines.append("\n### Files Changed\n")
            lines.append("| File | Action |")
            lines.append("|------|--------|")
            for f in run_data["files_changed"]:
                lines.append(f"| `{f['path']}` | {f['action']} |")

        # Tests
        t = run_data.get("tests_run", {})
        total = t.get("passed", 0) + t.get("failed", 0) + t.get("skipped", 0)
        if total > 0:
            lines.append("\n### Test Results\n")
            lines.append(f"Passed: {t['passed']} | Failed: {t['failed']} | Skipped: {t['skipped']}")

        # Timeline
        lines.append("\n### Event Timeline\n")
        lines.append("| Time | Event | Detail |")
        lines.append("|------|-------|--------|")
        for e in run_data.get("events", []):
            time = e["ts"].split("T")[1].split(".")[0] if "T" in e["ts"] else e["ts"]
            lines.append(f"| {time} | {e['type']} | {json.dumps(e['detail'])} |")

        return "\n".join(lines)
```

---

## Agent Integration: Inline Protocol

When an AI agent implements the audit trail during `/sdd-apply`, it follows this pseudocode:

```
# At the start of apply
run_id = "{change-name}-{new Date().toISOString()}"
audit = {
  version: 1, run_id, change_name, project,
  started_at: now(), status: "running",
  tasks_completed: [], files_changed: [], tests_run: {0,0,0},
  events: [{ ts: now(), type: "run_started", detail: { change } }]
}
obs_id = mem_save(title: "audit/{project}/{run_id}", topic_key: same, content: JSON(audit))

# For each task
audit.events.push({ ts: now(), type: "task_started", detail: { id, description } })
# ... do the work ...
# On file write:
audit.files_changed.push({ path, action: "created" })
audit.events.push({ ts: now(), type: "file_created", detail: { path } })
# On task complete:
audit.tasks_completed.push(id)
audit.events.push({ ts: now(), type: "task_completed", detail: { id } })
mem_update(id: obs_id, content: JSON(audit))

# At the end
audit.ended_at = now()
audit.status = "completed"
audit.events.push({ ts: now(), type: "run_completed", detail: { duration_ms } })
mem_update(id: obs_id, content: JSON(audit))
```

---

## Bash: Query Audit Trails via Engram

```bash
# Search all audit trails for a project (requires engram CLI or MCP)
# These are conceptual — adapt to your engram access method

# List all runs for project
mem_search --query "audit/my-app" --project "my-app"

# Get full trail for a specific run
mem_get_observation --id 12345

# Quick summary: parse JSON output
mem_get_observation --id 12345 | jq '{
  run_id: .run_id,
  status: .status,
  duration: ((.ended_at | fromdateiso8601) - (.started_at | fromdateiso8601)),
  files: (.files_changed | length),
  tasks: (.tasks_completed | length),
  events: (.events | length)
}'
```
