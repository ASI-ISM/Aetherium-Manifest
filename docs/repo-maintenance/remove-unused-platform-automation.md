# Remove unused GitHub and Azure automation

## What changed

This maintenance update removes unused repository automation that was tied to GitHub/Azure platform workflows and bots.

Requested cleanup targets:

- `.github/workflows/azure-kubernetes-service-helm-build.yml`
- `.github/workflows/codeql-analysis.yml`
- `.github/workflows/security-scorecards.yml`
- `.github/workflows/workflow-hygiene.yml`
- `.github/workflows/codex-review.yml`
- `.github/dependabot.yml`

## Runtime impact

Core runtime paths remain unchanged:

- Frontend manifestation runtime remains intact.
- API gateway and WebSocket runtime remain intact.
- Contract/governor behavior remains intact.

## Local/dev paths remain available

You can continue to run and validate the project without those repository automations:

- Manual local run (Frontend: python3 -m http.server 4173, API: uvicorn api_gateway.main:app --port 8080)
- Existing Docker Compose or manual service startup paths already documented in-repo
- Contract and runtime checks can still be run directly from local commands

## Branch protection reminder

If GitHub branch protection uses required status checks, review those settings manually in GitHub repository settings.

Because the previous workflows were removed, any required checks pointing to them must be removed or replaced with checks from your active external/manual CI process.
