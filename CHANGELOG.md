# Changelog

## 0.5.9 — Context optimization (in development)

- Reduced always-loaded Codex, Claude and Gemini bootstrap instructions to universal guardrails.
- Moved detailed role procedures to lazy-loaded skills; newly installed projects do not require `.aew/SYSTEM.md`.
- Added repeatable stream-json usage benchmark and context-budget documentation; no mandatory hooks.

## 0.5.8 — Beta

- Added checksum-based `aew upgrade` with dry-run and conflict preservation; legacy untracked files are never overwritten.
- Added non-destructive `aew migrate-tasks` and per-task verification records.
- Simplified adapter instructions and made role-skill triggers concrete.
- Introduced v2 fail-closed gates and UNVERIFIED / LOCAL_PASS / CI_PASS trust levels.
- Made real locally executed test policy the default without requiring GitHub, Git, SVN, Azure DevOps, CODEOWNERS, or a second reviewer.
- Retained optional SHA-bound GitHub CI integration; critical paths are advisory rather than mandatory review gates.
- Clarified verification trust: passing recorded gates is not independent QA or CI evidence.
- Added light/standard/strict workflow mode configuration, defaulting to light.
- Removed .NET-specific code-style defaults for non-.NET projects.
- Corrected version and Project typos in generated CLI text.

## 0.5.7 — Beta

- Blocked empty task lists in `aew verify`.
- Improved nested .NET discovery and installation diagnostics.
- Replaced blanket scaffold approval with risk-based approval.


## 0.5.6 — Beta

- Added a shared `.aew/SYSTEM.md` operating contract.
- Added adapter entrypoint guidance for Codex, Claude Code, and Gemini CLI.
- Retained persistent project state, task records, handoffs, issues, and evidence-based acceptance gates.
- Prepared an English-only public repository and CLI interface.

For earlier development history, consult the Git commit history once the repository is published.
