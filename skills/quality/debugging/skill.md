# Debugging Skill

## Purpose
Systematic debugging protocol. Root cause first — never change code before understanding the problem.

## Command
`/alata:debug`

## Process
1. **Reproduce**: Find or create the minimum reproducible case
   - Run the failing command/test
   - Capture exact error message and stack trace
   - Record reproduction steps in `.plans/<slug>/findings.md`

2. **Read Logs**: Check `.alataflow/error.log` and application logs
   - Look for the earliest error in the chain
   - Note timestamps and correlate with recent changes

3. **Diff**: Run `git diff` to see what changed
   - Focus on files touched since last known-good state
   - Check if the bug correlates with recent modifications

4. **Hypothesize**: Form a theory about the root cause
   - State the hypothesis clearly
   - Identify what evidence would confirm or refute it

5. **Verify**: Test the hypothesis with minimal changes
   - Make the smallest possible fix
   - Re-run the reproduction case
   - If fix works → proceed to verification
   - If fix fails → return to step 4 with new hypothesis

6. **Document**: Append findings to `.plans/<slug>/findings.md`
   ```
   [ISO timestamp] [DEBUG] Root cause: <description>
   [ISO timestamp] [DEBUG] Fix: <what was changed and why>
   ```

## Stuck Protocol
If 3 hypotheses fail:
1. Break the problem into smaller sub-problems
2. Re-describe the issue with expected vs actual output
3. If still stuck → report to user with all findings, request guidance

## Integration
- Can be invoked mid-execute when a step fails
- Findings feed into `/alata:review` risk assessment
- Memory recall (`/alata:recall`) may surface similar past bugs

## Anti-patterns
- Changing code before understanding the bug (forbidden)
- Guessing fixes without a hypothesis
- Fixing symptoms instead of root causes
- Making multiple changes at once (one change per hypothesis)
