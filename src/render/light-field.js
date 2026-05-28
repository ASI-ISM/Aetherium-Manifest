import { Particle } from "./particle-engine.js";

export class LightField {
  constructor(count = 3000) {
    this.particles = [];
    this.alloc(count);
  }

  alloc(count) {
    this.particles = [];
    const cx = window.innerWidth / 2 || 800;
    const cy = window.innerHeight / 2 || 600;
    for (let i = 0; i < count; i++) {
      // ปล่อยคลื่นกระจายออกจากใจกลางเพื่อความงดงามเชิงทัศนศิลป์ตั้งแต่เริ่มระบบ
      const radius = Math.sqrt(Math.random()) * (window.innerWidth * 0.4);
      const theta = Math.random() * Math.PI * 2;
      this.particles.push(
        new Particle(
          cx + Math.cos(theta) * radius,
          cy + Math.sin(theta) * radius
        )
      );
    }
  }

  update(deltaTime, ir, currentState) {
    // ประมวลผลแบบขนานเชิงโครงสร้างวัตถุ (เตรียมแปลงเป็น Compute Pass)
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update(deltaTime, ir, currentState);
    }
  }

  render(ctx, ir) {
    // เลือกการจัดสมดุลแสงสีและ Composite Operation ตามคุณสมบัติความปลอดภัยของฟิลด์แสง
    if (ir.manifest.governanceStatus === "BLOCKED" || ir.manifest.governanceStatus === "CLAMPED") {
      ctx.globalCompositeOperation = "source-over"; // โหมดปลอดภัย แสดงความเสียหายชัดเจน
    } else {
      ctx.globalCompositeOperation = "screen";     // โหมดผสานแสงความสว่างสูง (Additive blending)
    }

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx, ir);
    }
    
    // คืนค่ากลับสู่ระบบความปลอดภัยปกติ
    ctx.globalCompositeOperation = "source-over";
  }
}
