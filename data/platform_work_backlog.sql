-- Platform work backlog schema and seed data for README-driven implementation planning.

CREATE TABLE IF NOT EXISTS workstreams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done'))
);

CREATE TABLE IF NOT EXISTS epics (
  id INTEGER PRIMARY KEY,
  workstream_id INTEGER NOT NULL REFERENCES workstreams(id),
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done'))
);

CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY,
  epic_id INTEGER NOT NULL REFERENCES epics(id),
  title TEXT NOT NULL,
  acceptance_criteria TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id),
  title TEXT NOT NULL,
  measurable_outcome TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done'))
);

INSERT INTO workstreams (id, name, owner, status) VALUES
  (1, 'Architecture', 'frontend-platform', 'done'),
  (2, 'Protocol', 'frontend-platform', 'done'),
  (3, 'Reliability', 'quality-engineering', 'done'),
  (4, 'Benchmark', 'quality-engineering', 'in_progress'),
  (5, 'Ops', 'release-engineering', 'in_progress'),
  (6, 'Migration', 'tech-writing', 'done')
ON CONFLICT (id) DO NOTHING;

INSERT INTO epics (id, workstream_id, title, objective, status) VALUES
  (101, 1, 'Scenario Presets Runtime', 'Implement profile-based multi-setting presets', 'done'),
  (102, 3, 'Locale QA CI Gate', 'Prevent i18n drift and enforce pseudolocale', 'done')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stories (id, epic_id, title, acceptance_criteria, status) VALUES
  (1001, 101, 'Preset selector in Display settings', 'Dropdown shows custom/presentation/meditation/debug/low-power options', 'done'),
  (1002, 101, 'Preset behavior application flow', 'One selection updates page/quality/voice/mini-box state deterministically', 'done'),
  (1003, 102, 'Locale key consistency scanner', 'CI fails if locale keys diverge from base locale', 'done'),
  (1004, 102, 'Pseudolocale compliance', 'CI fails if en-XA missing or unchanged against en baseline', 'done')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (id, story_id, title, measurable_outcome, status) VALUES
  (9001, 1001, 'Add scenario preset dropdown', 'UI contains 5 preset options', 'done'),
  (9002, 1002, 'Apply preset map in runtime', 'Preset action updates 4 config domains', 'done'),
  (9003, 1003, 'Create locale QA script', 'Script returns non-zero on missing/extra keys', 'done'),
  (9004, 1004, 'Add en-XA pseudolocale file', 'All base keys present with transformed strings', 'done')
ON CONFLICT (id) DO NOTHING;
