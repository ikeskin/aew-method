# How AEW works

AEW installs a shared operating contract (`.aew/SYSTEM.md`), AI-tool entrypoints, role guidance, workflow guidance, and persistent project records. The agent is instructed to read project state selectively, implement within scope, run appropriate project-native tests, and record evidence.

The Developer and QA roles are **instructions**, not independent agents launched by the CLI. A single coding assistant may perform both roles; independent execution must not be claimed unless it actually happened.

`aew verify` checks machine-readable acceptance records and QA evidence. It **does not** run tests, inspect source code for vulnerabilities, or prove that a human or independent QA agent reviewed the implementation.

`aew analyze` is shallow static discovery, not architectural understanding. `aew doctor` checks installation basics, not runtime agent compliance.

The installer does not deploy applications, provision services, install external AI tools, or overwrite existing agent entrypoints. Always review generated files before committing them to your project.
