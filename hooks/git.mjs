// Git helpers and worker hook chaining, adapted from claude-orch's git/worker-env helpers.
import { execFileSync } from 'node:child_process';
import { mkdirSync, realpathSync, readlinkSync, symlinkSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Query git without leaking command diagnostics into hook JSON. */
export function git(cwd, ...args) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}

/** Resolve the primary checkout, including repositories with a separate git directory. */
export function mainRoot(cwd) {
  const line = git(cwd, 'worktree', 'list', '--porcelain').split('\n').find((row) => row.startsWith('worktree '));
  return line ? realpathSync(line.slice(9)) : '';
}

/** Use the project's configured branch, otherwise detect the default branch. */
export function protect(cwd) {
  return git(cwd, 'config', 'coding.protectedBranch') ||
    git(cwd, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '') ||
    ['main', 'master'].find((branch) => git(cwd, 'rev-parse', '--verify', '-q', `refs/heads/${branch}`)) ||
    git(mainRoot(cwd) || cwd, 'branch', '--show-current') || git(cwd, 'config', 'init.defaultBranch') || 'main';
}

/** Install worker guards in plugin data and preserve the project's original hooks. Throws on setup failure. */
export function workerEnv(cwd, data) {
  const plugin = dirname(dirname(fileURLToPath(import.meta.url)));
  const target = join(plugin, 'githooks', 'dispatch');
  const dir = join(data, 'githooks-' + createHash('sha1').update(plugin).digest('hex').slice(0, 8));
  const original = git(cwd, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks');
  if (!original) throw new Error('cannot locate repository hooks');
  mkdirSync(dir, { recursive: true });
  const names = 'applypatch-msg pre-applypatch post-applypatch pre-commit pre-merge-commit prepare-commit-msg commit-msg post-commit pre-rebase post-checkout post-merge pre-push pre-auto-gc post-rewrite reference-transaction push-to-checkout'.split(' ');
  for (const name of names) {
    const link = join(dir, name);
    try { symlinkSync(target, link); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (readlinkSync(link) !== target) { unlinkSync(link); symlinkSync(target, link); }
    }
  }
  const vars = { ORCH_WORKER: '1', ORCH_PROTECT: protect(cwd), ORCH_PLUGIN_ROOT: plugin };
  if (original === dir) return { vars, hooksPath: '' };
  return { vars: { ...vars, ORCH_HOOKS_ORIG: original }, hooksPath: dir };
}
