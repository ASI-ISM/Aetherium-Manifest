-- Aetherium Cognitive Lightfield Platform backlog schema + seed data.
-- Canonical source aligns with docs/11_PLATFORM_WORK_PLAN.md.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS initiatives (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  drivers TEXT NOT NULL,
  current_state TEXT NOT NULL,
  target_state TEXT NOT NULL,
  constraints TEXT NOT NULL,
  dependencies TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workstreams (
  id INTEGER PRIMARY KEY,
  initiative_id INTEGER NOT NULL REFERENCES initiatives(id),
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done')),
  UNIQUE (initiative_id, name)
);

CREATE TABLE IF NOT EXISTS epics (
  id INTEGER PRIMARY KEY,
  workstream_id INTEGER NOT NULL REFERENCES workstreams(id),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done'))
);

CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY,
  epic_id INTEGER NOT NULL REFERENCES epics(id),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  acceptance_criteria TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  measurable_outcome TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done'))
);

CREATE TABLE IF NOT EXISTS decision_options (
  id INTEGER PRIMARY KEY,
  initiative_id INTEGER NOT NULL REFERENCES initiatives(id),
  option_code TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  pros TEXT NOT NULL,
  cons TEXT NOT NULL,
  chosen INTEGER NOT NULL CHECK (chosen IN (0,1))
);

CREATE TABLE IF NOT EXISTS risks (
  id INTEGER PRIMARY KEY,
  initiative_id INTEGER NOT NULL REFERENCES initiatives(id),
  risk_title TEXT NOT NULL,
  failure_mode TEXT NOT NULL,
  mitigation_plan TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

CREATE TABLE IF NOT EXISTS rollout_phases (
  id INTEGER PRIMARY KEY,
  initiative_id INTEGER NOT NULL REFERENCES initiatives(id),
  phase_name TEXT NOT NULL,
  timeline_weeks TEXT NOT NULL,
  owner TEXT NOT NULL,
  entry_gate TEXT NOT NULL,
  rollback_trigger TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dod_gates (
  id INTEGER PRIMARY KEY,
  initiative_id INTEGER NOT NULL REFERENCES initiatives(id),
  gate_category TEXT NOT NULL,
  gate_rule TEXT NOT NULL,
  measurable_target TEXT NOT NULL
);

INSERT INTO initiatives (
  id, code, name, scope, drivers, current_state, target_state, constraints, dependencies
) VALUES (
  1,
  'AG-2026-CLP',
  'Aetherium Cognitive Lightfield Platform',
  'Orchestration services, protocol contracts, reliability, benchmark, operations, migration',
  'reliability,latency,semantic-fidelity,security,devex',
  'Reactive Generative UI maps user intent to visual response in color, shape, density, and flow',
  'Lightfield-native cognition substrate with reflection, reasoning-surface, and native intelligence modes',
  'P95<16.7ms Tier-1, P95<33ms Tier-2, no raw biometric persistence, 2-quarter rollout',
  'Genesis,Manifest,AetherBus,SRE,Security,ML Platform'
)
ON CONFLICT (id) DO UPDATE SET
  code=excluded.code,
  name=excluded.name,
  scope=excluded.scope,
  drivers=excluded.drivers,
  current_state=excluded.current_state,
  target_state=excluded.target_state,
  constraints=excluded.constraints,
  dependencies=excluded.dependencies;

INSERT INTO workstreams (id, initiative_id, name, owner, status) VALUES
  (1, 1, 'Architecture', 'platform-architect', 'in_progress'),
  (2, 1, 'Protocol', 'aetherbus-contracts-lead', 'in_progress'),
  (3, 1, 'Reliability', 'ml-reliability-lead', 'planned'),
  (4, 1, 'Benchmark', 'graphics-performance-lead', 'planned'),
  (5, 1, 'Ops', 'sre-security-joint', 'planned'),
  (6, 1, 'Migration', 'release-manager', 'planned')
ON CONFLICT (id) DO UPDATE SET
  owner=excluded.owner,
  status=excluded.status;

INSERT INTO epics (id, workstream_id, code, title, objective, status) VALUES
  (101, 1, 'A1', 'Cognitive Lightfield Architecture', 'Deliver reflection, reasoning-surface, and native-state architecture', 'in_progress'),
  (201, 2, 'P1', 'Protocol v3 Cognition-Native', 'Unify cognition envelope with compatibility adapters', 'in_progress'),
  (301, 3, 'R1', 'Reliability and Safety', 'Guarantee semantic integrity and failure containment', 'planned'),
  (401, 4, 'B1', 'Benchmark and Quality Gates', 'Enforce performance and semantic quality budgets', 'planned'),
  (501, 5, 'O1', 'Operations and Governance', 'Operationalize observability, runbooks, and compliance controls', 'planned'),
  (601, 6, 'M1', 'Migration and Release', 'Ship phased rollout and rollback-safe migration', 'planned')
ON CONFLICT (id) DO UPDATE SET
  title=excluded.title,
  objective=excluded.objective,
  status=excluded.status;

INSERT INTO stories (id, epic_id, code, title, acceptance_criteria, status) VALUES
  (1001, 101, 'A1.1', 'Reflection layer hardening', '99.95% ingest-to-render success; mapping consistency >=0.95', 'in_progress'),
  (1002, 101, 'A1.2', 'Reasoning-surface primitives', 'Schema pass 100%; classifier F1 >=0.90', 'planned'),
  (1003, 101, 'A1.3', 'Native cognition state engine', 'Explainable transitions >=85%; language alignment >=0.92', 'planned'),
  (2001, 201, 'P1.1', 'Unified cognition envelope', 'Backward compatibility success 100%', 'in_progress'),
  (2002, 201, 'P1.2', 'Explainability and policy metadata', '95% sessions contain trace summary; 100% policy-hit metadata', 'planned'),
  (3001, 301, 'R1.1', 'Semantic integrity guardrails', 'Drift detection >=98%; fallback P95 <75ms', 'planned'),
  (3002, 301, 'R1.2', 'Failure-mode containment', 'Replay success 100% for Sev-1 incidents', 'planned'),
  (4001, 401, 'B1.1', 'Stage-wise performance benchmark', 'Nightly benchmark completion 100%', 'planned'),
  (4002, 401, 'B1.2', 'Semantic quality benchmark', 'RLS >=0.80; inter-rater alpha >=0.70', 'planned'),
  (5001, 501, 'O1.1', 'Observability and runbooks', 'MTTD <=10m and MTTR <=30m', 'planned'),
  (5002, 501, 'O1.2', 'Security and privacy enforcement', '0 critical privacy findings', 'planned'),
  (6001, 601, 'M1.1', 'Progressive rollout ladder', 'Promotion gates pass at each canary stage', 'planned'),
  (6002, 601, 'M1.2', 'Data and protocol migration', 'Zero data loss in rehearsal', 'planned')
ON CONFLICT (id) DO UPDATE SET
  title=excluded.title,
  acceptance_criteria=excluded.acceptance_criteria,
  status=excluded.status;

INSERT INTO tasks (id, story_id, code, title, measurable_outcome, owner, status) VALUES
  (9001, 1001, 'A1.1.1', 'Standardize lightfield_input contract', 'Single ingestion contract used by 100% reflection transactions', 'platform-architecture', 'in_progress'),
  (9002, 1001, 'A1.1.2', 'Add deterministic rendering profile packs', 'Profiles cover shape/color/density/flow with validated presets', 'runtime-team', 'planned'),
  (9003, 1002, 'A1.2.1', 'Add uncertainty and interference primitives', 'New fields validated by contract tests without regressions', 'platform-architecture', 'planned'),
  (9004, 1002, 'A1.2.2', 'Add collapse and convergence primitives', 'Reasoning-state classifier reaches F1 >=0.90', 'ml-reliability', 'planned'),
  (9005, 1003, 'A1.3.1', 'Implement latent state graph engine', 'State transition logs generated for >=85% sampled sessions', 'genesis-cognition', 'planned'),
  (9006, 2001, 'P1.1.1', 'Define protocol envelope for 3 cognition modes', 'v3 envelope accepted by schema lint and fixtures', 'aetherbus-contracts', 'in_progress'),
  (9007, 2001, 'P1.1.2', 'Ship v2/v3 compatibility adapters', 'Adapters pass 100% consumer compatibility tests', 'aetherbus-contracts', 'planned'),
  (9008, 3001, 'R1.1.1', 'Build semantic drift detector service', 'Detector catches >=98% seeded divergence scenarios', 'ml-reliability', 'planned'),
  (9009, 3001, 'R1.1.2', 'Add deterministic fallback trigger path', 'Fallback activates in <75ms P95 after drift breach', 'runtime-team', 'planned'),
  (9010, 4002, 'B1.2.1', 'Implement Reasoning Legibility Score harness', 'RLS generated for every benchmark run', 'benchmark-team', 'planned'),
  (9011, 5001, 'O1.1.1', 'Deploy cognitive observability dashboards', 'Latency/drift/fallback/RLS metrics available in production dashboards', 'sre', 'planned'),
  (9012, 6001, 'M1.1.1', 'Execute canary rollout 5-20-50-100', 'All stages satisfy SLO and error-budget gates', 'release-management', 'planned')
ON CONFLICT (id) DO UPDATE SET
  title=excluded.title,
  measurable_outcome=excluded.measurable_outcome,
  owner=excluded.owner,
  status=excluded.status;

INSERT INTO decision_options (id, initiative_id, option_code, summary, pros, cons, chosen) VALUES
  (1, 1, 'A', 'Layered maturity rollout: Reflection -> Reasoning Surface -> Native Intelligence', 'lowest migration risk, clear rollback, incremental validation', 'temporary complexity from multi-mode coexistence', 1),
  (2, 1, 'B', 'Big-bang native-intelligence rewrite', 'fastest theoretical arrival at target architecture', 'high delivery risk and weak rollback control', 0),
  (3, 1, 'C', 'Reflection-only optimization', 'predictable operations and near-term latency gains', 'fails strategic objective for reasoning visibility', 0)
ON CONFLICT (id) DO UPDATE SET
  option_code=excluded.option_code,
  summary=excluded.summary,
  pros=excluded.pros,
  cons=excluded.cons,
  chosen=excluded.chosen;

INSERT INTO risks (id, initiative_id, risk_title, failure_mode, mitigation_plan, severity) VALUES
  (1, 1, 'Semantic misrepresentation risk', 'Visual reasoning appears convincing while semantically incorrect', 'Semantic drift detector plus deterministic anchor and explainability audits', 'critical'),
  (2, 1, 'Latency regression in native mode', 'Native cognition mode breaches render/update SLO', 'Stage-gated budgets, adaptive quality scaling, and hard promotion gates', 'high'),
  (3, 1, 'Protocol fragmentation', 'Clients diverge in support for cognition-native fields', 'Versioned envelope with adapters and required schema lint checks', 'high'),
  (4, 1, 'Privacy leakage from cognitive traces', 'Sensitive traces retained beyond policy window', 'TTL enforcement, policy scans, and auditable access controls', 'critical')
ON CONFLICT (id) DO UPDATE SET
  risk_title=excluded.risk_title,
  failure_mode=excluded.failure_mode,
  mitigation_plan=excluded.mitigation_plan,
  severity=excluded.severity;

INSERT INTO rollout_phases (id, initiative_id, phase_name, timeline_weeks, owner, entry_gate, rollback_trigger) VALUES
  (1, 1, 'Stage 0: Protocol v3 foundation', '1-3', 'platform-architect', 'Schema validators and feature flags pass in CI', 'Protocol compatibility failures >1%'),
  (2, 1, 'Stage 1: Reflection hardening + reasoning primitives', '4-8', 'runtime-lead', 'Shadow mode metrics and compatibility gates green', 'SLO or schema regression in canary'),
  (3, 1, 'Stage 2: Native state engine + drift controls', '9-14', 'ml-reliability-lead', 'Drift detector and replay gates pass', 'Drift false-negative incidents or latency breach'),
  (4, 1, 'Stage 3: Canary to GA + redundancy cleanup', '15-20', 'release-manager', 'Canary gates pass at each traffic tier', 'Error-budget burn or RLS degradation below threshold')
ON CONFLICT (id) DO UPDATE SET
  phase_name=excluded.phase_name,
  timeline_weeks=excluded.timeline_weeks,
  owner=excluded.owner,
  entry_gate=excluded.entry_gate,
  rollback_trigger=excluded.rollback_trigger;

INSERT INTO dod_gates (id, initiative_id, gate_category, gate_rule, measurable_target) VALUES
  (1, 1, 'tests', 'Contract, replay, semantic alignment, migration rehearsal suites', '100% required suite pass'),
  (2, 1, 'slo', 'Render/update latency gate across all modes', 'P95 <16.7ms Tier-1 and <33ms Tier-2'),
  (3, 1, 'benchmark', 'Performance and Reasoning Legibility Score gate', 'RLS >=0.80 and native-mode memory increase <=25%'),
  (4, 1, 'observability', 'Latency/drift/fallback/RLS dashboard and alert gate', 'MTTD <=10 minutes and MTTR <=30 minutes'),
  (5, 1, 'runbooks', 'Drift/protocol/privacy/rollback runbook gate', '100% Sev-1 scenario coverage'),
  (6, 1, 'security', 'Privacy and cognitive-trace policy compliance gate', '0 critical audit findings')
ON CONFLICT (id) DO UPDATE SET
  gate_category=excluded.gate_category,
  gate_rule=excluded.gate_rule,
  measurable_target=excluded.measurable_target;
