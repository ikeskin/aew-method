# GitHub trust setup for AEW v0.5.8

AEW's CLI is not a substitute for GitHub repository rules. A passing workflow modified by the author is **not** independent proof.

## Configure the repository outside the development branch

1. Create a ruleset for `main` requiring pull requests and all status checks listed in `.aew/trust-policy.json`. Check names must match the actual GitHub check-run names (including matrix suffixes).
2. Require the required check workflows to be protected, ideally by using reusable workflows from a separately protected repository/ref. Do not allow a PR author to silently substitute `echo ok` for real tests.
3. Require code-owner review for critical paths, particularly `.github/workflows/**`, `.github/actions/**`, `.github/CODEOWNERS`, `.aew/**`, `src/trust.js`, agent instructions, and test/dependency manifests. Add a trusted reviewer who is not the author or committer.
4. Disallow bypass by normal development identities. Limit admin access and audit ruleset changes. CODEOWNERS entries alone **do not** enforce reviews; settings must enforce them.
5. Protect the base branch and the verification policy from unauthorized changes. Require up-to-date checks after new commits.

## Evidence contracts

- `aew check`: actually invokes project tests without a shell, on a clean tree, records a SHA-bound `LOCAL_PASS` under Git metadata. Advisory only.
- `aew verify --ci`: requires authenticated `gh`, a GitHub PR whose head SHA matches the current commit, complete changed-file enumeration, the configured check runs from the `github-actions` app on that SHA, and a commit-current non-bot/non-author approval for critical changes.
- Missing network, missing `gh`, ambiguous commit author, missing review, missing or failing CI: all BLOCKED.
- Agent-authored v1 `gates.json` is never accepted. Existing tasks may be copied to v2 records, but historical self-approval does not count.

## Limitations

AEW cannot cryptographically prove that the project tests cover every requirement. The GitHub check-run provenance check does not independently inspect workflow integrity or prove branch rules are enabled. Reusable workflows and repository rules are essential parts of the trust boundary. PRs using GitHub synthetic merge SHAs may need a dedicated head-SHA check workflow: AEW deliberately refuses checks bound only to a different SHA. Azure DevOps integration remains unsupported.
