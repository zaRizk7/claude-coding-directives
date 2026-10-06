# Claude coding directives

A reusable `AGENTS.md`, five agent roles, 11 skills and maintained pre-commit hooks extracted from [zaRizk7/claude-orch](https://github.com/zaRizk7/claude-orch).

## Reuse

For deterministic setup, clone this repository and run its shell command from a terminal:

```sh
git clone https://github.com/zaRizk7/claude-coding-directives.git
./claude-coding-directives/setup-repo-coding-directives /path/to/project
```

Setup requires Git and the `pre-commit` package. It installs the shared instructions as `.claude/AGENTS.md`, copies the roles, skills and hook configuration, installs all configured Git stages and checks the installed files. Existing root instructions and unrelated Claude files stay intact. Identical installed files allow reruns. Different destination files or symlinked destinations stop setup before any copies. Conflicting configurations need manual integration. Installation or check failures return a nonzero status and leave the copied files available for inspection.

To run the same command inside Claude Code without a model response, launch Claude with:

```sh
claude --settings '{"respondToBashCommands":false,"promptSuggestionEnabled":false}'
```

Then use shell mode:

```text
! /path/to/claude-coding-directives/setup-repo-coding-directives .
```

A custom `/setup-repo-coding-directives` skill would load a model prompt. The shell command makes no model calls. Claude's shell mode still stores the command and output in conversation context, which can count toward later requests. Use the terminal command for no token impact. Restart Claude after setup and inspect `/memory` to confirm `.claude/AGENTS.md` loaded. If a project's `CLAUDE.md` suppresses AGENTS.md loading, select `claude-md-and-agents-md` under `/config` → Project instructions.

For manual adoption:

Merge `AGENTS.md` into the target project's instructions and copy `.claude/` as one folder. If that folder already exists, merge the selected roles and skills instead of overwriting its files.

```text
AGENTS.md
.claude/
  agents/          five role prompts
  skills/          eleven skill directories, each with SKILL.md
.pre-commit-config.yaml
```

Claude Code discovers the roles and skills in these native directories. Invoke `/orchestrator` when you want explicit orchestration. Claude may reorganize or rename the resources to fit a project while preserving directives and hook enforcement and updating references.

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

Mechanical policies live in `.pre-commit-config.yaml`, rather than repeated prompt rules. `pre-commit install` installs all four configured Git stages:

| Gate | Enforced policy |
| --- | --- |
| H1: `pre-commit` | YAML/JSON/TOML syntax, conflict markers, valid symlinks, case conflicts, private-key markers, script permissions, whitespace and final newlines |
| H2: `pre-merge-commit` | The same file checks before creating a merge commit |
| H3: `commit-msg` | Allowed Conventional Commit types, a subject of at most 72 characters, and no body or trailers, including co-author trailers |
| H4: `pre-push` | The same file checks before sending changes to a remote |

Gitlint's built-in rules enforce commit policy through arguments in the YAML file. The file checks use maintained `pre-commit-hooks`. No custom hook scripts or extra hook configuration files are required.

Scope, atomic changes, code quality, evidence and task acceptance still need agent judgment and the target project's tests. Add that project's linters, type checks and tests to the relevant stages. Read-only access, worker-specific push restrictions, protected branches and shared-history rules need the target platform's permissions or hosting policy. A branch denylist applied to every agent would also block the coordinator's authorized integration, so this bundle does not add one.

These are local checks, not a security boundary. Private-key detection recognizes key markers and does not scan every kind of credential. Git hooks do not prevent reading a secret or replace server-side branch protection.

## Verify and update

```sh
pre-commit validate-config
pre-commit run --all-files
pre-commit run --hook-stage pre-merge-commit --all-files
pre-commit run --hook-stage pre-push --all-files
pre-commit autoupdate
./tests/setup-repo-coding-directives.sh
```

## Sources

Extracted from `zaRizk7/claude-orch` at commit `f78efeb8fdbb296fa69cf3c47c8244516c5e347d` (2026-10-05). Original third-party credit lines remain in the skills.

- [Anthropic: effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).
- [Anthropic: Agent Skills and progressive disclosure](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- [Claude Code: AGENTS.md loading](https://code.claude.com/docs/en/memory#agentsmd), [skills](https://code.claude.com/docs/en/skills), [subagents](https://code.claude.com/docs/en/sub-agents).
- [Claude Code: shell mode and model responses](https://code.claude.com/docs/en/interactive-mode#shell-mode-with--prefix).
- [pre-commit hook stages](https://pre-commit.com/#supported-git-hooks), [pre-commit-hooks](https://github.com/pre-commit/pre-commit-hooks/tree/v6.0.0) and [gitlint rules](https://jorisroovers.com/gitlint/latest/rules/builtin_rules/).
