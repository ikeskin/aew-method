# Optional GitHub CI adapter

AEW does **not** require GitHub, Azure DevOps, Git, SVN, CODEOWNERS, branch rules, or a second developer. The core verification workflow is provider-neutral:

```sh
aew check
aew verify
```

AEW runs built-in real project test commands and reports `LOCAL_PASS` only for successful execution. It reports VCS metadata when available; absence of a VCS is supported. Agent-authored QA statements and historical v1 acceptance records do not constitute independent evidence.

## Optional GitHub integration

Teams that already use GitHub can configure `.aew/trust-policy.json` with their actual required check names and run `aew verify --ci` to additionally validate matching SHA-bound GitHub check results. This integration requires `gh` and Git. It is **not** enabled by default and is **not** necessary for normal AEW use. It does not require CODEOWNERS or human review.

## Threat-model limit

A local test runner cannot prove that a developer or AI agent has not weakened the tests themselves. `LOCAL_PASS` means the command was executed successfully, not that code has undergone independent review. External protected checks can increase assurance when organizations need it, but AEW never demands that infrastructure from its users.
