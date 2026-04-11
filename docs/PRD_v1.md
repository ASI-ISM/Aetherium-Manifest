# Aetherium Manifest Studio — PRD v1

- **Version:** 1.0  
- **Date:** 2026-04-11  
- **Owner:** Product Lead  
- **Status:** Draft for kickoff

## 1) Problem Statement
Creative teams still work with fragmented prompt loops: low continuity, weak brand consistency, limited replayability, and insufficient enterprise controls (safety/audit/collaboration/export).

## 2) Vision
**Aetherium is a light-native creative platform** where AI interprets intent and manifests form through luminous motion, governed by a runtime boundary that is safe, testable, and enterprise-ready.

## 3) Goals (v1)
1. Reduce time from first intent to approved output.
2. Preserve cross-session brand consistency.
3. Enforce policy-first safety via Governor.
4. Provide replay/audit/export paths for real production workflows.

## 4) Non-Goals (v1)
- Full plugin marketplace.
- Full enterprise IAM/SSO suite.
- Advanced BI-grade telemetry warehousing.

## 5) Users & Jobs-to-be-Done
### Primary Roles
- **Designer:** Explore and refine branches with continuity.
- **Brand Lead:** Approve outputs against profile/rules.
- **Strategist:** Tune intent toward business outcomes.
- **Operator:** Monitor runtime state, risk, and telemetry.

### JTBD
"When creating branded assets, I need the system to start from persistent brand memory and maintain continuity across refinements so approved deliverables can be exported immediately."

## 6) Product Pillars
1. Brand Memory  
2. Creative Modes  
3. Live Variations  
4. Premium Export  
5. Session Replay  
6. Team Rooms  
7. Safety Profiles  
8. Observability HUD

## 7) Experience Architecture (Manifest Studio)
- **Left:** Intent / Brand / Mode
- **Center:** Light Canvas
- **Right:** Variations / Layers / History / Rules
- **Bottom:** Multimodal Composer

## 8) Core Flow
1. User types/speaks intent.
2. Runtime enters LISTENING → INTERPRETING.
3. Generate first light sketch (MANIFESTING).
4. Auto-branch into 4–8 variations.
5. User selects a branch and refines in-place.
6. Lock version.
7. Export / Share / Replay.

## 9) Visual Runtime States
- IDLE
- LISTENING
- THINKING
- GENERATING
- RESPONDING
- WARNING
- ERROR
- NIRODHA
- SENSOR_ACTIVE

## 10) Functional Requirements
### FR-1 Brand Memory
- Persist: primary/secondary colors, fonts, mood, composition rules, negative rules, approved references, profile archetype.
- Auto-apply memory when a brand profile is selected.

### FR-2 Creative Modes
- Required modes: `poster`, `brand`, `UI`, `concept`, `diagram`, `ambient`.
- Mode controls constraints, variation defaults, and export presets.

### FR-3 Live Variations
- Every sketch must branch 4–8 options.
- Branch presets include: `calm`, `luxury`, `sacred`, `enterprise`, `minimal`, `cinematic`.
- Refinement continues from selected branch (no context reset).

### FR-4 Premium Export
- Must support: PNG, SVG, MP4, layer package, prompt lineage, manifest JSON.
- Every export references session/replay lineage.

### FR-5 Session Replay
- Persist: prompt sequence, state transitions, visual decisions, selected variations, export history.
- Replay must run step-by-step deterministically.

### FR-6 Team Rooms
- Shared field collaboration with role presence.
- Role-specific visibility/actions: designer, brand lead, strategist, operator.

### FR-7 Safety Profiles
- Profiles: `brand-safe`, `enterprise-safe`, `sacred-safe`.
- All contracts must pass Governor before renderer execution.

### FR-8 Observability HUD
- Show: latency, drift, confidence, warnings, active mode, replay state, collaboration presence.

## 11) Non-Functional Requirements
- Predictable behavior via contract-first runtime.
- Deterministic replay for auditability.
- Low latency for first sketch and branch generation.
- Deny-by-default policy posture.

## 12) Success Metrics
### North Star
- **TTAM (Time-to-Approved-Manifest)**

### Supporting
- Variation Acceptance Rate
- Brand Consistency Score
- Governor Intervention Rate
- Replay Reopen Rate
- Export Completion Rate

## 13) Delivery Phases
### Phase 1 — Product Core
Contracts + Governor + Renderer-core

### Phase 2 — Manifest Studio
Studio UX and continuity-driven branching

### Phase 3 — Premium Memory
Projects, brand profiles, asset lineage, replay

### Phase 4 — Team / Enterprise
Shared rooms, telemetry, audit, persistence

### Phase 5 — Plugin Ecosystem
Renderer API for cinematic/diagrammatic/sacred-light/brand-motion

## 14) Risks & Mitigations
- **Model drift** → schema validation + clamp + fallback.
- **Latency under branching load** → staged quality tiers.
- **Brand inconsistency** → profile constraints + policy blocking.

## 15) Kickoff Template (Owner / Due Date / Status)
| Workstream | Deliverable | Owner | Due Date | Status | Notes |
|---|---|---|---|---|---|
| Product | PRD sign-off | TBD | YYYY-MM-DD | Not Started | Scope freeze |
| Design | Studio IA + state map | TBD | YYYY-MM-DD | Not Started | Left/Center/Right/Bottom |
| Engineering | Contract schemas v1 | TBD | YYYY-MM-DD | Not Started | intent + manifest + replay |
| AI Safety | Governor policy baseline | TBD | YYYY-MM-DD | Not Started | brand-safe/enterprise-safe/sacred-safe |
| Platform | Telemetry + replay pipeline | TBD | YYYY-MM-DD | Not Started | deterministic log order |
| GTM | Positioning + pilot list | TBD | YYYY-MM-DD | Not Started | enterprise readiness narrative |
