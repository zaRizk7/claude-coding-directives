// Compact resume context, derived from the target repository rather than a goal ledger.
import { git } from './git.mjs';

/** List worktree branches and dirty state without reading file contents. */
export function collectDigest(cwd) {
  const configured = git(cwd, 'config', 'coding.digestLines');
  const max = /^[1-9]\d*$/.test(configured) ? Number(configured) : 10;
  const rows = [];
  let path = '', branch = '';
  for (const line of (git(cwd, 'worktree', 'list', '--porcelain') + '\n').split('\n')) {
    if (line.startsWith('worktree ')) path = line.slice(9);
    else if (line.startsWith('branch ')) branch = line.slice(7).replace(/^refs\/heads\//, '');
    else if (!line && path) {
      rows.push(`worktree ${path} [${branch || 'detached'}] ${git(path, 'status', '--porcelain') ? 'dirty' : 'clean'}`);
      path = ''; branch = '';
    }
  }
  return rows.length <= max ? rows : [...rows.slice(0, max - 1), `... +${rows.length - max + 1} more worktrees`];
}
