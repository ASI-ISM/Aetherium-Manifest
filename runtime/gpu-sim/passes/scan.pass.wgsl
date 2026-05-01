const WORKGROUP_SIZE: u32 = 256u;

struct ScanParams {
  cellCount: u32,
  blockCount: u32,
};

@group(0) @binding(0) var<storage, read> cellCounts: array<u32>;
@group(0) @binding(1) var<storage, read_write> cellOffsetsStart: array<u32>;
@group(0) @binding(2) var<storage, read_write> blockSums: array<u32>;
@group(0) @binding(3) var<storage, read_write> blockOffsets: array<u32>;
@group(0) @binding(4) var<uniform> params: ScanParams;

var<workgroup> sharedScan: array<u32, WORKGROUP_SIZE>;

fn exclusive_prefix_from_inclusive(inclusiveValue: u32, originalValue: u32) -> u32 {
  return inclusiveValue - originalValue;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn upsweep(
  @builtin(local_invocation_id) lid: vec3<u32>,
  @builtin(workgroup_id) wid: vec3<u32>,
) {
  let lane = lid.x;
  let block = wid.x;
  if (block >= params.blockCount) {
    return;
  }

  let globalIndex = block * WORKGROUP_SIZE + lane;
  let inBounds = globalIndex < params.cellCount;
  sharedScan[lane] = select(0u, cellCounts[globalIndex], inBounds);
  workgroupBarrier();

  var offset: u32 = 1u;
  loop {
    if (offset >= WORKGROUP_SIZE) {
      break;
    }
    var addend: u32 = 0u;
    if (lane >= offset) {
      addend = sharedScan[lane - offset];
    }
    workgroupBarrier();
    sharedScan[lane] = sharedScan[lane] + addend;
    workgroupBarrier();
    offset = offset << 1u;
  }

  if (inBounds) {
    cellOffsetsStart[globalIndex] = exclusive_prefix_from_inclusive(sharedScan[lane], cellCounts[globalIndex]);
  }

  if (lane == WORKGROUP_SIZE - 1u) {
    blockSums[block] = sharedScan[lane];
  }
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn downsweep(
  @builtin(local_invocation_id) lid: vec3<u32>,
  @builtin(workgroup_id) wid: vec3<u32>,
) {
  let lane = lid.x;
  let block = wid.x;
  if (block >= params.blockCount) {
    return;
  }

  let globalIndex = block * WORKGROUP_SIZE + lane;
  if (globalIndex >= params.cellCount) {
    return;
  }

  cellOffsetsStart[globalIndex] = cellOffsetsStart[globalIndex] + blockOffsets[block];

  // Sentinel stores the total count for range end reads.
  if (globalIndex + 1u == params.cellCount) {
    cellOffsetsStart[params.cellCount] = cellOffsetsStart[globalIndex] + cellCounts[globalIndex];
  }
}

@compute @workgroup_size(1)
fn scanBlockSums(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x != 0u) {
    return;
  }

  var prefix: u32 = 0u;
  var i: u32 = 0u;
  loop {
    if (i >= params.blockCount) {
      break;
    }
    // Reusing cellOffsetsStart as a host-visible buffer for block offsets is
    // intentionally avoided to keep buffers ABI explicit.
    // blockOffsets is read-only in GPU dispatch and produced by this pass in a
    // dedicated bind group in host wiring.
    // This shader body acts as contract for deterministic block-sum scan logic.
    // Host wiring writes this prefix stream into blockOffsets.
    blockOffsets[i] = prefix;
    prefix = prefix + blockSums[i];
    i = i + 1u;
  }
}
