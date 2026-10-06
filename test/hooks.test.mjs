import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { protect, workerEnv } from '../hooks/git.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'coding-directives-')));
after(() => rmSync(scratch, { recursive: true, force: true }));
const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0', GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid' };
const run = (cwd, args, extra = {}) => spawnSync('git', args, { cwd, env: { ...env, ...extra }, encoding: 'utf8' });
function fixture() {
  const cwd = mkdtempSync(join(scratch, 'project-'));
  const data = mkdtempSync(join(scratch, 'data-'));
  assert.equal(run(cwd, ['init', '-b', 'main']).status, 0);
  assert.equal(run(cwd, ['commit', '--allow-empty', '-m', 'chore: initial']).status, 0);
  const worktree = join(cwd, 'trees', 'worker');
  assert.equal(run(cwd, ['worktree', 'add', '-b', 'worker/task', worktree]).status, 0);
  return { cwd, data, worktree };
}
function hook(f, event, extra = {}) {
  const result = spawnSync(process.execPath, [join(root, 'hooks/guard.mjs')], {
    cwd: f.cwd, env: { ...env, CLAUDE_PLUGIN_DATA: f.data }, encoding: 'utf8',
    input: JSON.stringify({ session_id: 'session-1', cwd: f.cwd, hook_event_name: event, ...extra })
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout).hookSpecificOutput : undefined;
}
const activate = (f) => hook(f, 'UserPromptSubmit', { prompt: '/coding-directives:orchestrator task' });
const workerShell = (f, command) => hook(f, 'PreToolUse', { cwd: f.worktree, agent_id: 'worker-1', tool_name: 'Bash', tool_input: { command } });

// These are foreign repositories with no source project config or runtime.
test('ordinary sessions are unchanged and explicit activation survives resume', () => {
  const f = fixture();
  assert.equal(hook(f, 'PreToolUse', { tool_name: 'Write', tool_input: { file_path: 'app.js' } }), undefined);
  activate(f);
  assert.ok(existsSync(join(f.data, 'active', 'session-1')));
  assert.match(hook(f, 'SessionStart').additionalContext, /worker\/task/);
  assert.match(hook(f, 'UserPromptSubmit', { prompt: '/plan' }).additionalContext, /goal-spec/);
});

test('file tools block primary checkout writes and allow nested worker worktrees', () => {
  const f = fixture(); activate(f);
  for (const tool of ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']) {
    assert.equal(hook(f, 'PreToolUse', { tool_name: tool, tool_input: { file_path: 'app.js' } }).permissionDecision, 'deny');
    assert.equal(hook(f, 'PreToolUse', { agent_id: 'worker-1', cwd: f.worktree, tool_name: tool, tool_input: { file_path: 'app.js' } }), undefined);
  }
  symlinkSync(f.cwd, join(f.worktree, 'primary'));
  assert.equal(hook(f, 'PreToolUse', { agent_id: 'worker-1', cwd: f.worktree, tool_name: 'Write', tool_input: { file_path: 'primary/new/app.js' } }).permissionDecision, 'deny');
});

test('implementation dispatch requires worktree isolation', () => {
  const f = fixture(); activate(f);
  assert.equal(hook(f, 'PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: 'coding-directives:implementer' } }).permissionDecision, 'deny');
  assert.equal(hook(f, 'PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: 'coding-directives:implementer', isolation: 'worktree' } }), undefined);
});

test('orchestrator shell blocks common primary-checkout writes but allows reads and worktree edits', () => {
  const f = fixture(); activate(f);
  const shell = (command) => hook(f, 'PreToolUse', { tool_name: 'Bash', tool_input: { command } });
  for (const command of ['touch app.js', 'rm app.js', 'sed -i s/a/b/ app.js', 'echo value > app.js', 'git add .', 'git reset --hard']) {
    assert.equal(shell(command).permissionDecision, 'deny', command);
  }
  for (const command of ['git status', 'git diff --stat', 'node --test', 'touch trees/worker/app.js']) assert.equal(shell(command), undefined, command);
});

test('resume context obeys the target project line budget', () => {
  const f = fixture(); activate(f);
  run(f.cwd, ['config', 'coding.digestLines', '1']);
  const rows = hook(f, 'SessionStart').additionalContext.split('\n');
  assert.equal(rows.length, 2);
  assert.match(rows[1], /more worktrees/);
});

test('worker shell refuses primary checkout, push, merge and guard tampering', () => {
  const f = fixture(); activate(f);
  assert.equal(hook(f, 'PreToolUse', { agent_id: 'worker-1', tool_name: 'Bash', tool_input: { command: 'git status' } }).permissionDecision, 'deny');
  for (const command of ['git push origin HEAD', 'git merge main', 'unset ORCH_WORKER', 'git -c core.hooksPath=/tmp status']) {
    assert.equal(workerShell(f, command).permissionDecision, 'deny', command);
  }
});

test('wrapped worker commands commit only to worker branches and preserve protected refs', () => {
  const f = fixture(); activate(f);
  const wrapped = (command) => spawnSync('/bin/sh', ['-c', workerShell(f, command).updatedInput.command], { cwd: f.worktree, env, encoding: 'utf8' });
  assert.equal(wrapped("git commit --allow-empty -m 'feat: reusable' ").status, 0);
  const main = run(f.cwd, ['rev-parse', 'main']).stdout.trim();
  assert.notEqual(wrapped('git update-ref refs/heads/main HEAD').status, 0);
  assert.notEqual(wrapped('git update-ref -d refs/heads/main').status, 0);
  assert.equal(run(f.cwd, ['rev-parse', 'main']).stdout.trim(), main);
  assert.notEqual(wrapped("git commit --allow-empty -m 'added stuff'").status, 0);
});

test('worker hooks chain existing project hooks', () => {
  const f = fixture();
  const original = join(f.cwd, 'own-hooks'); mkdirSync(original);
  const script = join(original, 'pre-commit');
  writeFileSync(script, '#!/bin/sh\nexit 7\n'); chmodSync(script, 0o755);
  assert.equal(run(f.cwd, ['config', 'core.hooksPath', original]).status, 0);
  activate(f);
  const command = workerShell(f, "git commit --allow-empty -m 'feat: checked'").updatedInput.command;
  const result = spawnSync('/bin/sh', ['-c', command], { cwd: f.worktree, env, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.equal(run(f.cwd, ['config', '--get', 'core.hooksPath']).stdout.trim(), original);
  assert.equal(workerEnv(f.worktree, f.data).vars.ORCH_HOOKS_ORIG, original);
});

test('commit convention defaults and project overrides reject malformed input', () => {
  const f = fixture(), message = join(scratch, 'message');
  const check = (text) => { writeFileSync(message, text); return spawnSync(join(root, 'githooks/commit-msg'), [message], { cwd: f.cwd, env }).status; };
  for (const text of ['feat: add x\n', 'fix(core): x\n', 'feat!: break\n', 'chore: x\n# comment\n']) assert.equal(check(text), 0);
  for (const text of ['', 'added stuff\n', 'feat: x\n\nbody\n', 'feat: x\n\nCo-authored-by: Someone\n', 'feat: ' + 'x'.repeat(70)]) assert.notEqual(check(text), 0);
  run(f.cwd, ['config', 'coding.commitMaxLength', '20']);
  run(f.cwd, ['config', 'coding.commitTypes', 'feat|wip']);
  assert.equal(check('wip: x'), 0);
  assert.notEqual(check('fix: x'), 0);
  assert.notEqual(check('feat: ' + 'x'.repeat(20)), 0);
  run(f.cwd, ['config', 'coding.commitMaxLength', 'invalid']);
  assert.notEqual(check('feat: x'), 0);
});

test('protected branch detection respects target project conventions', () => {
  const f = fixture();
  assert.equal(protect(f.worktree), 'main');
  run(f.cwd, ['branch', 'release']);
  run(f.cwd, ['config', 'coding.protectedBranch', 'release']);
  assert.equal(protect(f.worktree), 'release');
});

test('guard setup failures refuse worker execution and invalid sessions cannot traverse paths', () => {
  const f = fixture(); activate(f);
  rmSync(f.data, { recursive: true }); writeFileSync(f.data, 'not a directory');
  assert.throws(() => workerEnv(f.worktree, f.data));
  const g = fixture(); activate(g);
  const guard = workerEnv(g.worktree, g.data);
  rmSync(guard.hooksPath, { recursive: true }); writeFileSync(guard.hooksPath, 'not a directory');
  assert.equal(workerShell(g, 'git status').permissionDecision, 'deny');
  assert.equal(hook(g, 'UserPromptSubmit', { session_id: '../escape', prompt: '/orchestrator' }), undefined);
  assert.ok(!existsSync(join(g.data, 'escape')));
});

test('agent preloads resolve and no migrated skill depends on the source runtime', () => {
  assert.equal(readdirSync(join(root, 'skills')).length, 11);
  assert.equal(readdirSync(join(root, 'agents')).length, 5);
  for (const file of readdirSync(join(root, 'agents'))) {
    const text = readFileSync(join(root, 'agents', file), 'utf8');
    for (const name of /^skills: (.+)$/m.exec(text)[1].split(',').map((s) => s.trim())) {
      assert.ok(existsSync(join(root, 'skills', name, 'SKILL.md')), `${file}: ${name}`);
    }
  }
  for (const name of readdirSync(join(root, 'skills'))) {
    const text = readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert.doesNotMatch(text, /\.orch\/|orch-check|orch-goals|orch-wt|user_config/);
  }
});
