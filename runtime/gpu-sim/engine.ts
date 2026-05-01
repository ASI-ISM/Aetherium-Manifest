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
}

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

  private telemetry: GpuTelemetryFrame = {
    scan: {
      throughputCellsPerSecond: 0,
      maxLatencyMs: 0,
    },
  };

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  async dispatch(ir: GpuSimulationIR): Promise<void> {
    const uniforms = mapIRToGpuUniforms({
      lcl: ir.lcl,
      field: ir.field,
      deltaTime: ir.deltaTime,
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

  private dispatchPass(pass: GpuPassName, uniforms: GpuUniforms): void {
    // Placeholder wiring for staged WebGPU migration.
    // Real shader pipeline dispatch is attached per pass in a follow-up change.
    void uniforms;
    void pass;
  }
}
