const test = require('node:test');
const assert = require('node:assert/strict');

const ShapeCompiler = require('../am_shape_compiler.js');
const { ControlHandlerV3, RuntimeGovernor } = require('../am_control_handler.js');

test('ShapeCompiler exposes shape/scene/motion field compilers', () => {
  const compiler = new ShapeCompiler(1000, 700);
  const control = {
    morphology: { family: 'spiral_vortex' },
    optics: { primary_colors: ['#ffffff'], secondary_colors: ['#0000ff'] },
    motion: { flow_mode: 'spiral_convergence' },
    constraints: { max_targets: 1200 },
  };

  assert.equal(compiler.compileShapeField(control, 500).length, 500);
  assert.equal(compiler.compileSceneField(control, 300).length, 300);
  assert.equal(compiler.compileMotionField(control, 200).length, 200);
});

test('RuntimeGovernor clamps risky values', () => {
  const governor = new RuntimeGovernor({ maxTargets: 14000 });
  const runtime = governor.sanitize(
    { safety: { max_particle_energy: 3 }, constraints: { max_targets: 99999 } },
    { field_recipe: { coherence_target: 2, turbulence: 9, flow_magnitude: -1 }, visual_recipe: { luminance: 9 } }
  );

  assert.equal(runtime.constraints.max_targets, 14000);
  assert.equal(runtime.constraints.max_particle_energy, 1.4);
  assert.equal(runtime.field_recipe.coherence_target, 1);
  assert.equal(runtime.field_recipe.turbulence, 0.85);
  assert.equal(runtime.field_recipe.flow_magnitude, 0);
  assert.equal(runtime.visual_recipe.luminance, 1);
});

test('ControlHandler compiles field according to render mode', () => {
  const compiler = new ShapeCompiler(800, 600);
  const handler = new ControlHandlerV3({ kernel: {}, shapeCompiler: compiler, intentInterpreter: {}, formationRetriever: {} });

  const control = { morphology: { family: 'sphere' }, optics: {} };
  assert.equal(handler.compileTargetField('shape_field', control, 250).length, 250);
  assert.equal(handler.compileTargetField('scene_field', control, 210).length, 210);
  assert.equal(handler.compileTargetField('motion_field', control, 190).length, 200);
});
