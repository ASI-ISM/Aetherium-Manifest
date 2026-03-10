-- Aetherium-Genesis Evolution Program backlog schema + seed data.
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
  'AG-2026-EVO',
  'Aetherium-Genesis Evolution Program',
  'Semantic orchestration, embodiment protocol, GunUI runtime, rendering infra, reliability, ops, migration',
  'latency,reliability,trust,privacy,devex',
  'Deterministic intent-to-visual mapping with WebGL-first rendering and MAE-RI/LifeState semantics',
  'Hybrid deterministic+generative visualization with WebGPU, adaptive evolution, and explainability',
  'P95<16.7ms Tier-1, P95<33ms Tier-2, zero raw biometric persistence, 2-quarter rollout',
  'Genesis, Manifest, AetherBus, Security, MLOps'
)
ON CONFLICT (id) DO UPDATE SET
  name=excluded.name,
  scope=excluded.scope,
  drivers=excluded.drivers,
  current_state=excluded.current_state,
  target_state=excluded.target_state,
  constraints=excluded.constraints,
  dependencies=excluded.dependencies;

INSERT INTO workstreams (id, initiative_id, name, owner, status) VALUES
  (1, 1, 'Architecture', 'genesis-platform-architect', 'in_progress'),
  (2, 1, 'Protocol', 'aetherbus-contracts-lead', 'in_progress'),
  (3, 1, 'Reliability', 'applied-ml-reliability', 'planned'),
  (4, 1, 'Benchmark', 'manifest-graphics-lead', 'planned'),
  (5, 1, 'Ops', 'sre-security-joint', 'planned'),
  (6, 1, 'Migration', 'release-manager', 'planned')
ON CONFLICT (id) DO UPDATE SET
  status=excluded.status,
  owner=excluded.owner;

INSERT INTO epics (id, workstream_id, code, title, objective, status) VALUES
  (101, 1, 'A1', 'Semantic Orchestrator Layer', 'Deliver hybrid deterministic+generative shape orchestration', 'in_progress'),
  (201, 2, 'P1', 'Embodiment Protocol v2', 'Extend ABI for multimodal inputs, explainability, and richer visual parameters', 'in_progress'),
  (301, 3, 'R1', 'Reliability and Adaptive Safety', 'Constrain RL adaptation while preserving state fidelity', 'planned'),
  (401, 4, 'B1', 'Performance and Rendering Benchmark', 'Validate WebGPU uplift with WebGL fallback parity', 'planned'),
  (501, 5, 'O1', 'Ops and Governance Readiness', 'Operationalize observability, runbooks, and privacy/security gates', 'planned'),
  (601, 6, 'M1', 'Migration and Multi-Agent Visualization', 'Ship phased rollout with canaries and rollback safety', 'planned')
ON CONFLICT (id) DO UPDATE SET
  status=excluded.status,
  objective=excluded.objective;

INSERT INTO stories (id, epic_id, code, title, acceptance_criteria, status) VALUES
  (1001, 101, 'A1.1', 'Hybrid shape generation pipeline', '99.9% success in 24h soak; fallback activation <50ms', 'in_progress'),
  (1002, 101, 'A1.2', 'Expanded visual parameter semantics', 'Backward compatibility 100%; invalid-range rules coverage >95%', 'planned'),
  (2001, 201, 'P1.1', 'Multimodal intent envelope', 'Raw biometric payloads blocked and not persisted', 'in_progress'),
  (2002, 201, 'P1.2', 'Explainability metadata exposure', '95% rendered shapes include explainability labels', 'planned'),
  (3001, 301, 'R1.1', 'RL policy safety wrapper', '0 fidelity violations across 1M simulation steps', 'planned'),
  (4001, 401, 'B1.1', 'WebGPU enablement benchmark', '>=2x throughput at 500k particles vs WebGL baseline', 'planned'),
  (5001, 501, 'O1.1', 'Observability and runbooks', 'MTTD <10 minutes in incident drills', 'planned'),
  (6001, 601, 'M1.1', 'Feature-flag canary migration', 'Rollback <15 minutes and no data loss', 'planned')
ON CONFLICT (id) DO UPDATE SET
  acceptance_criteria=excluded.acceptance_criteria,
  status=excluded.status;

INSERT INTO tasks (id, story_id, code, title, measurable_outcome, owner, status) VALUES
  (9001, 1001, 'A1.1.1', 'Implement shape_descriptor endpoint', 'Endpoint serves deterministic and generative descriptors with versioned schema', 'genesis-platform', 'in_progress'),
  (9002, 1001, 'A1.1.2', 'Add confidence-aware arbitration', 'Deterministic fallback invoked for confidence < threshold in <50ms', 'genesis-platform', 'planned'),
  (9003, 1002, 'A1.2.1', 'Add v2 fields: fractal_dimension/orientation_vector/symmetry_type/attractor_complexity', 'Contract validator enforces ranges and vector dimensions', 'aetherbus-contracts', 'planned'),
  (9004, 2001, 'P1.1.1', 'Add gesture and modality provenance fields', 'Protocol accepts gesture refs with modality confidence', 'aetherbus-contracts', 'in_progress'),
  (9005, 2001, 'P1.1.2', 'Enforce privacy tags and deny raw biometric persistence', 'CI blocks disallowed raw fields at 100% on privacy corpus', 'security-engineering', 'planned'),
  (9006, 3001, 'R1.1.1', 'Deploy RL policy sandbox with bounded actions', 'No policy action exceeds state-fidelity envelope in simulation', 'applied-ml-reliability', 'planned'),
  (9007, 4001, 'B1.1.1', 'Build WebGPU compute shader particle update path', '500k particle scene runs >=2x faster than WebGL baseline', 'manifest-graphics', 'planned'),
  (9008, 5001, 'O1.1.1', 'Create latency/fallback/trust dashboards', 'Dashboards publish P95, fallback-rate, and alignment KPIs in real time', 'sre', 'planned'),
  (9009, 6001, 'M1.1.1', 'Launch staged canary 5-25-50-100', 'Promotion gates pass SLO and error budget criteria at each stage', 'release-management', 'planned')
ON CONFLICT (id) DO UPDATE SET
  measurable_outcome=excluded.measurable_outcome,
  owner=excluded.owner,
  status=excluded.status;

INSERT INTO decision_options (id, initiative_id, option_code, summary, pros, cons, chosen) VALUES
  (1, 1, 'A', 'Hybrid deterministic+generative pipeline', 'state-honest baseline,fallback safety,incremental migration', 'higher integration complexity', 1),
  (2, 1, 'B', 'Generative-first rewrite', 'maximum visual novelty', 'latency variance,trust and explainability risk', 0),
  (3, 1, 'C', 'Deterministic-only optimization', 'low risk and predictable behavior', 'limited expressive growth', 0)
ON CONFLICT (id) DO UPDATE SET
  summary=excluded.summary,
  pros=excluded.pros,
  cons=excluded.cons,
  chosen=excluded.chosen;

INSERT INTO risks (id, initiative_id, risk_title, failure_mode, mitigation_plan, severity) VALUES
  (1, 1, 'Generative semantic drift', 'Rendered forms do not match real cognitive state', 'Deterministic truth anchor + semantic guardrails + explainability checks', 'high'),
  (2, 1, 'WebGPU device fragmentation', 'Render instability across browser/GPU combinations', 'Capability probing + auto fallback to WebGL2 + parity tests', 'high'),
  (3, 1, 'Adaptive policy over-optimization', 'RL optimizes engagement while degrading honesty', 'State-fidelity penalties + human policy review', 'high'),
  (4, 1, 'Biometric privacy leakage', 'Raw sensor streams accidentally persisted', 'Ingestion denial filters + RAM lifecycle controls + audits', 'critical')
ON CONFLICT (id) DO UPDATE SET
  failure_mode=excluded.failure_mode,
  mitigation_plan=excluded.mitigation_plan,
  severity=excluded.severity;

INSERT INTO rollout_phases (id, initiative_id, phase_name, timeline_weeks, owner, entry_gate, rollback_trigger) VALUES
  (1, 1, 'Phase 0: Protocol and baseline setup', '1-3', 'architecture-protocol-joint', 'Feature flags and schema lint pass', 'Schema compatibility error >2%'),
  (2, 1, 'Phase 1: Shadow WebGPU and orchestrator', '4-8', 'manifest-graphics-lead', 'Benchmark baseline and fallback parity achieved', 'Render error budget breach'),
  (3, 1, 'Phase 2: RL safety + multimodal integration', '9-14', 'applied-ml-reliability', 'Simulation safety checks and privacy checks pass', 'Policy drift or privacy violation'),
  (4, 1, 'Phase 3: Canary to GA', '15-20', 'release-manager', 'Canary gates pass at each traffic tier', 'SLO regression or trust KPI degradation')
ON CONFLICT (id) DO UPDATE SET
  timeline_weeks=excluded.timeline_weeks,
  owner=excluded.owner,
  entry_gate=excluded.entry_gate,
  rollback_trigger=excluded.rollback_trigger;

INSERT INTO dod_gates (id, initiative_id, gate_category, gate_rule, measurable_target) VALUES
  (1, 1, 'tests', 'Embodiment v2 contract and compatibility tests', '100% mandatory test suite pass'),
  (2, 1, 'slo', 'Render and e2e manifestation latency gate', 'P95 <16.7ms Tier-1 and <33ms Tier-2'),
  (3, 1, 'benchmark', 'WebGPU uplift and fallback parity gate', '>=2x throughput at 500k particles and parity score >=0.95'),
  (4, 1, 'observability', 'Dashboards and alerts for latency/fallback/trust', 'Alert-to-diagnosis <10 minutes in drills'),
  (5, 1, 'runbooks', 'Incident runbooks for drift/fallback/protocol/privacy', '100% Sev-1 scenario coverage'),
  (6, 1, 'security', 'Privacy and zero-knowledge compliance checks', '0 raw biometric persistence findings')
ON CONFLICT (id) DO UPDATE SET
  gate_rule=excluded.gate_rule,
  measurable_target=excluded.measurable_target;
