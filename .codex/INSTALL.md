# AlataFlow — Codex Installation Guide

AlataFlow is designed for Claude Code's hook system. For Codex, hooks are unavailable — use the skills manually.

## What Works in Codex
- All `skills/` markdown files (invoke by name)
- Planning, memory recall, capsule extract/apply (without automatic hooks)
- Task Space concepts (without automatic git worktree management)

## What Requires Claude Code
- Automatic hooks (session-start, scrubber, progress-save, stop-verify)
- Automatic progress.md logging on every file write
- Privacy guard on every prompt submission

## Manual Setup
1. Copy the `skills/` directory into your project or Codex context
2. Copy `CLAUDE.md` rules to your Codex instructions
3. Create `.alataflow/` manually:
   ```bash
   mkdir -p .alataflow
   echo '' > .alataflow/memory.jsonl
   echo '[]' > .alataflow/spaces.json
   echo '{}' > .alataflow/session_state.json
   ```

## Manual Memory (without hooks)
Before each session, manually load memories:
```bash
node -e "
const { loadMemoriesForProject } = await import('./runtime/memory-loader.js');
const mems = loadMemoriesForProject(process.cwd(), process.cwd());
console.log(mems.map(m => '- ' + m.summary).join('\n'));
"
```

## Available Runtime Scripts
All scripts in `runtime/` can be run directly with Node.js (no compilation needed):
- `runtime/init.js` — initialize .alataflow/
- `runtime/memory-writer.js` — save memories
- `runtime/memory-loader.js` — load memories
- `runtime/memory-search.js` — search memories
- `runtime/capsule-decay.js` — apply confidence decay
- `runtime/evolution-manager.js` — extract/update capsules
- `runtime/space-manager.js` — manage task spaces
- `runtime/progress-writer.js` — log progress
