import test from 'node:test';
import assert from 'node:assert/strict';

import { RuntimeGovernor, type ParticleControlContract } from './governor.ts';

// Verification note:
// - Run with: npx --yes tsx --test test_runtime_governor_psycho_safety.test.ts
// - Plain `node --test` currently fails due to ESM resolution of extensionless imports in `governor.ts`.

function makePayload(params: { flicker: number; glow_intensity: number; velocity: number; emitted_at?: string; cadence_hz?: number }): ParticleControlContract {
  return {
    contract_name: 'AI Particle Control Contract V1',
    contract_version: '1.0.0',
    emitted_at: params.emitted_at ?? '2026-03-25T00:00:00Z',
    intent_state: {
      state: 'THINKING',
      shape: 'SPIRAL_VORTEX',
      particle_density: 0.78,
      turbulence: 0.24,
      glow_intensity: params.glow_intensity,
      flicker: params.flicker,
      palette: {
        mode: 'DEEP_REASONING',
        primary: '#6A0DAD',
        secondary: '#D8C7FF',
        accent: '#55C7FF',
      },
      state_entered_at: params.emitted_at ?? '2026-03-25T00:00:00Z',
      state_duration_ms: 1000,
      transition_reason: 'test',
    },
    renderer_controls: {
      runtime_profile: 'DETERMINISTIC',
      shader_uniforms: params.cadence_hz == null ? {} : { cadence_hz: params.cadence_hz },
      velocity: params.velocity,
    },
  };
}

test('psycho_safety_gate stage order parity with Python governor tests', () => {
  const governor = new RuntimeGovernor();
  const decision = governor.process(makePayload({ flicker: 0.05, glow_intensity: 0.5, velocity: 0.2 }));
  const stages = decision.telemetry.map((event) => event.stage);

  assert.ok(stages.includes('psycho_safety_gate'));
  assert.ok(stages.includes('validate_schema'));
  assert.ok(stages.indexOf('fallback') < stages.indexOf('psycho_safety_gate'));
  assert.ok(stages.indexOf('psycho_safety_gate') < stages.indexOf('validate_schema'));
  assert.ok(stages.indexOf('validate_schema') < stages.indexOf('policy_block'));
  assert.ok(stages.indexOf('psycho_safety_gate') < stages.indexOf('policy_block'));
});

test('psycho_safety_gate no-op parity for safe inputs', () => {
  const governor = new RuntimeGovernor();
  const decision = governor.process(makePayload({ flicker: 0.05, glow_intensity: 0.5, velocity: 0.2 }));

  assert.equal(decision.accepted, true);
  assert.equal(decision.effective_contract.intent_state.flicker, 0.05);
  assert.equal(decision.effective_contract.intent_state.glow_intensity, 0.5);
  assert.equal(decision.effective_contract.renderer_controls.velocity, 0.2);
  assert.equal(decision.mutations.some((note) => note.startsWith('psycho_safety_gate')), false);
});

test('psycho_safety_gate per-field cap reduction parity', () => {
  const governor = new RuntimeGovernor();
  const decision = governor.process(makePayload({ flicker: 0.19, glow_intensity: 0.9, velocity: 0.9 }));

  assert.equal(decision.accepted, true);
  assert.equal(decision.effective_contract.intent_state.flicker, 0.12);
  assert.equal(decision.effective_contract.intent_state.glow_intensity, 0.72);
  assert.equal(decision.effective_contract.renderer_controls.velocity, 0.5);
  assert.equal(decision.mutations.some((note) => note.startsWith('psycho_safety_gate')), true);
});


test('psycho_safety_gate caps cadence at WCAG threshold', () => {
  const governor = new RuntimeGovernor();
  const decision = governor.process(makePayload({ flicker: 0.05, glow_intensity: 0.5, velocity: 0.2, cadence_hz: 6.0 }));

  assert.equal(decision.effective_contract.renderer_controls.shader_uniforms?.cadence_hz, 3);
  assert.equal(decision.mutations.some((note) => note.includes('WCAG <=3 flashes/sec')), true);
});

test('psycho_safety_gate detects gradual cadence drift', () => {
  const governor = new RuntimeGovernor();
  const samples = [
    { emitted_at: '2026-03-25T00:00:00Z', cadence_hz: 1.0 },
    { emitted_at: '2026-03-25T00:02:00Z', cadence_hz: 1.1 },
    { emitted_at: '2026-03-25T00:04:00Z', cadence_hz: 1.2 },
  ];

  let decision = governor.process(makePayload({ flicker: 0.06, glow_intensity: 0.6, velocity: 0.4, ...samples[0] }));
  decision = governor.process(makePayload({ flicker: 0.06, glow_intensity: 0.6, velocity: 0.4, ...samples[1] }));
  decision = governor.process(makePayload({ flicker: 0.06, glow_intensity: 0.6, velocity: 0.4, ...samples[2] }));

  assert.equal(decision.mutations.some((note) => note.includes('gradual frequency drift detected')), true);
  assert.ok((decision.effective_contract.renderer_controls.velocity ?? 0) <= 0.18);
  assert.ok((decision.effective_contract.intent_state.glow_intensity ?? 0) <= 0.35);
});
