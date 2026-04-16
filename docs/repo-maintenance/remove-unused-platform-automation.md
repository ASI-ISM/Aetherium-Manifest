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

เส้นทาง local/dev ที่มีอยู่แล้วใน repository ยังคงใช้งานได้:

- เส้นทางการปรับใช้ Docker Compose/แบบแมนนวลที่มีอยู่แล้วนั้น ได้มีการบันทึกไว้ใน repository แล้ว
- เรียกใช้งานด้วยตนเองในเครื่อง (`python3 -m http.server 4173`, FastAPI/Uvicorn flow ใน `api_gateway/`)
- เส้นทางการเริ่มต้นบริการด้วย Docker Compose หรือแบบแมนนวล ที่มีอยู่แล้วนั้น ได้มีการบันทึกไว้ใน repository แล้ว
- การตรวจสอบสัญญาและการตรวจสอบขณะทำงานยังคงสามารถดำเนินการได้โดยตรงจากคำสั่งภายในเครื่อง

## Branch protection reminder

If GitHub branch protection uses required status checks, review those settings manually in GitHub repository settings.

Because the previous workflows were removed, any required checks pointing to them must be removed or replaced with checks from your active external/manual CI process.
