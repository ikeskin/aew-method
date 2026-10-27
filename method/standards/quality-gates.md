# Quality gates
- Build: execute the repository's actual build command.
- Tests: run relevant unit/integration tests; record skipped suites and exit codes.
- Static checks: run existing linters/type checkers; do not install new tooling without justification.
- Dependencies: avoid new packages unless existing capabilities are insufficient.
- CI/CD: inspect existing pipeline and permissions before editing.
- Release: validate immutable artifact identity, environment-specific configuration, migration/rollback and post-deploy health.
- Production: require explicit human approval AND existing provider-side permissions/approvals. No automated bypass.
