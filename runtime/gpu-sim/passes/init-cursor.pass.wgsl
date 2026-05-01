struct InitCursorParams {
  cellCount: u32,
};

@group(0) @binding(0) var<storage, read> cellOffsetsStart: array<u32>;
@group(0) @binding(1) var<storage, read_write> cellOffsetsCursor: array<u32>;
@group(0) @binding(2) var<uniform> params: InitCursorParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let cellId = gid.x;
  if (cellId >= params.cellCount) {
    return;
  }

  cellOffsetsCursor[cellId] = cellOffsetsStart[cellId];
}
