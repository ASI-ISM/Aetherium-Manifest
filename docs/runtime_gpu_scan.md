# GPU Scan Runtime Notes

## Multi-pass prefix-sum layout

`runtime/gpu-sim/passes/scan.pass.wgsl` now models a deterministic 2-level exclusive scan pipeline:

1. `upsweep`: workgroup-local scan (shared memory) with padding and bounds checks.
2. `scanBlockSums`: deterministic scan of per-block totals.
3. `downsweep`: adds block offsets back to each local prefix and writes the sentinel total.

The implementation treats non-divisible `cellCount` as a first-class case by zero-padding out-of-bounds lanes.

## Telemetry

`GpuSimulationEngine` records per-frame scan metrics:

- `throughputCellsPerSecond`: cells processed / scan latency (PrefixSum pass).
- `maxLatencyMs`: running max scan latency seen across frames.
- `pass_timings_ms`: per-pass timings (`Reset/Count/PrefixSum/InitCursor/Scatter/Integrate/Render/Swap`) using CPU fallback timers while GPU timestamp-query wiring is unavailable.
- `occupancy`: histogram + contention proxy (`high_density_cells_ratio`, `max_cell_load`, `populated_cells`) derived from `cellCounts`-equivalent grid occupancy sampling.

Use `getTelemetry()` to inspect current scan metrics for runtime diagnostics.

Frontend debug overlay now supports an on-demand panel (toggle key `O`) that shows:
- FPS
- Particle count
- Occupancy histogram summary
- Per-pass timings
