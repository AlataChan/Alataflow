# Codebase Survey Skill

## Purpose
Scan and map a project's structure, tech stack, dependencies, and key patterns.
Essential for onboarding to unfamiliar codebases or before planning changes.

## Command
`/alata:explore`

## Process
1. **Project Structure**: List top-level directories and key files
   - Identify: src/, lib/, runtime/, hooks/, skills/, tests/
   - Note: config files (tsconfig, package.json, Makefile, etc.)
   - Map: entry points and build outputs

2. **Tech Stack**: Identify languages, frameworks, and tools
   - Runtime: Node.js version, Python version, etc.
   - Framework: Next.js, Express, FastAPI, etc.
   - Build: Webpack, Turbopack, esbuild, etc.
   - Test: Node test runner, Jest, pytest, etc.

3. **Dependencies**: Analyze package.json / requirements.txt / go.mod
   - External dependencies and versions
   - Dev dependencies
   - Peer dependencies and potential conflicts

4. **Architecture Patterns**: Identify coding conventions
   - Module export style (named exports, default exports)
   - Error handling patterns
   - File naming conventions
   - Directory organization logic

5. **Output**: Write survey to `.plans/<slug>/findings.md`
   ```
   [ISO timestamp] [EXPLORE] Project: <name>
   Structure: <summary>
   Stack: <languages, frameworks>
   Patterns: <key conventions>
   Dependencies: <count> direct, <count> dev
   Entry points: <list>
   ```

## Integration
- Typically invoked at the start of a new task or project
- Findings inform `/alata:plan` design decisions
- Can be re-run to check for changes after major refactors

## Anti-patterns
- Reading every file in a large codebase (scan structure first, then drill into relevant areas)
- Making changes during exploration (read-only operation)
- Ignoring .gitignore patterns (respect project boundaries)
