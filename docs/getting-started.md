# Getting started

1. Install Node.js 20+.
2. Clone this repository, run `npm install` and `npm link`.
3. In a separate project directory, run `aew init --yes --adapters codex,claude` (or select the adapters you use).
4. Run `aew doctor` and inspect your short adapter entrypoint. Read `.aew/STATE.md` only if it is relevant to the task.
5. Open the project with your AI coding tool and request a specific task with a clear outcome.
6. Review code changes and actual test results before accepting completion.

For an interactive project interview, run `aew init` in a TTY. For a preview, use `aew init --yes --dry-run`.

**Existing projects:** Initialization preserves existing agent files. For older entrypoints referring to `.aew/SYSTEM.md`, manually replace the eager-load instruction with the short v0.5.9 bootstrap; use `aew upgrade --dry-run` for files tracked in the managed manifest. A legacy `.aew/SYSTEM.md` can remain but is no longer required.
