import { RuntimeState, FormationType } from "./contracts.js";

export class IntentParser {
  constructor() {
    this.PALETTE = {
      IDLE: "#4338ca",
      THINKING: "#FFC857",     // Aether Gold
      MANIFESTING: "#ff4fd8",
      STABILIZING: "#00f5ff",
      UNSAFE: "#ff3d3d"       // Plasma Red
    };
  }

  parse(text) {
    const raw = text.toLowerCase();
    
    // เวกเตอร์เจตจำนงเริ่มต้น (High-level Intent Vector)
    let intentVector = {
      rawText: text,
      primaryState: RuntimeState.MANIFESTING,
      targetShape: FormationType.SPHERE,
      confidence: 0.85,
      entropyEstimate: 0.15
    };

    // Semantic matching พื้นฐาน (รอการขยายสเกลสู่ Vector Memory ใน Phase 3)
    if (raw.includes("ocean") || raw.includes("water")) {
      intentVector.targetShape = FormationType.SPHERE;
      intentVector.confidence = 0.90;
      intentVector.entropyEstimate = 0.10;
    } else if (raw.includes("storm") || raw.includes("vortex")) {
      intentVector.targetShape = FormationType.VORTEX;
      intentVector.confidence = 0.75;
      intentVector.entropyEstimate = 0.40;
    } else if (raw.includes("fire") || raw.includes("explosion")) {
      intentVector.targetShape = FormationType.CRACKS;
      intentVector.confidence = 0.95;
      intentVector.entropyEstimate = 0.48; // Entropy สูง เข้าเกณฑ์สุ่มเสี่ยง
    } else if (raw.includes("galaxy") || raw.includes("space")) {
      intentVector.targetShape = FormationType.SPIRAL;
      intentVector.confidence = 0.88;
      intentVector.entropyEstimate = 0.20;
    }

    return this._compileTo8DManifold(intentVector);
  }

  _compileTo8DManifold(vector) {
    let energy = vector.confidence;
    let coherence = 1.0 - vector.entropyEstimate;
    let status = "APPROVED";
    let state = vector.primaryState;

    // กฎเหล็ก Governance Gate: ควบคุมขอบเขตตัวแปร (Mathematical Bound)
    if (energy > 0.85) {
      energy = 0.85;
      status = "CLAMPED";
    }

    if (vector.entropyEstimate > 0.45) {
      energy = 0.95; 
      coherence = 0.05;
      status = "BLOCKED";
      state = RuntimeState.UNSAFE;
    }

    const hexColor = status === "BLOCKED" ? this.PALETTE.UNSAFE : this.PALETTE[state];
    const intentCode = { [RuntimeState.IDLE]: 0, [RuntimeState.THINKING]: 3, [RuntimeState.MANIFESTING]: 4, [RuntimeState.UNSAFE]: 99 }[state] ?? 0;

    return {
      manifest: {
        contractId: `actx-${Date.now().toString(16)}`,
        governanceStatus: status,
        timestamp: Date.now()
      },
      manifold8d: {
        spatial: { x: 0.0, y: 0.0, z: 1.0 },
        cognitive: { intentCode, confidence: vector.confidence },
        physical: { energy, coherence, targetShape: vector.targetShape },
        security: { policyRisk: vector.entropyEstimate }
      },
      renderDirectives: {
        thermodynamicColor: hexColor,
        failSafeLimit: 0.45
      }
    };
  }
}
