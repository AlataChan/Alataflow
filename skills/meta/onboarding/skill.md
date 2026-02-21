# Onboarding Skill

## Purpose
Guide new users through first-time AlataFlow setup. Provides a smooth "zero to first task" experience.

## Trigger
- Automatically invoked on first SessionStart (when init.js detects isFirstRun)
- Manual re-run: `/alata:onboard`

## Checklist
Run through these steps with the user:

### Step 1: Environment Check
```bash
node --version  # must be >= 18
```
If Node < 18: "Please upgrade Node.js to v18 or later. Download at nodejs.org"

### Step 2: Confirm Initialization
```bash
ls .alataflow/
# expected: memory.jsonl  spaces.json  session_state.json
```
If missing: run `initAlataflow(cwd)` manually.

### Step 3: Show First Example
Walk user through a minimal example:
```
/alata:plan "add a hello world endpoint"
```
Explain what happens: brainstorming → space creation → task_plan.md written → ready to implement.

### Step 4: Hook Overview (user-friendly)
Explain the 4 automatic hooks:
- **SessionStart**: loads your memories when you open Claude Code
- **UserPromptSubmit**: scans for accidentally pasted API keys (privacy guard)
- **PostToolUse**: saves progress notes after each file write (audit trail)
- **Stop**: reminds you to extract Capsules after productive sessions

### Step 5: Quick Reference
Key commands:
| Command | What it does |
|---------|-------------|
| `/alata:plan <desc>` | Start a new task |
| `/alata:recall <query>` | Search your memory |
| `/alata:remember <note>` | Save something to memory |
| `/alata:evolve extract` | Package a solution as Capsule |
| `/alata:finish` | Merge or close current task |
| `/alata:review` | Quick 3-check code review |
