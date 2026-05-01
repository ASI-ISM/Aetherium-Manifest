import test from 'node:test';
import assert from 'node:assert/strict';

const WORKGROUP_SIZE = 256;

function cpuReferenceExclusiveScan(counts) {
  const out = new Array(counts.length + 1).fill(0);
  let prefix = 0;
  for (let i = 0; i < counts.length; i += 1) {
    out[i] = prefix;
    prefix += counts[i];
  }
  out[counts.length] = prefix;
  return out;
}

function twoLevelExclusiveScan(counts, workgroupSize = WORKGROUP_SIZE) {
  const cellCount = counts.length;
  const blockCount = Math.ceil(cellCount / workgroupSize);
  const localOffsets = new Array(cellCount + 1).fill(0);
  const blockSums = new Array(blockCount).fill(0);

  for (let block = 0; block < blockCount; block += 1) {
    const start = block * workgroupSize;
    const end = Math.min(start + workgroupSize, cellCount);
    let prefix = 0;
    for (let i = start; i < end; i += 1) {
      localOffsets[i] = prefix;
      prefix += counts[i];
    }
    blockSums[block] = prefix;
  }

  const blockOffsets = new Array(blockCount).fill(0);
  let blockPrefix = 0;
  for (let block = 0; block < blockCount; block += 1) {
    blockOffsets[block] = blockPrefix;
    blockPrefix += blockSums[block];
  }

  for (let block = 0; block < blockCount; block += 1) {
    const start = block * workgroupSize;
    const end = Math.min(start + workgroupSize, cellCount);
    for (let i = start; i < end; i += 1) {
      localOffsets[i] += blockOffsets[block];
    }
  }
  localOffsets[cellCount] = blockPrefix;
  return localOffsets;
}

function makePatternedCounts(size, modulo) {
  return Array.from({ length: size }, (_, i) => (i * 7 + 3) % modulo);
}

test('two-level scan matches CPU reference for deterministic vectors', () => {
  const vectors = [
    { name: 'small', counts: [0, 3, 1, 5, 0, 2, 9, 1] },
    { name: 'medium-non-divisible', counts: makePatternedCounts(777, 11) },
    { name: 'large-non-divisible', counts: makePatternedCounts(8193, 17) },
  ];

  for (const { name, counts } of vectors) {
    const expected = cpuReferenceExclusiveScan(counts);
    const actual = twoLevelExclusiveScan(counts);
    assert.deepEqual(actual, expected, `vector ${name} mismatch`);
  }
});
