struct IntegrateParams {
  cellCount: u32,
};

@group(0) @binding(0) var<storage, read> cellOffsetsStart: array<u32>;
@group(0) @binding(1) var<uniform> params: IntegrateParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let cellId = gid.x;
  if (cellId >= params.cellCount) {
    return;
  }

  let start = cellOffsetsStart[cellId];
  let end = cellOffsetsStart[cellId + 1u];

  // Integration work consumes indices[start:end] as read-only range.
  _ = start;
  _ = end;
}
