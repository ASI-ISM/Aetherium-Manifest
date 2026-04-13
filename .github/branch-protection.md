# Branch protection requirement (main/master/develop)

Enable branch protection (or rulesets) for the default primary branch in use (`main`, `master`, or `develop`) with:

- **Require a pull request before merging**
- **Require review from Code Owners**
- **Require status checks to pass before merging**
  - Add `OSSF Scorecards` from workflow `Security Scorecards` as a required check on `main`

This setting makes the `CODEOWNERS` rules mandatory before merge for protected branches and enforces security workflow health gates.

- `Security Scorecards` now runs on all pull requests, so it can be safely configured as a required status check.
