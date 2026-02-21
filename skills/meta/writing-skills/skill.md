# Writing Skills Skill

## Purpose
Guide for creating new AlataFlow skills. Use when you need to add a new `/alata:*` command.

## When to Create a Skill vs a Runtime Script
- **Skill**: user-facing behavior, workflow instructions, decision logic for Claude
- **Runtime script**: pure data transformation, file I/O, algorithms that need testing

## Skill File Structure
```
skills/<category>/<name>/skill.md
```

Categories:
- `workflow/` — process skills (planning, finishing, reviewing)
- `context/` — knowledge management (memory recall, capsule apply)
- `evolution/` — genetic reuse (capsule extract, gene apply)
- `quality/` — verification and review
- `meta/` — skills about skills, onboarding, reference

## skill.md Template
```markdown
# <Skill Name> Skill

## Purpose
One paragraph: what problem does this solve? When is it used?

## Command
`/alata:<command> [args]`

## Process
Step-by-step instructions for Claude to follow.
Include: inputs, outputs, decisions, error cases.

## Output Format
What does the user see? What files are written?

## Integration
How does this connect to other skills or hooks?
```

## Before Committing a Skill
1. Invoke manually: type the command in a new session and verify Claude follows the steps
2. Check: does it output to the right file? Does it have the right hard gates?
3. Check: does it avoid doing things outside its scope?
