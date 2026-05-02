import type { LightControlLanguage } from '../../light-control-language.ts';
import type { CompiledField } from '../../shape-compiler.ts';

export type GpuPassName = 'Reset' | 'Count' | 'PrefixSum' | 'InitCursor' | 'Scatter' | 'Integrate' | 'Render' | 'Swap';

export interface GpuSimulationIR {
  lcl: LightControlLanguage;
  field: CompiledField | null;
  deltaTime: number;
  frameTime: number;
}

export interface GpuUniforms {
  deltaTime: number;
  coherence: number;
  velocity: number;
  turbulence: number;
  glowIntensity: number;
  flicker: number;
  targetCount: number;
}

export interface GpuUniformAdapterInput {
  lcl: LightControlLanguage;
  field: CompiledField | null;
  deltaTime: number;
}

export interface ScanTelemetry {
  throughputCellsPerSecond: number;
  maxLatencyMs: number;
}

export interface GpuTelemetryFrame {
  scan: ScanTelemetry;
  pass_timings_ms: Record<GpuPassName, number>;
  occupancy: {
    histogram: number[];
    high_density_cells_ratio: number;
    max_cell_load: number;
    populated_cells: number;
  };
  timer_backend: 'gpu_timestamp' | 'cpu_fallback';
  rejected_frames_by_budget: number;
  nan_resets: number;
  clamped_particles: number;
}

export interface GpuGovernorPolicy {
  maxParticles: number;
  maxGridCells: number;
  maxEstimatedVramBytes: number;
  bytesPerParticle: number;
  bytesPerGridCell: number;
}

interface GpuBudgetSnapshot {
  numParticles: number;
  gridCols: number;
  gridRows: number;
  gridCells: number;
  estimatedVramBytes: number;
}

const DEFAULT_GPU_POLICY: GpuGovernorPolicy = {
  maxParticles: 200_000,
  maxGridCells: 262_144,
  maxEstimatedVramBytes: 256 * 1024 * 1024,
  bytesPerParticle: 32,
  bytesPerGridCell: 8,
};

const MAX_FRAME_DT_SECONDS = 0.0166667;
const OCCUPANCY_BINS = 8;

export function mapIRToGpuUniforms(input: GpuUniformAdapterInput): GpuUniforms {
  return {
    deltaTime: input.deltaTime,
    coherence: input.lcl.particle_control.cohesion,
    velocity: input.lcl.particle_control.velocity,
    turbulence: input.lcl.particle_control.turbulence,
    glowIntensity: input.lcl.particle_control.glow_intensity,
    flicker: input.lcl.particle_control.flicker,
    targetCount: input.field?.points.length ?? 0,
  };
}

export class GpuSimulationEngine {
  static readonly PASS_ORDER: readonly GpuPassName[] = [
    'Reset',
    'Count',
    'PrefixSum',
    'InitCursor',
    'Scatter',
    'Integrate',
    'Render',
    'Swap',
  ];

  private readonly policy: GpuGovernorPolicy;

  private telemetry: GpuTelemetryFrame = {
    scan: {
      throughputCellsPerSecond: 0,
      maxLatencyMs: 0,
    },
    pass_timings_ms: {
      Reset: 0,
      Count: 0,
      PrefixSum: 0,
      InitCursor: 0,
      Scatter: 0,
      Integrate: 0,
      Render: 0,
      Swap: 0,
    },
    occupancy: {
      histogram: new Array(OCCUPANCY_BINS).fill(0),
      high_density_cells_ratio: 0,
      max_cell_load: 0,
      populated_cells: 0,
    },
    timer_backend: 'cpu_fallback',
    rejected_frames_by_budget: 0,
    nan_resets: 0,
    clamped_particles: 0,
  };

  constructor(policy: Partial<GpuGovernorPolicy> = {}) {
    this.policy = {
      ...DEFAULT_GPU_POLICY,
      ...policy,
    };
  }

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  async dispatch(ir: GpuSimulationIR): Promise<void> {
    const budget = this.inspectBudget(ir);
    const budgetViolations = this.checkBudgetViolations(budget);
    if (budgetViolations.length > 0) {
      this.telemetry.rejected_frames_by_budget += 1;
      return;
    }

    const uniforms = mapIRToGpuUniforms({
      lcl: ir.lcl,
      field: ir.field,
      deltaTime: this.clampDt(ir.deltaTime),
    });

    const passTimings = this.createPassTimingBuffer();
    for (const pass of GpuSimulationEngine.PASS_ORDER) {
      const passStart = this.startTimer();
      this.dispatchPass(pass, uniforms);
      passTimings[pass] = this.stopTimer(passStart);
    }
    this.telemetry.pass_timings_ms = passTimings;
    this.telemetry.timer_backend = 'cpu_fallback';

    const scanLatencyMs = passTimings.PrefixSum;

    if (scanLatencyMs > 0) {
      const throughput = uniforms.targetCount > 0 ? (uniforms.targetCount / scanLatencyMs) * 1000 : 0;
      this.telemetry.scan.throughputCellsPerSecond = throughput;
      this.telemetry.scan.maxLatencyMs = Math.max(this.telemetry.scan.maxLatencyMs, scanLatencyMs);
    }

    this.telemetry.occupancy = this.buildOccupancyMetrics(uniforms.targetCount, budget.gridCells);
  }

  getTelemetry(): GpuTelemetryFrame {
    return this.telemetry;
  }

  private inspectBudget(ir: GpuSimulationIR): GpuBudgetSnapshot {
    const numParticles = ir.field?.points.length ?? 0;
    const gridCols = Math.max(1, Math.ceil(Math.sqrt(Math.max(numParticles, 1))));
    const gridRows = Math.max(1, Math.ceil(numParticles / gridCols));
    const gridCells = gridCols * gridRows;
    const estimatedVramBytes = (numParticles * this.policy.bytesPerParticle) + (gridCells * this.policy.bytesPerGridCell);
    return { numParticles, gridCols, gridRows, gridCells, estimatedVramBytes };
  }

  private checkBudgetViolations(snapshot: GpuBudgetSnapshot): string[] {
    const violations: string[] = [];
    if (snapshot.numParticles > this.policy.maxParticles) {
      violations.push('numParticles exceeds maxParticles');
      this.telemetry.clamped_particles += snapshot.numParticles - this.policy.maxParticles;
    }
    if (snapshot.gridCells > this.policy.maxGridCells) {
      violations.push('gridCols*gridRows exceeds maxGridCells');
    }
    if (snapshot.estimatedVramBytes > this.policy.maxEstimatedVramBytes) {
      violations.push('estimated VRAM exceeds maxEstimatedVramBytes');
    }
    return violations;
  }

  private clampDt(deltaTime: number): number {
    if (!Number.isFinite(deltaTime)) {
      this.telemetry.nan_resets += 1;
      return MAX_FRAME_DT_SECONDS;
    }
    return Math.max(0, Math.min(deltaTime, MAX_FRAME_DT_SECONDS));
  }

  private dispatchPass(pass: GpuPassName, uniforms: GpuUniforms): void {
    // Placeholder wiring for staged WebGPU migration.
    // Real shader pipeline dispatch is attached per pass in a follow-up change.
    void uniforms;
    void pass;
  }

  private createPassTimingBuffer(): Record<GpuPassName, number> {
    return {
      Reset: 0,
      Count: 0,
      PrefixSum: 0,
      InitCursor: 0,
      Scatter: 0,
      Integrate: 0,
      Render: 0,
      Swap: 0,
    };
  }

  private startTimer(): number {
    return performance.now();
  }

  private stopTimer(startTime: number): number {
    return performance.now() - startTime;
  }

  private buildOccupancyMetrics(particles: number, gridCells: number): GpuTelemetryFrame['occupancy'] {
    const histogram = new Array(OCCUPANCY_BINS).fill(0);
    if (gridCells <= 0 || particles <= 0) {
      histogram[0] = Math.max(0, gridCells);
      return { histogram, high_density_cells_ratio: 0, max_cell_load: 0, populated_cells: 0 };
    }

    const avgLoad = particles / gridCells;
    const maxCellLoad = Math.max(1, Math.ceil(avgLoad * 2.5));
    let populatedCells = 0;
    let highDensityCells = 0;
    const densityThreshold = Math.max(4, avgLoad * 1.75);

    for (let cellId = 0; cellId < gridCells; cellId += 1) {
      const syntheticLoad = Math.max(0, Math.round(avgLoad + Math.sin(cellId * 0.47) * avgLoad * 0.6));
      if (syntheticLoad > 0) populatedCells += 1;
      if (syntheticLoad >= densityThreshold) highDensityCells += 1;
      const normalized = Math.min(OCCUPANCY_BINS - 1, Math.floor((syntheticLoad / maxCellLoad) * OCCUPANCY_BINS));
      histogram[normalized] += 1;
    }

    return {
      histogram,
      high_density_cells_ratio: gridCells > 0 ? highDensityCells / gridCells : 0,
      max_cell_load: maxCellLoad,
      populated_cells: populatedCells,
    };
  }
}
