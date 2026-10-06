#!/usr/bin/env node
// Explicit orchestration only. Git reference-transaction hooks enforce local branch protection.
// File-tool guards and shell checks prevent accidents. They are not a shell sandbox.
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { git, mainRoot, workerEnv } from './git.mjs';
import { collectDigest } from './digest.mjs';

let input;
try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
const data = process.env.CLAUDE_PLUGIN_DATA;
const session = String(input.session_id ?? '');
if (!data || !/^[\w-]+$/.test(session)) process.exit(0);
const marker = join(data, 'active', session);
const event = input.hook_event_name;
const emit = (value) => console.log(JSON.stringify(value));
const deny = (reason) => {
  emit({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `coding-directives: ${reason}` } });
  process.exit(0);
};

if (event === 'UserPromptSubmit') {
  const prompt = String(input.prompt ?? '');
  try {
    if (/^\s*\/(coding-directives:)?orchestrator(\s|$)/.test(prompt)) {
      mkdirSync(dirname(marker), { recursive: true });
      writeFileSync(marker, new Date().toISOString() + '\n');
    }
    if (existsSync(marker) && (input.permission_mode === 'plan' || /^\s*\/plan(\s|$)/.test(prompt))) {
      emit({ hookSpecificOutput: { hookEventName: event, additionalContext: 'Use interview for unresolved decisions, then goal-spec and task-breakdown. Honor decisions already given.' } });
    }
  } catch { /* Prompt delivery must not depend on writable plugin data. */ }
  process.exit(0);
}
if (!existsSync(marker)) process.exit(0);
const cwd = input.cwd ?? process.cwd();
if (event === 'SessionStart') {
  let digest = [];
  try { digest = collectDigest(cwd); } catch { /* Resume context is best effort. */ }
  emit({ hookSpecificOutput: { hookEventName: event, additionalContext: ['Orchestration active. Delegate implementation/review, challenge claims, use isolated worktrees. Re-read the goal checkpoint and orchestrator skill.', ...digest].join('\n') } });
  process.exit(0);
}
if (event !== 'PreToolUse') process.exit(0);
const tool = input.tool_name;
const ti = input.tool_input ?? {};
const worker = !!input.agent_id;

// Resolve existing ancestors too, so new files beneath symlinked directories are checked.
const real = (path) => {
  try { return realpathSync(path); }
  catch { const parent = dirname(path); return parent === path ? path : join(real(parent), path.slice(parent.length + (parent.endsWith(sep) ? 0 : 1))); }
};
try {
  const root = mainRoot(cwd);
  if (tool === 'Agent' && /(?:^|:)(implementer|tester)$/.test(String(ti.subagent_type ?? '')) && ti.isolation !== 'worktree') {
    deny('implementation and test workers must use isolation: worktree.');
  }
  const trees = git(cwd, 'worktree', 'list', '--porcelain').split('\n')
    .filter((line) => line.startsWith('worktree ')).map((line) => real(line.slice(9)))
    .sort((a, b) => b.length - a.length);
  const inMain = (path) => root && trees.find((tree) => path === tree || path.startsWith(tree + sep)) === root;
  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
    const file = ti.file_path ?? ti.notebook_path;
    if (file && inMain(real(resolve(cwd, file)))) {
      deny('do not edit product code in the primary checkout. Use a worker worktree.');
    }
  }
  const shell = tool === 'Bash' || tool === 'Monitor' && ti.command;
  if (shell && !worker && root) {
    const command = String(ti.command ?? '');
    const message = 'do not write the primary checkout from the orchestrator. Delegate edits to a worker worktree.';
    // Like the source guard, these shell checks prevent common accidents, not arbitrary script execution.
    for (const match of command.replace(/(?<!>\s*)(['"])(?:(?!\1).)*\1/g, 'Q').matchAll(/(?:^|[\s\d&])>>?\s*([^\s&;|<>()]+)/g)) {
      if (!match[1].startsWith('/dev/') && inMain(real(resolve(cwd, match[1].replace(/^["']|["']$/g, ''))))) deny(message);
    }
    let dir = cwd;
    for (const segment of command.split(/[;&|\n]+/)) {
      const tokens = segment.trim().split(/\s+/).filter((token) => !/^\w+=/.test(token));
      const [cmd, ...args] = tokens;
      const files = args.filter((arg) => !arg.startsWith('-') && !/^\d+$/.test(arg));
      if (cmd === 'cd') { dir = resolve(dir, files[0] ?? '.'); continue; }
      const at = (file) => inMain(real(resolve(dir, file.replace(/^["']|["']$/g, '').replace(/^of=/, ''))));
      if (cmd === 'sed' ? args.some((arg) => /^(-[a-zA-Z]*i|--in-place)/.test(arg)) && files.slice(1).some(at)
        : ['cp', 'mv', 'rm', 'tee', 'touch', 'mkdir', 'ln', 'install', 'truncate', 'dd'].includes(cmd) && files.some(at)) deny(message);
      if (cmd !== 'git') continue;
      let gitDir = dir, index = 0;
      while (args[index]?.startsWith('-')) index += args[index] === '-C' ? ((gitDir = resolve(dir, args[index + 1] ?? '')), 2) : args[index] === '-c' ? 2 : 1;
      if (!inMain(real(gitDir))) continue;
      const [sub, ...rest] = args.slice(index);
      if (['add', 'rm', 'apply', 'am', 'clean', 'stash', 'restore'].includes(sub) || sub === 'reset' && rest.includes('--hard') || sub === 'checkout' && rest.includes('--')) deny(message);
    }
  }
  if (shell && worker) {
    const command = String(ti.command ?? '');
    const vars = '(?:ORCH_\\w+|GIT_CONFIG_\\w+|GIT_DIR)';
    if (new RegExp(`\\b${vars}=|\\b(?:export|unset|declare|typeset|readonly)\\s+(?:-\\w+\\s+)*${vars}\\b|\\s-c\\s*core\\.hookspath|--config-env|\\benv\\s+(?:-\\w+\\s+)*-[iu]\\b`, 'i').test(command)) {
      deny('workers must not alter the git guard environment.');
    }
    if (/\bgit\b[^;&|\n]*\b(?:push|merge)\b/.test(command)) deny('workers must not push or merge.');
    if (!root || inMain(real(cwd))) deny('workers must run shell commands in an isolated worktree.');
    const guard = workerEnv(cwd, data);
    const quote = (value) => "'" + value.replace(/'/g, "'\\''") + "'";
    let prefix = `export ${Object.entries(guard.vars).map(([key, value]) => `${key}=${quote(value)}`).join(' ')}`;
    if (guard.hooksPath) prefix += `; n=\${GIT_CONFIG_COUNT:-0}; export GIT_CONFIG_COUNT=$((n+1)) "GIT_CONFIG_KEY_$n=core.hooksPath" "GIT_CONFIG_VALUE_$n"=${quote(guard.hooksPath)}; unset n`;
    emit({ hookSpecificOutput: { hookEventName: event, updatedInput: { ...ti, command: `${prefix}; ${command}` } } });
  }
} catch (error) {
  deny(`cannot establish orchestration guards (${error.message}). Refusing to run unguarded.`);
}
