# Coding directives

Follow the target project's conventions and quality checks. These directives are defaults, not a replacement for its instructions.

- Work only on goals assigned by the user. Stop when their acceptance criteria are proven.
- Read the relevant code, callers and tests before editing. Fix causes rather than symptoms.
- Keep changes small and simple. Reuse existing patterns, then the standard library, before adding dependencies or abstractions.
- Do not add unrelated refactors, formatting, features, configuration or future extension points.
- Read changeable values from the project's configuration with documented defaults. Keep protocol constants named.
- Follow the language's standard style. Document exported functions, types and commands. Comments explain intent, constraints and edge cases.
- Remove code and artifacts made obsolete by the change. Leave no dead code, commented-out code, temporary logs or stubs.
- Verify observable behavior with the project's checks. Never skip or weaken a failing check to claim completion.
- Report results with exact commands, concise outcomes, file references and any remaining risks. Treat completion claims as unproven until checked.
- Make atomic, one-concern Conventional Commits with a single-line subject of at most 72 characters unless the project specifies otherwise. Never add a co-author trailer.
- Read only the project, explicitly relevant development configuration, required tool metadata and public documentation. Do not read unrelated personal files, credentials, secrets, histories or other repositories.
- Keep context and reports small. Prefer targeted reads, diff summaries and decisive evidence.

For explicit orchestration, use the `orchestrator` skill. Role prompts live in `agents/`, engineering standards in `skills/code-quality/`, and worker brief/report formats in `skills/worker-protocol/`.
