import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'coding-directives-')));
after(() => rmSync(scratch, { recursive: true, force: true }));
const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0', GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid' };
const run = (cwd, ...args) => spawnSync('git', args, { cwd, env, encoding: 'utf8' });
const ok = (cwd, ...args) => { const result = run(cwd, ...args); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); };
function fixture(branch = 'main') {
  const cwd = mkdtempSync(join(scratch, 'project-'));
  ok(cwd, 'init', '-b', branch);
  const hooks = ok(cwd, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks');
  for (const name of readdirSync(join(root, 'githooks'))) {
    const target = join(hooks, name);
    copyFileSync(join(root, 'githooks', name), target);
    chmodSync(target, 0o755);
  }
  ok(cwd, 'commit', '--allow-empty', '-m', 'chore: initial');
  ok(cwd, 'config', 'extensions.worktreeConfig', 'true');
  const worker = join(cwd, 'trees', 'worker');
  ok(cwd, 'worktree', 'add', '-b', 'worker/task', worker);
  ok(worker, 'config', '--worktree', 'coding.worker', 'true');
  return { cwd, worker };
}

test('hooks use the default .git/hooks directory shared by linked worktrees', () => {
  const { cwd, worker } = fixture();
  assert.notEqual(run(cwd, 'config', '--get', 'core.hooksPath').status, 0);
  const hooks = ok(cwd, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks');
  assert.equal(hooks, join(cwd, '.git', 'hooks'));
  assert.equal(ok(worker, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks'), hooks);
});

test('native commit-msg hook accepts conventional commits and rejects bodies, trailers and long subjects', () => {
  const { cwd } = fixture();
  for (const subject of ['feat: add x', 'fix(core): x', 'feat!: break']) ok(cwd, 'commit', '--allow-empty', '-m', subject);
  for (const subject of ['added stuff', 'feat: x\n\nbody', 'feat: x\n\nCo-authored-by: Someone', 'feat: ' + 'x'.repeat(70)]) {
    assert.notEqual(run(cwd, 'commit', '--allow-empty', '-m', subject).status, 0, subject);
  }
});

test('native commit-msg hook respects project settings and rejects malformed config', () => {
  const { cwd } = fixture();
  ok(cwd, 'config', 'coding.commitMaxLength', '20');
  ok(cwd, 'config', 'coding.commitTypes', 'feat|wip');
  ok(cwd, 'commit', '--allow-empty', '-m', 'wip: x');
  for (const subject of ['fix: x', 'feat: ' + 'x'.repeat(20)]) assert.notEqual(run(cwd, 'commit', '--allow-empty', '-m', subject).status, 0);
  ok(cwd, 'config', 'coding.commitMaxLength', 'invalid');
  assert.notEqual(run(cwd, 'commit', '--allow-empty', '-m', 'feat: x').status, 0);
  ok(cwd, 'config', 'coding.commitMaxLength', '72');
  ok(cwd, 'config', 'coding.commitTypes', '.*');
  assert.notEqual(run(cwd, 'commit', '--allow-empty', '-m', 'feat: x').status, 0);
});

test('worker-local config permits worker commits without affecting the coordinator', () => {
  const { cwd, worker } = fixture();
  assert.notEqual(run(cwd, 'config', '--get', 'coding.worker').status, 0);
  assert.equal(ok(worker, 'config', '--get', 'coding.worker'), 'true');
  ok(worker, 'commit', '--allow-empty', '-m', 'feat: worker');
  ok(cwd, 'commit', '--allow-empty', '-m', 'feat: coordinator');
});

test('reference-transaction blocks worker moves and deletion of the protected branch', () => {
  const { cwd, worker } = fixture();
  const before = ok(cwd, 'rev-parse', 'main');
  ok(worker, 'commit', '--allow-empty', '-m', 'feat: worker');
  for (const args of [['update-ref', 'refs/heads/main', 'HEAD'], ['update-ref', '-d', 'refs/heads/main']]) {
    assert.notEqual(run(worker, ...args).status, 0);
    assert.equal(ok(cwd, 'rev-parse', 'main'), before);
  }
});

test('branch protection uses project override, remote default or primary checkout branch', () => {
  for (const mode of ['override', 'remote', 'primary']) {
    const { cwd, worker } = fixture(mode === 'primary' ? 'trunk' : 'main');
    if (mode !== 'primary') ok(cwd, 'branch', 'release');
    if (mode === 'override') ok(cwd, 'config', 'coding.protectedBranch', 'release');
    if (mode === 'remote') {
      ok(cwd, 'update-ref', 'refs/remotes/origin/release', 'HEAD');
      ok(cwd, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/release');
    }
    const protectedBranch = mode === 'primary' ? 'trunk' : 'release';
    const before = ok(cwd, 'rev-parse', protectedBranch);
    ok(worker, 'commit', '--allow-empty', '-m', 'feat: worker');
    assert.notEqual(run(worker, 'update-ref', `refs/heads/${protectedBranch}`, 'HEAD').status, 0);
    assert.equal(ok(cwd, 'rev-parse', protectedBranch), before);
  }
});

test('pre-push blocks worker publication while allowing the coordinator', () => {
  const { cwd, worker } = fixture();
  const remote = mkdtempSync(join(scratch, 'remote-'));
  ok(remote, 'init', '--bare');
  ok(cwd, 'remote', 'add', 'origin', remote);
  ok(cwd, 'push', 'origin', 'main');
  const denied = run(worker, 'push', 'origin', 'worker/task');
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /workers must not push/);
  assert.notEqual(run(remote, 'show-ref', '--verify', 'refs/heads/worker/task').status, 0);
});

test('invalid worker and protected-branch config fail closed', () => {
  const { cwd, worker } = fixture();
  ok(worker, 'config', '--worktree', 'coding.worker', 'invalid');
  assert.notEqual(run(worker, 'commit', '--allow-empty', '-m', 'feat: worker').status, 0);
  const prePush = spawnSync(join(root, 'githooks/pre-push'), [], { cwd: worker, env, encoding: 'utf8' });
  assert.notEqual(prePush.status, 0);
  ok(worker, 'config', '--worktree', 'coding.worker', 'true');
  ok(cwd, 'config', 'coding.protectedBranch', 'bad branch');
  assert.notEqual(run(worker, 'commit', '--allow-empty', '-m', 'feat: worker').status, 0);
});

test('blank commit messages are rejected and Git comment lines are ignored', () => {
  const { cwd } = fixture(), message = join(scratch, 'message');
  const check = (text) => { writeFileSync(message, text); return spawnSync(join(root, 'githooks/commit-msg'), [message], { cwd, env }).status; };
  assert.notEqual(check(''), 0);
  assert.equal(check('chore: x\n# comment\n'), 0);
});

test('all skills and roles remain reusable without plugin or Claude event-hook files', () => {
  assert.ok(!existsSync(join(root, '.claude-plugin')));
  assert.ok(!existsSync(join(root, 'hooks')));
  assert.equal(readdirSync(join(root, 'skills')).length, 11);
  assert.equal(readdirSync(join(root, 'agents')).length, 5);
  for (const file of readdirSync(join(root, 'agents'))) {
    const text = readFileSync(join(root, 'agents', file), 'utf8');
    for (const name of /^skills: (.+)$/m.exec(text)[1].split(',').map((s) => s.trim())) {
      assert.ok(existsSync(join(root, 'skills', name, 'SKILL.md')), `${file}: ${name}`);
    }
  }
  for (const name of readdirSync(join(root, 'skills'))) {
    assert.doesNotMatch(readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8'), /\.orch\/|orch-check|orch-goals|orch-wt|user_config|CLAUDE_PLUGIN/);
  }
});
