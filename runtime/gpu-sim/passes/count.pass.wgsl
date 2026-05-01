struct CountParams {
  numParticles: u32,
  cellCount: u32,
};

@group(0) @binding(0) var<storage, read> particleCellIds: array<u32>;
@group(0) @binding(1) var<storage, read_write> cellCounts: array<atomic<u32>>;
@group(0) @binding(2) var<uniform> params: CountParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let particleId = gid.x;
  if (particleId >= params.numParticles) {
    return;
  }

  let cellId = particleCellIds[particleId];
  if (cellId >= params.cellCount) {
    return;
  }

  _ = atomicAdd(&cellCounts[cellId], 1u);
}
