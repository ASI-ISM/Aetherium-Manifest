import { FormationType } from "../core/contracts.js";

export class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.ox = x; // พิกัดศูนย์กลางกำเนิดดั้งเดิม
    this.oy = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = Math.random() * Math.PI * 2;
    this.radiusOffset = Math.random() * 200 + 10;
    this.baseSize = Math.random() * 1.5 + 0.5;
    this.alpha = Math.random();
  }

  update(deltaTime, ir, currentState) {
    const { energy, coherence, targetShape } = ir.manifold8d.physical;
    const policyRisk = ir.manifold8d.security.policyRisk;

    this.angle += (coherence * 0.02) * (deltaTime * 60);

    let tx = this.ox;
    let ty = this.oy;

    // การคำนวณพิกัดตามโครงสร้าง Vector Formations
    if (currentState === "THINKING") {
      // ดึงดูดเข้าสู่โครงสร้างโมเมนตัมแบบ Vortex สีทองความเร็วสูง
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      tx = cx + Math.cos(this.angle) * (this.radiusOffset * 0.5);
      ty = cy + Math.sin(this.angle) * (this.radiusOffset * 0.5);
    } else if (targetShape === FormationType.VORTEX) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      tx = cx + Math.cos(this.angle) * this.radiusOffset;
      ty = cy + Math.sin(this.angle) * this.radiusOffset;
    } else if (targetShape === FormationType.SPIRAL) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const spiralDist = this.radiusOffset + (this.angle * 10);
      tx = cx + Math.cos(this.angle * 1.5) * spiralDist;
      ty = cy + Math.sin(this.angle * 1.5) * spiralDist;
    } else if (targetShape === FormationType.CRACKS || currentState === "UNSAFE") {
      // แตกกระจายอย่างไร้ทิศทาง เกิดสภาวะสั่นพ้องรุนแรงตามระดับความเสี่ยง (Policy Risk)
      tx = this.x + (Math.random() - 0.5) * (policyRisk * 40);
      ty = this.y + (Math.random() - 0.5) * (policyRisk * 40);
    }

    // ฟิสิกส์คลื่นและการเร่งความเร็วเวกเตอร์ (Euler Integration)
    const ax = (tx - this.x) * 0.05 * energy;
    const ay = (ty - this.y) * 0.05 * energy;

    this.vx += ax;
    this.vy += ay;
    this.x += this.vx * (deltaTime * 60);
    this.y += this.vy * (deltaTime * 60);

    // แรงหนืด (Damping / Friction)
    this.vx *= 0.88;
    this.vy *= 0.88;

    // ตรวจสอบขอบเขตอวกาศจำลอง
    if (this.x < 0 || this.x > window.innerWidth) this.x = Math.random() * window.innerWidth;
    if (this.y < 0 || this.y > window.innerHeight) this.y = Math.random() * window.innerHeight;
  }

  draw(ctx, ir) {
    const color = ir.renderDirectives.thermodynamicColor;
    const energy = ir.manifold8d.physical.energy;

    ctx.beginPath();
    ctx.fillStyle = color;
    
    // จัดวางมิติแสงเรืองรอบตัวแร่พลังงาน (Glow-effect emulation)
    ctx.arc(this.x, this.y, this.baseSize * (1.0 + energy * 1.5), 0, Math.PI * 2);
    ctx.fill();
  }
}
