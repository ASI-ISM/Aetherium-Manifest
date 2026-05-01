struct ScanParams {
  cellCount: u32,
};

@group(0) @binding(0) var<storage, read> cellCounts: array<u32>;
@group(0) @binding(1) var<storage, read_write> cellOffsetsStart: array<u32>;
@group(0) @binding(2) var<uniform> params: ScanParams;

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x != 0u) {
    return;
  }

  var prefix: u32 = 0u;
  var i: u32 = 0u;
  loop {
    if (i >= params.cellCount) {
      break;
    }
    cellOffsetsStart[i] = prefix;
    prefix = prefix + cellCounts[i];
    i = i + 1u;
  }

  // Sentinel stores the total count for range end reads.
  cellOffsetsStart[params.cellCount] = prefix;
}
