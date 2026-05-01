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

    let scanLatencyMs = 0;
    for (const pass of GpuSimulationEngine.PASS_ORDER) {
      if (pass === 'PrefixSum') {
        const scanStart = performance.now();
        this.dispatchPass(pass, uniforms);
        scanLatencyMs = performance.now() - scanStart;
        continue;
      }
      this.dispatchPass(pass, uniforms);
    }

    if (scanLatencyMs > 0) {
      const throughput = uniforms.targetCount > 0 ? (uniforms.targetCount / scanLatencyMs) * 1000 : 0;
      this.telemetry.scan.throughputCellsPerSecond = throughput;
      this.telemetry.scan.maxLatencyMs = Math.max(this.telemetry.scan.maxLatencyMs, scanLatencyMs);
    }
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
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      this.telemetry.nan_resets += 1;
      return MAX_FRAME_DT_SECONDS;
    }
    return Math.min(deltaTime, MAX_FRAME_DT_SECONDS);
  }

  private dispatchPass(pass: GpuPassName, uniforms: GpuUniforms): void {
    // Placeholder wiring for staged WebGPU migration.
    // Real shader pipeline dispatch is attached per pass in a follow-up change.
    void uniforms;
    void pass;
  }
}
