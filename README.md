# Coding directives

Reusable coding directives, 11 skills, five agent roles and standalone hooks extracted from [zaRizk7/claude-orch](https://github.com/zaRizk7/claude-orch).

## Use in another project

Merge the relevant directives from `CLAUDE.md` into the project's existing instructions. `AGENTS.md` points to the same file for agents that use that convention. Do not overwrite existing project instructions.

For Claude Code, load this directory as a plugin:

```sh
claude --plugin-dir /absolute/path/to/coding-directives
```

Or install it from GitHub:

```text
/plugin marketplace add zaRizk7/coding-directives
/plugin install coding-directives@coding-directives
```

Start explicit orchestration with:

```text
/coding-directives:orchestrator <task>
```

Plugin-root `CLAUDE.md` is not automatically loaded. Copy or merge its directives as described above. Skills, agent roles and hooks load through the plugin.

For individual migration, copy selected `skills/<name>/` directories to `.claude/skills/` and role prompts from `agents/` to `.claude/agents/`. For Codex, copy selected skills to `.agents/skills/` and merge `AGENTS.md`. The role registration and event hooks use Claude Code's format.

## Contents

| Path | Reusable content |
| --- | --- |
| `CLAUDE.md`, `AGENTS.md` | Coding, scope, evidence, commit and privacy directives |
| `skills/` | Orchestrator, worker-protocol, code-quality, test-first, challenge-claims, diagnose-bugs, simplify-safely, visual-inspect, interview, goal-spec, task-breakdown |
| `agents/` | Implementer, tester, reviewer, investigator, architect |
| `hooks/` | Explicit activation, dispatch/worktree and file guards, worker shell wrapping, planning reminders, compact git resume context |
| `githooks/` | Worker protected-branch enforcement, project hook chaining, Conventional Commit validation |
| `test/` | Checks of the migrated hooks in temporary foreign repositories |

## Hooks

The Claude Code hooks require Node 18+, Git and a POSIX shell. No packages, build step or orchestration CLI are needed. They are inactive until `/orchestrator` or `/coding-directives:orchestrator` is invoked. Claude Code supplies `CLAUDE_PLUGIN_DATA` for session markers and generated worker hook links.

Workers must use native worktree isolation. The Git `reference-transaction` hook prevents them from moving the protected local branch. Existing project hooks remain chained. Shell checks are advisory accident prevention. They do not replace the host's sandbox or permissions. Worker shell commands are wrapped only when Claude Code identifies them with `agent_id`.

The primary checkout cannot be edited through file tools during orchestration. Use the host's planning document, or delegate tracked spec edits to a worker. Resume context is derived from Git rather than an external goal ledger.

Optional project settings use Git's native config:

```sh
git config coding.protectedBranch release
git config coding.commitMaxLength 72
git config coding.commitTypes 'feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|merge'
git config coding.digestLines 10
```

Without overrides, the protected branch is detected from origin/HEAD, main/master, the primary checkout branch, then init.defaultBranch. Commit validation defaults to 72 characters and the listed types. Resume context defaults to 10 worktree lines.

To use only the commit hook in a project, copy `githooks/commit-msg` into its existing hooks directory. If the project has no hooks, copy `githooks/` and enable it with `git config core.hooksPath githooks`. Do not replace an existing hooks setup.

## Removed source dependencies

No application code, project goals, decision log, TypeScript configuration, dependency files, quota/cost tracking, worker registry, panes, harness adapters, custom worktree naming or cloud Node/npm bootstrap. References to `orch-*`, `.orch/`, source backend settings and project-specific check commands were replaced with the target project's conventions and native tools.

## Verify

```sh
node --test test/hooks.test.mjs
claude plugin validate .
```

## Source

Extracted from `zaRizk7/claude-orch` at commit `f78efeb8fdbb296fa69cf3c47c8244516c5e347d` (2026-10-05). Original third-party credit lines remain in the skills. Hooks were adapted to remove dependencies on that application's runtime.
