# Coding directives

Coding directives, 11 skills, five agent roles and native Git hooks extracted from [zaRizk7/claude-orch](https://github.com/zaRizk7/claude-orch).

## Reuse

Merge `CLAUDE.md` into your project's existing instructions. `AGENTS.md` points to the same directives. Keep the target project's conventions.

Copy selected `skills/<name>/` directories into `.claude/skills/` for Claude Code or `.agents/skills/` for Codex. Copy `agents/*.md` into `.claude/agents/` for Claude Code, or use them as role prompts in another agent's briefs.

## Native Git hooks

Copy `githooks/` into a project without an existing hooks setup, then enable it:

```sh
git config core.hooksPath githooks
```

If the project already has hooks, merge these checks into its existing hooks instead of replacing `core.hooksPath`.

| Hook | Behavior |
| --- | --- |
| `commit-msg` | One-line Conventional Commits, at most 72 characters by default |
| `reference-transaction` | Prevent workers from moving or deleting the protected local branch |
| `pre-push` | Prevent workers from pushing |

Git and a POSIX shell are the only hook requirements. The commit hook applies to everyone. Branch and push guards apply only to worktrees marked as workers.

Enable Git's native per-worktree configuration once in the primary checkout:

```sh
git config extensions.worktreeConfig true
```

Then mark each worker from inside its worktree:

```sh
git config --worktree coding.worker true
```

Do not set `coding.worker` in shared repository config, which would mark the coordinator too. When copying hooks, also copy them into each worker worktree, or configure an absolute `core.hooksPath` to the project's hook directory before creating workers.

Optional project settings:

```sh
git config coding.protectedBranch release
git config coding.commitMaxLength 72
git config coding.commitTypes 'feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|merge'
```

Without an override, branch protection uses origin/HEAD, then an existing main/master branch, then the primary checkout branch, then init.defaultBranch, then main. Coordinator operations remain available. These local hooks do not replace repository permissions or server-side branch protection.

## Contents

- `CLAUDE.md`, `AGENTS.md`: coding, scope, evidence, commit and privacy directives.
- `skills/`: orchestrator, worker-protocol, code-quality, test-first, challenge-claims, diagnose-bugs, simplify-safely, visual-inspect, interview, goal-spec, task-breakdown.
- `agents/`: implementer, tester, reviewer, investigator, architect.
- `githooks/`: native Git hooks.
- `test/`: checks in temporary foreign Git repositories.

No plugin metadata, Claude event hooks, application runtime, project goals, quota tracking, harness adapters, cloud bootstrap or source-project configuration.

## Verify

```sh
node --test test/hooks.test.mjs
```

Node is used only for these development tests. The hooks themselves use shell and Git.

## Source

Extracted from `zaRizk7/claude-orch` at commit `f78efeb8fdbb296fa69cf3c47c8244516c5e347d` (2026-10-05). Original third-party credit lines remain in the skills. Git guards were adapted to use native worktree-local configuration.
