# Workspace instructions

## Defaults
- Follow the target project's conventions. Work only on the user's assigned scope and stop when it is verified.
- Read the relevant code, callers and tests before editing. Fix causes and reuse existing patterns or standard libraries before adding dependencies.
- Keep changes simple. Avoid unrelated refactors, speculative features and temporary artifacts.
- Run the project's relevant checks. Report exact commands, concise results and remaining risks. Never weaken a check to claim completion.
- Keep commits atomic. Mechanical commit and file policies belong in `.pre-commit-config.yaml`. Install its hooks and resolve failures without bypassing them.
- Read only the project, relevant development configuration, required tool metadata and public docs. Do not access unrelated personal files, secrets, credentials, histories or other repositories.

## Context on demand
- Skills and role prompts are self-contained in `.claude/`. Select them by their frontmatter descriptions. Read only resources needed for the current task, not the whole folder.
- For code changes, load `.claude/skills/code-quality/SKILL.md`. Detailed engineering rules belong there rather than in every prompt.
- Use `.claude/skills/orchestrator/SKILL.md` only when the user explicitly requests orchestration. Delegated roles live in `.claude/agents/` and preload only their required skills.
- Keep briefs and reports compact: acceptance criteria, file pointers, decisive evidence and unresolved risks. Leave detailed investigation in the worker's context.
- For long tasks, persist decisions, open criteria and the next step in the existing spec or task notes. Re-read the checkpoint after compaction.
- When adapting this bundle to a project, you may reorganize `.claude/`. Preserve role and skill names, update references, and keep one source for each rule.
