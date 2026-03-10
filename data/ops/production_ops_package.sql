-- Canonical operations package dataset for production readiness tracking

CREATE TABLE IF NOT EXISTS ops_metric_targets (
  metric_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  target_expression TEXT NOT NULL,
  alert_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ops_runbook_validation (
  runbook_key TEXT PRIMARY KEY,
  validated BOOLEAN NOT NULL,
  validation_date DATE NOT NULL,
  mttd_minutes NUMERIC(5,2) NOT NULL,
  mttr_minutes NUMERIC(5,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS ops_security_review (
  review_id TEXT PRIMARY KEY,
  review_date DATE NOT NULL,
  critical_findings INTEGER NOT NULL,
  notes TEXT NOT NULL
);

INSERT INTO ops_metric_targets (metric_key, display_name, target_expression, alert_name) VALUES
  ('drift_rate', 'Drift Rate', '< 0.02 over 5m window', 'LCLDriftRateHigh'),
  ('compiler_failure_rate', 'Compiler Failure Rate', '< 0.01 over 5m window', 'LCLCompilerFailureRateHigh'),
  ('fallback_frequency', 'Fallback Frequency', '< 5 activations / 10m', 'LCLFallbackFrequencyHigh'),
  ('frame_time_variance', 'Frame-Time Variance', '<= 2.5 ms stddev over 5m', 'LCLFrameTimeVarianceHigh'),
  ('policy_guard_hits', 'Policy Guard Hits', '<= 3 block|rewrite events / 10m', 'LCLPolicyGuardHitSpike')
ON CONFLICT (metric_key) DO NOTHING;

INSERT INTO ops_runbook_validation (runbook_key, validated, validation_date, mttd_minutes, mttr_minutes) VALUES
  ('drift_storm', TRUE, DATE '2026-02-14', 4.20, 22.05),
  ('compiler_degradation', TRUE, DATE '2026-02-14', 7.02, 26.32),
  ('protocol_mismatch', TRUE, DATE '2026-02-14', 8.73, 20.92),
  ('emergency_rollback', TRUE, DATE '2026-02-14', 7.22, 27.12)
ON CONFLICT (runbook_key) DO NOTHING;

INSERT INTO ops_security_review (review_id, review_date, critical_findings, notes) VALUES
  ('sec-privacy-2026-02-14', DATE '2026-02-14', 0, 'No critical findings; all mandatory controls passed')
ON CONFLICT (review_id) DO NOTHING;
