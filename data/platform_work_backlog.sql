-- Light Cognition Layer Program backlog schema + canonical seed data.
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
  constraints_text TEXT NOT NULL,
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
  chosen INTEGER NOT NULL CHECK (chosen IN (0, 1))
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
  id,
  code,
  name,
  scope,
  drivers,
  current_state,
  target_state,
  constraints_text,
  dependencies
) VALUES (
  1,
  'LC-2026-MORPHO',
  'Light Cognition Layer Program',
  'services/modules/protocol/reliability/benchmark/ops/migration',
  'reliability,latency,semantic-fidelity,security,devex',
  'Intent outputs can map directly to visual_parameters with limited temporal generation semantics',
  'Intent flows through SemanticField, MorphogenesisEngine, LightCompiler, and CognitiveFieldRuntime before rendering',
  'P95<16.7ms Tier-1; P95<33ms Tier-2; memory +25% max; 14-week rollout; no raw biometric persistence',
  'Genesis cognition team, Manifest runtime team, AetherBus maintainers, SRE, Security/Privacy, ML platform'
)
ON CONFLICT (id) DO UPDATE SET
  code = excluded.code,
  name = excluded.name,
  scope = excluded.scope,
  drivers = excluded.drivers,
  current_state = excluded.current_state,
  target_state = excluded.target_state,
  constraints_text = excluded.constraints_text,
  dependencies = excluded.dependencies;

INSERT INTO workstreams (id, initiative_id, name, owner, status) VALUES
  (1, 1, 'Architecture', 'platform-architect', 'in_progress'),
  (2, 1, 'Protocol', 'aetherbus-contracts-lead', 'in_progress'),
  (3, 1, 'Reliability', 'ml-reliability-lead', 'planned'),
  (4, 1, 'Benchmark', 'graphics-performance-lead', 'planned'),
  (5, 1, 'Ops', 'sre-security-joint', 'planned'),
  (6, 1, 'Migration', 'release-manager', 'planned')
ON CONFLICT (id) DO UPDATE SET
  owner = excluded.owner,
  status = excluded.status;

INSERT INTO epics (id, workstream_id, code, title, objective, status) VALUES
  (120, 1, 'A2', 'Light Cognition Layer Architecture', 'Implement cognition-native middle layer between intent and render outputs', 'in_progress'),
  (220, 2, 'P2', 'Protocol Evolution for Field Cognition', 'Define versioned envelope for semantic fields, morphogenesis plans, and compiled light programs', 'in_progress'),
  (320, 3, 'R2', 'Reliability and Failure Containment', 'Detect and contain semantic-to-form drift in runtime evolution', 'planned'),
  (420, 4, 'B2', 'Benchmark and Quality Gates', 'Enforce latency, resource, and semantic-legibility gates', 'planned'),
  (520, 5, 'O2', 'Operations and Security Readiness', 'Operationalize telemetry, runbooks, and privacy/security controls', 'planned'),
  (620, 6, 'M2', 'Migration and Release Management', 'Ship phased rollout with deterministic rollback', 'planned')
ON CONFLICT (id) DO UPDATE SET
  title = excluded.title,
  objective = excluded.objective,
  status = excluded.status;

INSERT INTO stories (id, epic_id, code, title, acceptance_criteria, status) VALUES
  (1201, 120, 'A2.1', 'Semantic field ingestion', 'SemanticField validation pass 100%; ingestion success >=99.95%', 'in_progress'),
  (1202, 120, 'A2.2', 'Morphogenesis planning', 'Plan generation success >=99.9%; instability containment P95 <=75ms', 'planned'),
  (1203, 120, 'A2.3', 'Light program compilation and runtime', 'Compiler contract pass 100%; runtime overhead <=3ms P95', 'planned'),
  (2201, 220, 'P2.1', 'Unified cognition-native envelope', 'Backward compatibility pass 100%; required blocks enforced in CI', 'in_progress'),
  (2202, 220, 'P2.2', 'Explainability and governance metadata', 'Trace summary in >=95% sessions; governance metadata coverage 100%', 'planned'),
  (3201, 320, 'R2.1', 'Semantic drift detection', 'Drift recall >=98%; false positives <=3%', 'planned'),
  (3202, 320, 'R2.2', 'Deterministic containment', 'Containment <=75ms P95; Sev-1 replay reproducibility 100%', 'planned'),
  (4201, 420, 'B2.1', 'Performance benchmark suite', 'Nightly completion 100%; memory increase <=25%', 'planned'),
  (4202, 420, 'B2.2', 'Semantic legibility benchmark', 'Composite score >=0.80; inter-rater agreement >=0.70', 'planned'),
  (5201, 520, 'O2.1', 'Observability and runbooks', 'MTTD <=10m; MTTR <=30m; Sev-1 playbook validation 100%', 'planned'),
  (5202, 520, 'O2.2', 'Security and privacy controls', '0 critical audit findings; required CI compliance pass 100%', 'planned'),
  (6201, 620, 'M2.1', 'Progressive rollout', 'Promotion gated by SLO+benchmark+error budget; rollback <=15m', 'planned'),
  (6202, 620, 'M2.2', 'Legacy cleanup', 'Zero migration data loss; compatibility pass rate unchanged after cleanup', 'planned')
ON CONFLICT (id) DO UPDATE SET
  title = excluded.title,
  acceptance_criteria = excluded.acceptance_criteria,
  status = excluded.status;

INSERT INTO tasks (id, story_id, code, title, measurable_outcome, owner, status) VALUES
  (9201, 1201, 'A2.1.1', 'Normalize LLM semantics into SemanticField contract', 'SemanticField emitted for 100% cognition-native requests', 'platform-architecture', 'in_progress'),
  (9202, 1201, 'A2.1.2', 'Add SemanticField schema and validator checks', 'CI validator coverage includes all SemanticField required attributes', 'aetherbus-contracts', 'planned'),
  (9203, 1202, 'A2.2.1', 'Build MorphogenesisEngine topology planner', 'Topology seed + attractor map generated for >=99.9% replay payloads', 'genesis-cognition', 'planned'),
  (9204, 1202, 'A2.2.2', 'Implement policy-aware morph constraints', 'Unsafe trajectories blocked with policy metadata emitted 100%', 'ml-reliability', 'planned'),
  (9205, 1203, 'A2.3.1', 'Compile light programs to shader/particle/force outputs', 'Compiled artifact includes shader_uniforms + particle_targets + force_fields in 100% valid requests', 'runtime-team', 'planned'),
  (9206, 1203, 'A2.3.2', 'Run CognitiveFieldRuntime with deterministic fallback', 'Fallback engages <=75ms P95 when drift or SLO trigger breaches threshold', 'runtime-team', 'planned'),
  (9207, 2201, 'P2.1.1', 'Add cognition-native envelope blocks', 'Schema includes semantic_field/morphogenesis_plan/light_program/runtime_state and passes fixtures', 'aetherbus-contracts', 'in_progress'),
  (9208, 2201, 'P2.1.2', 'Ship visual_parameters compatibility adapter', 'Legacy consumers pass 100% compatibility tests through adapter', 'aetherbus-contracts', 'planned'),
  (9209, 3201, 'R2.1.1', 'Implement semantic-to-form drift metrics', 'Drift metrics logged at each runtime window and queryable in telemetry backend', 'ml-reliability', 'planned'),
  (9210, 3202, 'R2.2.1', 'Implement soft-clamp and deterministic anchor containment', 'Containment mode chosen and applied automatically across seeded failure scenarios', 'runtime-team', 'planned'),
  (9211, 4201, 'B2.1.1', 'Publish compile/tick/resource benchmark scenarios', 'Nightly benchmark report includes compile latency and tick stability percentiles', 'benchmark-team', 'planned'),
  (9212, 5201, 'O2.1.1', 'Deploy drift/compile/fallback/frame observability dashboards', 'Dashboards + alerts are live with on-call routing for all critical metrics', 'sre', 'planned'),
  (9213, 6201, 'M2.1.1', 'Execute progressive canary rollout 5/20/50/100', 'All phases satisfy promotion gates with recorded gate artifacts', 'release-management', 'planned')
ON CONFLICT (id) DO UPDATE SET
  title = excluded.title,
  measurable_outcome = excluded.measurable_outcome,
  owner = excluded.owner,
  status = excluded.status;

INSERT INTO decision_options (id, initiative_id, option_code, summary, pros, cons, chosen) VALUES
  (1, 1, 'A', 'Incremental middle-layer insertion', 'lowest migration risk, clear rollback, progressive observability', 'temporary dual-path complexity', 1),
  (2, 1, 'B', 'Big-bang full replacement', 'fast architecture purity', 'high reliability and schedule risk, hard rollback', 0),
  (3, 1, 'C', 'Direct mapping with minor heuristics', 'low near-term cost', 'does not deliver true generative temporal cognition', 0)
ON CONFLICT (id) DO UPDATE SET
  option_code = excluded.option_code,
  summary = excluded.summary,
  pros = excluded.pros,
  cons = excluded.cons,
  chosen = excluded.chosen;

INSERT INTO risks (id, initiative_id, risk_title, failure_mode, mitigation_plan, severity) VALUES
  (1, 1, 'Semantic persuasion mismatch', 'Rendered field appears convincing while diverging from source semantics', 'Drift metrics, deterministic anchors, explainability audits', 'critical'),
  (2, 1, 'Latency and cost regression', 'Runtime evolution stage breaches latency/resource envelopes', 'Benchmark gates, adaptive quality scaling, strict rollout gates', 'high'),
  (3, 1, 'Protocol fragmentation', 'Consumers parse inconsistent envelope subsets across versions', 'Versioned contracts with mandatory CI lint and adapters', 'high'),
  (4, 1, 'Privacy over-retention', 'Cognitive traces stored beyond policy TTL or accessed without control', 'TTL enforcement, deny-by-default storage, auditable access logs', 'critical')
ON CONFLICT (id) DO UPDATE SET
  risk_title = excluded.risk_title,
  failure_mode = excluded.failure_mode,
  mitigation_plan = excluded.mitigation_plan,
  severity = excluded.severity;

INSERT INTO rollout_phases (id, initiative_id, phase_name, timeline_weeks, owner, entry_gate, rollback_trigger) VALUES
  (1, 1, 'Phase 0: Contracts and flags', '1-2', 'platform-architect', 'Schema validators and feature flags pass in CI', 'Protocol contract failure or compatibility drop >1%'),
  (2, 1, 'Phase 1: SemanticField and Morphogenesis shadow mode', '3-6', 'runtime-lead', 'Shadow mode telemetry stable and compatibility green', 'SLO breach or drift false-negative incidents'),
  (3, 1, 'Phase 2: Compiler and runtime canary 5%->20%', '7-10', 'ml-reliability-lead', 'Benchmark and drift gates pass for canary cohorts', 'Error budget burn or sustained latency regression'),
  (4, 1, 'Phase 3: Canary 50%->100% and legacy cleanup', '11-14', 'release-manager', 'Promotion gates pass at each tier and replay verification complete', 'Semantic legibility drop below gate or compliance failure')
ON CONFLICT (id) DO UPDATE SET
  phase_name = excluded.phase_name,
  timeline_weeks = excluded.timeline_weeks,
  owner = excluded.owner,
  entry_gate = excluded.entry_gate,
  rollback_trigger = excluded.rollback_trigger;

INSERT INTO dod_gates (id, initiative_id, gate_category, gate_rule, measurable_target) VALUES
  (1, 1, 'tests', 'Contract/replay/drift/migration rehearsal suites', '100% required suite pass'),
  (2, 1, 'slo', 'Render and update latency across rollout phases', 'P95 <16.7ms Tier-1 and <33ms Tier-2'),
  (3, 1, 'benchmark', 'Compile/tick/resource + semantic legibility gate', 'Memory increase <=25% and legibility score >=0.80'),
  (4, 1, 'observability', 'Stage-level dashboard + alerting gate', 'MTTD <=10 minutes and MTTR <=30 minutes'),
  (5, 1, 'runbooks', 'Drift/compiler/protocol/privacy/rollback runbook gate', '100% Sev-1 scenario coverage'),
  (6, 1, 'security', 'Privacy retention and auditability gate', '0 critical findings and 100% CI compliance pass')
ON CONFLICT (id) DO UPDATE SET
  gate_category = excluded.gate_category,
  gate_rule = excluded.gate_rule,
  measurable_target = excluded.measurable_target;
