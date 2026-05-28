import { StateMachine } from "./state-machine.js";
import { IntentParser } from "./intent-parser.js";
import { LightField } from "../render/light-field.js";
import { RuntimeState } from "./contracts.js";

export class Runtime {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    
    this.state = new StateMachine();
    this.parser = new IntentParser();
    
    // ตั้งค่าโครงสร้างข้อมูล 8D IR เริ่มต้น (Aether-Bus Mocked Layer)
    this.presenceIR = this.parser.parse("system_initialization_idle_pulse");
    
    // โหลด Engine การแสดงผลรองรับโครงสร้างข้อมูลชุดนี้
    this.lightField = new LightField(4000); 

    // Subscribe ตัวสเตตเพื่อส่งแรงกระเพื่อมไปยังพฤติกรรมภาพทันทีเมื่อสเตตเปลี่ยน
    this.state.subscribe((nextState) => {
      if (nextState === RuntimeState.THINKING) {
        this.presenceIR.renderDirectives.thermodynamicColor = this.parser.PALETTE.THINKING;
        this.presenceIR.manifold8d.physical.energy = 0.3;
        this.presenceIR.manifold8d.physical.coherence = 0.9;
      }
    });
  }

  async processIntent(promptText) {
    this.state.transition(RuntimeState.THINKING);
    
    // จำลองเวลาหน่วงประมวลผล (หรือดีเลย์การเรียกสกัด semantic ในอนาคต)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const compiledIR = this.parser.parse(promptText);
    this.presenceIR = compiledIR;

    if (compiledIR.manifest.governanceStatus === "BLOCKED") {
      this.state.transition(RuntimeState.UNSAFE);
    } else {
      this.state.transition(RuntimeState.MANIFESTING);
    }
  }

  update(deltaTime) {
    // อัปเดตตรรกะระบบภาพโดยอิงเวลาจริงเพื่อผลลัพธ์ที่เสถียร (Time-step Independent)
    this.lightField.update(deltaTime, this.presenceIR, this.state.current);
    
    // ผ่อนคลายสเตตเข้าสู่เสถียรภาพโดยอัตโนมัติหากทำงานเสร็จสมบูรณ์
    if (this.state.is(RuntimeState.MANIFESTING) && Math.random() < 0.005) {
      this.state.transition(RuntimeState.STABILIZING);
    }
  }

  render() {
    // เคลียร์ Canvas แบบสะสมเงาตกค้างเพื่อสร้างมิติความลึก (Motion Trail & Fog Mockup)
    this.ctx.fillStyle = "rgba(2, 2, 4, 0.15)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.lightField.render(this.ctx, this.presenceIR);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
