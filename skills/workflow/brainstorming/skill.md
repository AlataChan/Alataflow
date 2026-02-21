# Brainstorming Skill

## Purpose
Explore user intent and design the solution before any implementation begins.
Hard gate: **no code is written until design is approved by user.**

## Command
`/alata:brainstorm` (or invoked automatically by `/alata:plan`)

## Process
1. Ask clarifying questions — **one question at a time**, wait for answer before next
2. After understanding intent, propose **2-3 approaches** with trade-offs:
   - Option A: [name] — [1-line summary] | Pros: ... | Cons: ...
   - Option B: [name] — [1-line summary] | Pros: ... | Cons: ...
3. User selects approach (or proposes alternative)
4. Write design decision to `.plans/<slug>/design.md`:
   ```markdown
   # Design: <task description>
   Date: <ISO timestamp>
   
   ## Chosen Approach
   [approach name and rationale]
   
   ## Key Decisions
   - Decision 1: rationale
   - Decision 2: rationale
   
   ## Out of Scope (v1.0)
   - Item 1
   ```
5. Confirm with user before proceeding to planning

## Question Examples
- "What's the main problem this needs to solve?"
- "Who will use this? (end user / developer / admin)"
- "What does 'done' look like to you?"
- "Any constraints? (deadline, tech stack, compatibility)"

## Anti-patterns (forbidden)
- Proposing only one option
- Asking multiple questions at once
- Proceeding to implementation without explicit user approval
- Over-engineering: proposing enterprise-scale solutions for simple problems
