# AEW Method

**Engineering discipline without engineering bureaucracy.**

AEW Method is a lightweight, model-agnostic CLI that installs shared engineering instructions, project memory, task tracking, and evidence-oriented QA conventions for AI-assisted development. Designed with independent developers in mind.

> **Beta (v0.5.9).** AEW is an instruction-based workflow, not an autonomous multi-agent runtime, security scanner, or test runner. AI-tool compliance depends on the host tool and context. `aew verify` executes AEW-selected tests directly and checks their real exit codes. GitHub, Azure DevOps, SVN, Git, CODEOWNERS and second-person approval are not required. Legacy v1 gate claims remain untrusted.

## Requirements

Node.js 20 or newer. Use Codex CLI, Claude Code, or Gemini CLI separately; AEW does not install or operate those tools.

## Quick start

```bash
# From a local clone of this repository
npm install
npm link

# In your own project directory
aew init --yes --adapters codex,claude,gemini
aew doctor
```

For an interactive setup, run `aew init` in a terminal. The installer preserves existing agent instructions and project files rather than overwriting them. New installations track checksums for managed templates; use `aew upgrade --dry-run` before updating. Legacy installations without a manifest require manual review and are never overwritten automatically.

After initialization, open the project in your preferred AI coding tool and request a normal engineering task. The short adapter entrypoint contains only universal rules; specialized instructions are loaded via role skills only when relevant.

## How it works

```text
Codex / Claude Code / Gemini CLI
             |
   AGENTS.md / CLAUDE.md / GEMINI.md
             |
    on-demand AEW role skills
             |
    relevant task-specific context
             |
   implementation + real verification
             |
     recorded QA evidence / issues
```

AEW provides a set of conventions and files, not guaranteed agent orchestration. Read [How it works](docs/how-it-works.md) for details and limitations.

## Commands

| Command | Purpose |
| --- | --- |
| `aew init [--yes] [--dry-run] [--adapters codex,claude,gemini]` | Install project instructions and state files |
| `aew upgrade [--dry-run]` | Safely update unmodified AEW-managed templates; report conflicts without overwriting edits |
| `aew migrate-tasks [--dry-run]` | Copy legacy gates into per-task JSON files, preserving original gates.json |
| `aew analyze [--json]` | Shallow static project discovery |
| `aew inspect` | Print detected project information |
| `aew doctor [--json]` | Check installation file presence and basic configuration |
| `aew status`, `aew tasks`, `aew handoffs`, `aew issues` | Display project records |
| `aew check` | Execute supported project tests and report local evidence |
| `aew verify [--json] [--task AEW-001]` | Execute and evaluate AEW's local verification policies; fail closed if tests cannot run |
| `aew verify --ci` | Optional GitHub check-run integration where configured |
| `aew config set config.workflow.mode light` | Select light, standard or strict workflow policy |
| `aew config show` | Inspect configuration |
| `aew config set stack.technology .NET` | Change a supported configuration value |
| `aew configure` | Show where configuration can be edited |

## Documentation

- [Getting started](docs/getting-started.md)
- [How it works and limitations](docs/how-it-works.md)
- [Configuration](docs/configuration.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Development

```bash
npm test
npm run pack:check
```

## License

[MIT](LICENSE). This repository is independently developed and is not affiliated with any AI tool provider.

## Task migration

For existing projects, run `aew migrate-tasks --dry-run`, then `aew migrate-tasks`. This copies legacy `gates.json` tasks into `.aew/tasks/AEW-<ID>.json`, preserving the original file. Once task files exist, `aew verify` reads task files rather than the shared legacy gate. Do not edit both representations. For untracked legacy template files, `aew upgrade` reports the limitation rather than overwriting custom changes.


## Provider-neutral verification

AEW verifies **its own executable checks**, not the AI agent's claims. `aew check` runs built-in ecosystem tests (.NET, Node.js, Python and Go) without using an arbitrary executable from agent-controlled `stack.json`. `aew verify` independently executes these checks again and exits nonzero if anything is missing or fails. `LOCAL_PASS` means AEW ran the detected tests; it does **not** mean independent human code review or full behavioral correctness.

No remote account or version-control system is required. When Git or SVN is available, AEW records the revision and dirty-tree state as useful context, without inventing a revision for other workspaces. Risk paths are reported for optional external CI integration, not used to impose human review. `aew verify --ci` is an **opt-in GitHub adapter** requiring explicit check-name configuration and GitHub CLI. Other CI providers can be added later without altering the core policy. A trivial or missing test script is rejected. Agent-authored QA notes can never substitute for executable tests. Old v1 task records require non-destructive migration.

**Limitations:** AEW cannot prove that tests are complete or unmodified, and an agent with write access to source/tests may weaken them. Independent assurance requires an externally protected test definition; no local tool can guarantee that solely by inspecting agent-controlled files.

Verification diagnostics: use `aew check --timeout-ms 600000` for longer-running suites (maximum 3600000 ms). Generated untracked files produce a warning and invalidate `cleanCommitEvidence`, but successful test execution can still return `LOCAL_PASS`. In optional GitHub CI mode, critical changed paths are printed as warnings; verification of a merged commit without an open PR reports risk as unknown rather than silently asserting normal risk. `REVIEWED` is reserved for a future independent-review integration and is not currently emitted.

## Context budget (v0.5.9)

New installations no longer create or require `.aew/SYSTEM.md`. All adapter entrypoints contain a short universal rule set; procedural QA, architecture, and deployment guidance lives in discoverable role skills. Light tasks do not require shared task records. Existing custom instructions are never overwritten on `init`; use `aew upgrade --dry-run` for checksum-managed templates. Older `.aew/SYSTEM.md` copies may be left in place after upgrading but are not referenced by freshly generated adapters.

For real token-cost comparisons, see [Context benchmark](docs/context-benchmark.md). Static bootstrap size is a useful proxy, **not** proof of a token or monetary saving: instrument Claude with `--output-format stream-json` to measure usage and tool calls. Do not turn on mandatory Stop hooks in this release.
