# AEW Method

**Engineering discipline without engineering bureaucracy.**

AEW Method is a lightweight, model-agnostic CLI that installs shared engineering instructions, project memory, task tracking, and evidence-oriented QA conventions for AI-assisted development. Designed with independent developers in mind.

> **Beta (v0.5.8).** AEW is an instruction-based workflow, not an autonomous multi-agent runtime, security scanner, or test runner. AI-tool compliance depends on the host tool and context. `aew verify` checks self-reported records only and returns `verification: recorded-only` on success; it does not execute tests or independently approve code.

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

For an interactive setup, run `aew init` in a terminal. The installer preserves existing agent instructions and project files rather than overwriting them.

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
| `aew analyze [--json]` | Shallow static project discovery |
| `aew inspect` | Print detected project information |
| `aew doctor [--json]` | Check installation file presence and basic configuration |
| `aew status`, `aew tasks`, `aew handoffs`, `aew issues` | Display project records |
| `aew verify [--json] [--task AEW-001]` | Check recorded acceptance and QA gates |
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
