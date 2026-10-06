#!/bin/sh
# Exercise installation, reruns, conflicts and symlink containment in disposable repos.
set -eu

bundle_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
fixture_dir=$(mktemp -d)
trap 'rm -rf -- "$fixture_dir"' EXIT HUP INT TERM
command_file=$bundle_dir/setup-repo-coding-directives

project_dir=$fixture_dir/project\ with\ spaces
git init -q "$project_dir"
printf '%s\n' 'Existing project instructions.' > "$project_dir/AGENTS.md"
mkdir -p "$project_dir/.claude/skills/project-only"
printf '%s\n' 'Project-only skill.' > "$project_dir/.claude/skills/project-only/SKILL.md"
"$command_file" "$project_dir" > "$fixture_dir/install.log" 2>&1 || {
    cat "$fixture_dir/install.log"
    exit 1
}
cmp "$bundle_dir/AGENTS.md" "$project_dir/.claude/AGENTS.md"
cmp "$bundle_dir/.pre-commit-config.yaml" "$project_dir/.pre-commit-config.yaml"
test "$(cat "$project_dir/AGENTS.md")" = 'Existing project instructions.'
test "$(cat "$project_dir/.claude/skills/project-only/SKILL.md")" = 'Project-only skill.'
for stage in pre-commit pre-merge-commit commit-msg pre-push; do
    test -x "$project_dir/.git/hooks/$stage"
done
for source_file in "$bundle_dir"/.claude/agents/*.md "$bundle_dir"/.claude/skills/*/SKILL.md; do
    relative=${source_file#"$bundle_dir"/}
    cmp "$source_file" "$project_dir/$relative"
done
git -C "$project_dir" add .
"$command_file" "$project_dir" > "$fixture_dir/rerun.log" 2>&1 || {
    cat "$fixture_dir/rerun.log"
    exit 1
}
git -C "$project_dir" diff --exit-code

conflict_dir=$fixture_dir/conflict
git init -q "$conflict_dir"
printf '%s\n' 'repos: []' > "$conflict_dir/.pre-commit-config.yaml"
if "$command_file" "$conflict_dir" > "$fixture_dir/conflict.log" 2>&1; then
    printf '%s\n' 'Setup unexpectedly accepted a conflicting config.' >&2
    exit 1
fi
test ! -e "$conflict_dir/.claude"
test "$(cat "$conflict_dir/.pre-commit-config.yaml")" = 'repos: []'

role_conflict_dir=$fixture_dir/role-conflict
git init -q "$role_conflict_dir"
mkdir -p "$role_conflict_dir/.claude/agents"
printf '%s\n' 'Local implementer.' > "$role_conflict_dir/.claude/agents/implementer.md"
if "$command_file" "$role_conflict_dir" > "$fixture_dir/role-conflict.log" 2>&1; then
    printf '%s\n' 'Setup unexpectedly accepted a conflicting role.' >&2
    exit 1
fi
test ! -e "$role_conflict_dir/.pre-commit-config.yaml"
test ! -e "$role_conflict_dir/.claude/AGENTS.md"
test "$(cat "$role_conflict_dir/.claude/agents/implementer.md")" = 'Local implementer.'

symlink_dir=$fixture_dir/symlink
git init -q "$symlink_dir"
mkdir "$fixture_dir/outside"
ln -s "$fixture_dir/outside" "$symlink_dir/.claude"
if "$command_file" "$symlink_dir" > "$fixture_dir/symlink.log" 2>&1; then
    printf '%s\n' 'Setup unexpectedly followed a symlink.' >&2
    exit 1
fi
test ! -e "$fixture_dir/outside/AGENTS.md"
test ! -e "$symlink_dir/.pre-commit-config.yaml"

git -C "$symlink_dir" config core.hooksPath custom-hooks
if "$command_file" "$symlink_dir" > "$fixture_dir/hooks-path.log" 2>&1; then
    printf '%s\n' 'Setup unexpectedly accepted core.hooksPath.' >&2
    exit 1
fi
if "$command_file" "$fixture_dir" > "$fixture_dir/not-git.log" 2>&1; then
    printf '%s\n' 'Setup unexpectedly accepted a directory outside Git.' >&2
    exit 1
fi
printf '%s\n' 'Setup integration checks passed.'
