struct IntegrateParams {
  cellCount: u32,
  dt: f32,
  damping: f32,
  vmax: f32,
};

struct ParticleState {
  position: vec2<f32>,
  velocity: vec2<f32>,
};

@group(0) @binding(0) var<storage, read> cellOffsetsStart: array<u32>;
@group(0) @binding(1) var<storage, read_write> particleState: array<ParticleState>;
@group(0) @binding(2) var<uniform> params: IntegrateParams;

fn isFinite2(v: vec2<f32>) -> bool {
  return all(v == v) && all(abs(v) != vec2<f32>(1.0 / 0.0));
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let cellId = gid.x;
  if (cellId >= params.cellCount) {
    return;
  }

  let start = cellOffsetsStart[cellId];
  let end = cellOffsetsStart[cellId + 1u];
  let stepDt = min(params.dt, 0.0166667);

  for (var i = start; i < end; i = i + 1u) {
    var p = particleState[i];

    if (!isFinite2(p.position) || !isFinite2(p.velocity)) {
      p.position = vec2<f32>(0.0, 0.0);
      p.velocity = vec2<f32>(0.0, 0.0);
      particleState[i] = p;
      continue;
    }

    p.velocity = p.velocity * params.damping;
    let speed = length(p.velocity);
    if (speed > params.vmax && speed > 0.0) {
      p.velocity = normalize(p.velocity) * params.vmax;
    }

    p.position = p.position + (p.velocity * stepDt);

    if (!isFinite2(p.position) || !isFinite2(p.velocity)) {
      p.position = vec2<f32>(0.0, 0.0);
      p.velocity = vec2<f32>(0.0, 0.0);
    }

    particleState[i] = p;
  }
}
