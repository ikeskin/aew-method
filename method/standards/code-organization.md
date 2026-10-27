# Code organization and maintainability gate

- Follow established repository conventions before introducing a new layout. For new .NET Minimal APIs, Program.cs is the composition root: register dependencies, middleware and endpoint groups; no embedded SQL, validation rules, mapping or domain records.
- Group endpoints by feature. Keep data access separate from HTTP handling. Prefer a few cohesive files over either one giant file or gratuitous interfaces/layers/CQRS.
- Name concepts explicitly. Avoid dense one-line validation, fragile positional mapping without a reason, and unexplained null-forgiving operators on security-sensitive contexts.
- Add short comments explaining **why** for business invariants, tenant isolation, concurrency and non-obvious design trade-offs; do not narrate obvious syntax. Few words, high information.
- Developer self-check: responsibilities separated, readable, repository conventions respected, no unnecessary abstractions. Reviewer must flag maintainability failures even when tests pass.
- Changes must be proportional to task scope; refactor unrelated code only with approval.
