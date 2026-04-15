# Remove unused GitHub and Azure automation

## Summary

This repository removes unused GitHub/Azure platform automation to reduce maintenance overhead:

- Removed unused GitHub workflow files tied to Azure deployment and repo-level automation that is no longer in use.
- Removed Dependabot configuration that is no longer in use.

## Runtime impact

Core runtime behavior is unchanged:

- Frontend runtime assets remain intact.
- API gateway and WebSocket gateway paths remain intact.
- Governor and contract-first runtime paths remain intact.

## Local and development paths remain available

The existing local/dev execution paths still work:

- Manual service startup (frontend + API + WS)
- Existing scripts for local stack startup (for example `start_services.sh`)
- Existing Docker Compose/manual deployment paths where already documented in-repo

## Branch protection note

If your repository uses GitHub branch protection with required status checks, review and update required checks in **GitHub Settings**.

Because the removed workflows no longer run, any previous required checks tied to those workflows must be removed or replaced with checks provided by your current manual/external CI process.
