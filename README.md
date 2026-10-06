# Coding directives

A reusable `AGENTS.md`, five agent roles, 11 skills and maintained pre-commit hooks extracted from [zaRizk7/claude-orch](https://github.com/zaRizk7/claude-orch).

## Reuse

Merge `AGENTS.md` into the target project's instructions and copy `.claude/` as one folder. If that folder already exists, merge the selected roles and skills instead of overwriting its files.

```text
AGENTS.md
.claude/
  agents/          five role prompts
  skills/          eleven skill directories, each with SKILL.md
.pre-commit-config.yaml
```

Claude Code discovers the roles and skills in these native directories. Invoke `/orchestrator` when you want explicit orchestration. Claude may reorganize the resources for a project's needs while keeping references and names consistent.

For another agent, use `AGENTS.md` as the entry point and the role files as delegated prompts. If it requires a different skill discovery location, move the relevant skill directories there and update the entry-point paths.

## Context design

The root instructions contain shared defaults and file pointers. Skill descriptions identify when to load a procedure. Role prompts preload their essential skills, while optional procedures stay available on demand. Engineering rules, packet formats and review checklists each have one source.

Load relevant files just in time. Keep detailed investigations in worker contexts and return compact evidence. Preserve decisions and resume points in the project's existing notes rather than duplicating them in prompts. These choices follow Anthropic's context engineering and Agent Skills guidance.

To confirm instruction loading in Claude Code, inspect `/memory`. Under its default settings, an instruction file in an ancestor directory can affect which project instructions load. See the AGENTS.md documentation linked below.

## Hooks

Copy `.pre-commit-config.yaml` into the target project, or merge its entries into an existing configuration. Install the `pre-commit` package if needed, then run:

```sh
pre-commit install --install-hooks
pre-commit run --all-files
```

The configuration installs `pre-commit` and `commit-msg` hooks with pinned upstream checks for YAML/JSON syntax, merge conflicts, trailing whitespace, final newlines and Conventional Commits.

The one-line, 72-character commit convention and worker branch/push restrictions remain agent directives. Enforce repository access and branch protection through the target project's Git hosting settings.

## Verify and update

```sh
pre-commit validate-config
pre-commit run --all-files
pre-commit autoupdate
```

## Sources

Extracted from `zaRizk7/claude-orch` at commit `f78efeb8fdbb296fa69cf3c47c8244516c5e347d` (2026-10-05). Original third-party credit lines remain in the skills.

- [Anthropic: effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).
- [Anthropic: Agent Skills and progressive disclosure](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- [Claude Code: AGENTS.md loading](https://code.claude.com/docs/en/memory#agentsmd), [skills](https://code.claude.com/docs/en/skills), [subagents](https://code.claude.com/docs/en/sub-agents).
- [pre-commit-hooks](https://github.com/pre-commit/pre-commit-hooks/tree/v6.0.0) and [conventional-pre-commit](https://github.com/compilerla/conventional-pre-commit/tree/v4.4.0).
