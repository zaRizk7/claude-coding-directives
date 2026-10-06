# Coding directives

Coding directives, 11 skills, five agent roles and native Git hooks extracted from [zaRizk7/claude-orch](https://github.com/zaRizk7/claude-orch).

## Reuse

Merge `CLAUDE.md` into your project's existing instructions. `AGENTS.md` points to the same directives. Keep the target project's conventions.

Copy selected `skills/<name>/` directories into `.claude/skills/` for Claude Code or `.agents/skills/` for Codex. Copy `agents/*.md` into `.claude/agents/` for Claude Code, or use them as role prompts in another agent's briefs.

## Native Git hooks

Install the hooks in Git's default `.git/hooks` directory. From the target project, resolve its hooks directory and copy the scripts there:

```sh
hook_dir=$(git rev-parse --git-path hooks)
mkdir -p "$hook_dir"
cp -n /path/to/coding-directives/githooks/* "$hook_dir/"
chmod +x "$hook_dir/commit-msg" "$hook_dir/reference-transaction" "$hook_dir/pre-push"
```

`cp -n` preserves existing files. If a hook already exists, merge the relevant check into it. No `core.hooksPath` setting is needed. If the target project already overrides that setting, Git resolves its existing hooks directory instead.

`githooks/` holds the versioned source files for migration. `.git/hooks` holds the installed copies and is not committed or transferred by cloning. Git's default hooks directory is shared by linked worktrees, so these scripts are installed once per repository.

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

Do not set `coding.worker` in shared repository config, which would mark the coordinator too.

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
- `githooks/`: versioned hook source files to copy into the target repository's `.git/hooks`.
- `test/`: checks in temporary foreign Git repositories.

No plugin metadata, Claude event hooks, application runtime, project goals, quota tracking, harness adapters, cloud bootstrap or source-project configuration.

## Verify

```sh
node --test test/hooks.test.mjs
```

Node is used only for these development tests. The hooks themselves use shell and Git.

## Source

Extracted from `zaRizk7/claude-orch` at commit `f78efeb8fdbb296fa69cf3c47c8244516c5e347d` (2026-10-05). Original third-party credit lines remain in the skills. Git guards were adapted to use native worktree-local configuration.

Native hook behavior: [Git hooks documentation](https://git-scm.com/docs/githooks).
