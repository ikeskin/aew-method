# Human-readable code standard

- Optimize for human comprehension and maintainability, not minimum character count or artificial cleverness.
- Prefer clear naming, simple control flow and focused functions; keep related logic together.
- Do not split short fluent calls, conditions, parameters or expressions across many lines without a readability benefit.
- Do not force everything onto one line. Wrap when genuinely complex, when a line is hard to scan, or when project formatter requires it.
- Existing .editorconfig, Prettier, gofmt, Black, language formatters and repository conventions take precedence over generic AEW examples.
- Avoid unrelated reformatting; preserve diff readability.
- Review code for unnecessary wrapping, deep nesting, overly terse names and gratuitous indirection.
