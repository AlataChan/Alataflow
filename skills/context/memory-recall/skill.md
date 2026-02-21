# Memory Recall Skill

## Purpose
Surface relevant past knowledge before starting work, and save new knowledge for future sessions.

## Commands
- `/alata:recall <query>` — search memory by keyword
- `/alata:remember <note>` — save a memory entry
- `/alata:memory status` — show memory statistics

## Automatic Recall (Session Start)
The SessionStart hook injects the top 10 most-recently-used memories for the current project into `additionalContext`. No manual action needed.

## Manual Recall: `/alata:recall <query>`
1. Call `searchMemory(projectRoot, { query, tags: { project: cwd } })`
2. Display results ranked by `last_used_at` (most recent first)
3. Show: summary, kind, confidence, last_used_at, tags
4. Update `use_count` on accessed entries (optional for v1.0)

Output format:
```
[AlataFlow Memory] Found 3 results for "FastAPI":

1. [pattern] FastAPI needs CORS for OAuth callbacks (confidence: 0.8, used: 2026-02-20)
2. [pattern] FastAPI startup event for DB connection (confidence: 0.6, used: 2026-02-15)
3. [lesson] FastAPI + Pydantic v2 breaking change in validators (confidence: 0.9, used: 2026-02-10)
```

## Save Memory: `/alata:remember <note>`
1. Parse note for tags (user can add #type:pattern, #area:auth etc.)
2. Call `writeMemory(projectRoot, { kind: 'memory', summary: note, tags: { project: cwd, ... } })`
3. Confirm: "[AlataFlow] Saved memory: sha256:xxxxxxxx"

## Memory Status: `/alata:memory status`
Output:
```
[AlataFlow Memory Status]
Total: 23 entries
  memory:  18
  capsule:  4
  gene:     1
Last sync: never (run /alata:memory sync)
Threshold: 23/50 (sync recommended at 50)
```

## Sync: `/alata:memory sync`
Compact and deduplicate `memory.jsonl` (remove entries with identical summary+project).
Triggered manually or prompted by hooks at 50-entry threshold.

## Memory Entry Schema
```json
{
  "asset_id": "sha256:abcd1234",
  "kind": "memory|capsule|gene",
  "summary": "short description",
  "content": "optional full content",
  "tags": { "project": "/path/to/project", "type": "pattern|lesson|decision", "area": "auth|db|api" },
  "confidence": 0.5,
  "success_streak": 0,
  "validation": "unverified|verified",
  "use_count": 0,
  "last_used_at": "ISO timestamp",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "synced_at": null
}
```
