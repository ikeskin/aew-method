# Getting started

1. Install Node.js 20+.
2. Clone this repository, run `npm install` and `npm link`.
3. In a separate project directory, run `aew init --yes --adapters codex,claude` (or select the adapters you use).
4. Run `aew doctor` and inspect `.aew/SYSTEM.md` and `.aew/STATE.md`.
5. Open the project with your AI coding tool and request a specific task with a clear outcome.
6. Review code changes and actual test results before accepting completion.

For an interactive project interview, run `aew init` in a TTY. For a preview, use `aew init --yes --dry-run`.

**Existing projects:** Initialization preserves existing agent files. If an `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` already exists, manually merge the reference to `.aew/SYSTEM.md` after reviewing the differences. AEW currently has no automatic migration command.
