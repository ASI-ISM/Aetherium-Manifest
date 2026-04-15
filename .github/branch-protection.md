# Branch protection requirement (main/master/develop)

Enable branch protection (or rulesets) for the default primary branch in use (`main`, `master`, or `develop`) with:

- **Require a pull request before merging**
- **Require review from Code Owners**
- **Require status checks to pass before merging**
  - Configure required checks (e.g., local linting, HPA regression checks) from your active external CI or manual validation process in GitHub settings

This setting makes the `CODEOWNERS` rules mandatory before merge for protected branches and enforces your selected quality gates.
