# AEW Method

**Engineering discipline without engineering bureaucracy.**

AEW Method is a lightweight, model-agnostic CLI that installs shared engineering instructions, project memory, task tracking, and evidence-oriented QA conventions for AI-assisted development. Designed with independent developers in mind.

> **Beta (v0.5.8).** AEW is an instruction-based workflow, not an autonomous multi-agent runtime, security scanner, or test runner. AI-tool compliance depends on the host tool and context. `aew verify` is fail-closed. Legacy v1 gates cannot pass. `aew check` executes actual local tests but its result is advisory; only `aew verify --ci` can accept externally sourced CI and required review.

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

After initialization, open the project in your preferred AI coding tool and request a normal engineering task. The adapter entrypoint directs the agent to `.aew/SYSTEM.md`, the shared operating contract.

## How it works

```text
Codex / Claude Code / Gemini CLI
             |
   AGENTS.md / CLAUDE.md / GEMINI.md
             |
       .aew/SYSTEM.md
             |
    project state + task criteria
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
| `aew check` | Execute detected project test command; record advisory local result under .git |
| `aew verify --ci [--json] [--task AEW-001]` | Check current commit's GitHub Actions checks and critical-path review requirements |
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

## Verification trust model (v2)

AEW does not trust `qa.verdict`, `evidence`, or `done` flags as independent proof. New installs use gates schema v2; v1 always blocks verification with a migration explanation. A migrated task record must have `schemaVersion: 2`, and historical approvals remain untrusted. `aew check` runs `npm test`, `python -m pytest`, `go test ./...`, or detected `dotnet test` without a shell; a clean working tree before and after execution is required for `LOCAL_PASS`. Local evidence is stored under Git metadata and never qualifies as independent CI.

`aew verify --ci` requires an open PR matching local HEAD, the complete PR diff, all check names configured in `.aew/trust-policy.json` passing on that exact SHA from the `github-actions` app, and a non-bot, non-author approval on that SHA for critical changed paths. Missing Git/gh/network or incomplete proof BLOCKS, not passes. GitHub CLI must be installed and authenticated. Built-in critical paths include .aew/, .github/workflows/, security/auth/migrations/payment folders, dependency manifests, and agent instructions. Local policy can only increase risk; changes to it are critical.

**Security boundary:** The repository must also enforce protected GitHub Actions checks, CODEOWNERS and branch rules. A green check alone does not prove the test workflow was not weakened. Admin bypass and changed test implementation remain out of scope for automatic code proof; use protected reusable workflows and independent review for high assurance. Azure DevOps is not yet supported.
