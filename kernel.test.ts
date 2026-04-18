import test from 'node:test';
import assert from 'node:assert/strict';
import { AetheriumKernel } from './kernel.ts';

class MockCanvasElement {
  width = 800;
  height = 600;
  clientWidth = 800;
  clientHeight = 600;

  getContext(kind: string) {
    if (kind === 'webgl2') {
      return {
        BLEND: 1,
        ONE: 1,
        POINTS: 0,
        ARRAY_BUFFER: 0x8892,
        DYNAMIC_DRAW: 0x88E8,
        FLOAT: 0x1406,
        COLOR_BUFFER_BIT: 0x4000,
        RGBA: 0x1908,
        UNSIGNED_BYTE: 0x1401,
        VERTEX_SHADER: 0x8B31,
        FRAGMENT_SHADER: 0x8B30,
        LINK_STATUS: 0x8B82,
        COMPILE_STATUS: 0x8B81,
        createBuffer: () => ({}),
        createProgram: () => ({}),
        createShader: () => ({}),
        shaderSource: () => {},
        compileShader: () => {},
        getShaderParameter: () => true,
        getShaderInfoLog: () => '',
        attachShader: () => {},
        linkProgram: () => {},
        getProgramParameter: () => true,
        getProgramInfoLog: () => '',
        bindBuffer: () => {},
        bufferData: () => {},
        getAttribLocation: () => 0,
        enableVertexAttribArray: () => {},
        vertexAttribPointer: () => {},
        getUniformLocation: () => ({}),
        uniform1f: () => {},
        useProgram: () => {},
        drawArrays: () => {},
        clear: () => {},
        clearColor: () => {},
        enable: () => {},
        disable: () => {},
        blendFunc: () => {},
        viewport: () => {},
        readPixels: () => {},
      };
    }

    if (kind === '2d') {
      return {
        clearRect: () => {},
        fillText: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4) }),
        set font(_value: string) {},
        set textAlign(_value: string) {},
        set textBaseline(_value: string) {},
        set fillStyle(_value: string) {},
      };
    }

    return null;
  }
}

globalThis.HTMLCanvasElement = MockCanvasElement as typeof HTMLCanvasElement;
globalThis.window = { innerWidth: 800, innerHeight: 600 } as Window & typeof globalThis;
globalThis.document = {
  createElement: () => new MockCanvasElement(),
} as unknown as Document;
let rafCalls = 0;
globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  rafCalls += 1;
  if (rafCalls === 1) cb(16.67);
  return rafCalls;
}) as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
globalThis.fetch = (async (url: string | URL) => {
  const target = url.toString();
  if (target.endsWith('/api/light/interpret')) {
    return new Response(JSON.stringify({
      lcl: {
        version: '4.0',
        intent: 'create_light_form',
        morphology: { family: 'sphere', symmetry: 1, density: 0.5, scale: 0.3, edge_softness: 0.4 },
        motion: {
          archetype: 'stabilization',
          flow_mode: 'calm_drift',
          coherence_target: 0.8,
          turbulence: 0.2,
          rhythm_hz: 0.2,
          attack_ms: 400,
          settle_ms: 1200,
        },
        optics: {
          palette: ['#ffffff'],
          luminance_boost: 1.2,
          glow_alpha: 0.6,
          trail_alpha: 0.2,
          color_mode: 'palette',
        },
        content: { text: null, scene_recipe: null },
        constraints: { max_targets: 14000, max_photons: 7000, max_energy: 1.6 },
        source_text: 'create a golden spiral',
        particle_control: {
          state: 'THINKING',
          velocity: 0.7,
          turbulence: 0.2,
          cohesion: 0.8,
          flow_direction: 'still',
          glow_intensity: 0.6,
          flicker: 0.1,
          attractor: 'core',
          rhythm_hz: 0.2,
        },
      },
    }));
  }

  if (target.endsWith('/manifest.yaml')) {
    return new Response(JSON.stringify({ formations: [] }), { status: 200 });
  }

  return new Response(JSON.stringify({ readability: 0.7, coverage: 0.2, stability: 0.7 }), { status: 200 });
}) as typeof fetch;

test('AetheriumKernel initializes without errors', () => {
  const kernel = new AetheriumKernel({
    canvas: document.createElement('canvas'),
    apiBaseUrl: 'http://mock-api.com',
    formationBaseUrl: '.',
    evaluatorMode: 'local',
  });

  assert.ok(kernel instanceof AetheriumKernel);
  assert.equal(kernel.getTelemetrySnapshot().particle_count, 7000);
});

test('AetheriumKernel handles a user request and can reset state', async () => {
  const kernel = new AetheriumKernel({
    canvas: document.createElement('canvas'),
    apiBaseUrl: 'http://mock-api.com',
    formationBaseUrl: '.',
    evaluatorMode: 'local',
  });

  await kernel.handleUserLightRequest('create a golden spiral');
  assert.equal(kernel.getLCLSchema()?.version, '4.0');
  assert.equal(kernel.getTelemetrySnapshot().last_ai_command, 'create a golden spiral');

  kernel.resetToVoid();
  assert.equal(kernel.getLCLSchema(), null);
  assert.equal(kernel.getTelemetrySnapshot().last_ai_command, null);
});

test('AetheriumKernel resizes and can start-stop animation safely', () => {
  const kernel = new AetheriumKernel({
    canvas: document.createElement('canvas'),
    apiBaseUrl: 'http://mock-api.com',
    formationBaseUrl: '.',
    evaluatorMode: 'local',
  });

  kernel.resize(1920, 1080);
  kernel.start();
  kernel.stop();
  assert.ok(kernel.getTelemetrySnapshot().fps > 0);
});
