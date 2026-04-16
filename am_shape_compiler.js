/**
 * Shape Compiler
 * Equation-driven field compilers for morphology / scene / motion targets.
 */

class ShapeCompiler {
  constructor(canvasWidth, canvasHeight) {
    this.W = canvasWidth;
    this.H = canvasHeight;
    this.CX = canvasWidth / 2;
    this.CY = canvasHeight / 2;
  }

  compileShapeField(control, maxTargets) {
    const pts = [];
    const n = Math.max(200, maxTargets || control.constraints?.max_targets || control.constraints?.max_particles || 12000);
    const shape = control.morphology?.family || "sphere";

    for (let i = 0; i < n; i += 1) {
      let pos;
      switch (shape) {
        case "sphere":
          pos = this._generateSphere(i, n, control);
          break;
        case "spiral_vortex":
        case "spiral_convergence":
          pos = this._generateSpiral(i, n, control);
          break;
        case "flower_shell":
          pos = this._generateFlower(i, n, control);
          break;
        case "wave_ribbon":
          pos = this._generateWaveRibbon(i, n, control);
          break;
        case "nebula_cloud":
          pos = this._generateNebula(i, n, control);
          break;
        case "fracture_shell":
          pos = this._generateFracture(i, n, control);
          break;
        case "torus":
          pos = this._generateTorus(i, n, control);
          break;
        default:
          pos = this._generateSphere(i, n, control);
      }

      if (pos?.x !== undefined && pos?.y !== undefined) {
        pts.push({
          x: pos.x,
          y: pos.y,
          color: pos.color || control.optics?.primary_colors?.[0] || "#FFFFFF",
          energy: pos.energy || 1,
        });
      }
    }

    return pts;
  }

  compileSceneField(control, maxTargets) {
    const local = {
      ...control,
      morphology: {
        ...(control.morphology || {}),
        family: control.morphology?.family || "nebula_cloud",
      },
    };
    const pts = this.compileShapeField(local, maxTargets);
    const horizon = this.CY + this.H * 0.16;

    return pts.map((point, index) => {
      const band = index % 3;
      const yOffset = band === 0 ? -40 : (band === 1 ? 0 : 40);
      return {
        ...point,
        x: point.x,
        y: point.y * 0.6 + horizon * 0.4 + yOffset,
        energy: Math.max(0.2, point.energy * 0.8),
      };
    });
  }

  compileMotionField(control, maxTargets) {
    const n = Math.max(200, maxTargets || 8000);
    const pts = [];
    const flowMode = control.motion?.flow_mode || control.motion_bias?.archetype || "drift";

    for (let i = 0; i < n; i += 1) {
      const t = i / n;
      const baseAngle = t * Math.PI * 2;
      let x = this.CX;
      let y = this.CY;

      if (flowMode.includes("spiral")) {
        const r = 20 + t * Math.min(this.W, this.H) * 0.24;
        x += Math.cos(baseAngle * 8) * r;
        y += Math.sin(baseAngle * 8) * r * 0.7;
      } else if (flowMode.includes("radial")) {
        const r = Math.random() * Math.min(this.W, this.H) * 0.3;
        x += Math.cos(baseAngle) * r;
        y += Math.sin(baseAngle) * r;
      } else {
        x += (Math.random() - 0.5) * this.W * 0.75;
        y += Math.sin(baseAngle * 12) * 40 + (Math.random() - 0.5) * 18;
      }

      pts.push({
        x,
        y,
        color: this._gradientColor(t, control.optics || {}),
        energy: 0.4 + Math.random() * 0.6,
      });
    }

    return pts;
  }

  _generateSphere(i, n, control) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI;
    const r = Math.min(this.W, this.H) * 0.18;
    return {
      x: this.CX + Math.cos(u) * Math.sin(v) * r,
      y: this.CY + Math.cos(v) * r,
      color: control.optics?.primary_colors?.[0],
      energy: 1,
    };
  }

  _generateSpiral(i, n, control) {
    const t = (i / n) * 10 * Math.PI;
    const r = 12 + i * 0.03;
    const twist = control.morphology?.complexity || 0.6;
    return {
      x: this.CX + Math.cos(t) * r,
      y: this.CY + Math.sin(t) * r * 0.55 * (0.8 + twist * 0.4),
      color: this._lerpColor(control.optics?.primary_colors?.[0], control.optics?.secondary_colors?.[0], i / n),
      energy: 1 - (i / n) * 0.3,
    };
  }

  _generateFlower(i, n, control) {
    const petalCount = control.morphology?.symmetry || 5;
    const petalPhase = ((i % (n / petalCount)) / (n / petalCount)) * Math.PI * 2;
    const r = 50 + 30 * Math.cos(petalPhase);
    const angle = (Math.floor(i / (n / petalCount)) / petalCount) * Math.PI * 2 + petalPhase;
    return {
      x: this.CX + Math.cos(angle) * r,
      y: this.CY + Math.sin(angle) * r,
      color: control.optics?.primary_colors?.[0],
      energy: Math.abs(Math.sin(petalPhase)),
    };
  }

  _generateWaveRibbon(i, n, control) {
    const progress = i / n;
    const waveFreq = control.morphology?.complexity || 0.5;
    return {
      x: this.CX - this.W * 0.4 + progress * this.W * 0.8,
      y: this.CY + Math.sin(progress * Math.PI * waveFreq * 4) * 40,
      color: this._gradientColor(progress, control.optics || {}),
      energy: Math.sin(progress * Math.PI),
    };
  }

  _generateNebula() {
    const angle = Math.random() * Math.PI * 2;
    const radius = (Math.random() ** 0.5) * 150;
    return {
      x: this.CX + Math.cos(angle) * radius,
      y: this.CY + Math.sin(angle) * radius,
      energy: Math.random() * 0.8 + 0.2,
    };
  }

  _generateFracture(i, n, control) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.5 + 0.5;
    const radius = Math.random() * 80;
    return {
      x: this.CX + Math.cos(angle) * radius * speed,
      y: this.CY + Math.sin(angle) * radius * speed,
      color: control.optics?.primary_colors?.[0],
      energy: 1 - (i / n) * 0.5,
    };
  }

  _generateTorus() {
    const major = 80;
    const minor = 30;
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 2;
    return {
      x: this.CX + (major + minor * Math.cos(v)) * Math.cos(u),
      y: this.CY + (major + minor * Math.cos(v)) * Math.sin(u),
      energy: Math.abs(Math.sin(v)),
    };
  }

  _lerpColor(hex1, hex2, t) {
    const c1 = this._hexToRgb(hex1 || "#FFFFFF");
    const c2 = this._hexToRgb(hex2 || hex1 || "#FFFFFF");
    return `rgb(${Math.round(c1.r + (c2.r - c1.r) * t)},${Math.round(c1.g + (c2.g - c1.g) * t)},${Math.round(c1.b + (c2.b - c1.b) * t)})`;
  }

  _gradientColor(progress, optics) {
    if (!optics?.primary_colors?.length) return "#FFFFFF";
    return this._lerpColor(optics.primary_colors[0], optics.secondary_colors?.[0] || optics.primary_colors[0], progress);
  }

  _hexToRgb(hex) {
    if (hex.startsWith("rgb")) {
      const [r, g, b] = hex.match(/\d+/g).map(Number);
      return { r, g, b };
    }
    const normalized = hex.replace("#", "");
    return {
      r: parseInt(normalized.substring(0, 2), 16),
      g: parseInt(normalized.substring(2, 4), 16),
      b: parseInt(normalized.substring(4, 6), 16),
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ShapeCompiler;
}
