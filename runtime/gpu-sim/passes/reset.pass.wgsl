struct ResetParams {
  cellCount: u32,
};

@group(0) @binding(0) var<storage, read_write> cellCounts: array<u32>;
@group(0) @binding(1) var<uniform> params: ResetParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let cellId = gid.x;
  if (cellId >= params.cellCount) {
    return;
  }

  cellCounts[cellId] = 0u;
}
