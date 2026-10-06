# Coding directives

Coding directives, 11 skills, five agent roles and a reusable pre-commit configuration extracted from [zaRizk7/claude-orch](https://github.com/zaRizk7/claude-orch).

## Reuse

Merge `CLAUDE.md` into your project's existing instructions. `AGENTS.md` points to the same directives. Keep the target project's conventions.

Copy selected `skills/<name>/` directories into `.claude/skills/` for Claude Code or `.agents/skills/` for Codex. Copy `agents/*.md` into `.claude/agents/` for Claude Code, or use them as role prompts in another agent's briefs.

## Hooks

Copy `.pre-commit-config.yaml` into the target project, or merge its entries into an existing configuration. Install the `pre-commit` package if needed, then run:

```sh
pre-commit install --install-hooks
pre-commit run --all-files
```

The configuration installs both `pre-commit` and `commit-msg` hooks through pre-commit's native Git integration. It pins maintained upstream hooks for:

- YAML and JSON syntax.
- Merge conflict markers.
- Trailing whitespace and final newlines.
- Conventional Commit message formatting.

The one-line, 72-character commit convention remains in the coding directives. Worker branch and push restrictions also remain agent directives. Enforce repository access and branch protection through the target project's Git hosting settings.

No custom hook scripts, plugin metadata, application runtime, project goals, quota tracking, harness adapters, cloud bootstrap or source-project configuration.

## Contents

- `CLAUDE.md`, `AGENTS.md`: coding, scope, evidence, commit and privacy directives.
- `skills/`: orchestrator, worker-protocol, code-quality, test-first, challenge-claims, diagnose-bugs, simplify-safely, visual-inspect, interview, goal-spec, task-breakdown.
- `agents/`: implementer, tester, reviewer, investigator, architect.
- `.pre-commit-config.yaml`: maintained file and commit-message hooks.

## Verify and update

```sh
pre-commit validate-config
pre-commit run --all-files
pre-commit autoupdate
```

## Sources

Extracted from `zaRizk7/claude-orch` at commit `f78efeb8fdbb296fa69cf3c47c8244516c5e347d` (2026-10-05). Original third-party credit lines remain in the skills.

Hook setup follows [pre-commit](https://pre-commit.com/), [pre-commit-hooks](https://github.com/pre-commit/pre-commit-hooks/tree/v6.0.0) and [conventional-pre-commit](https://github.com/compilerla/conventional-pre-commit/tree/v4.4.0).
