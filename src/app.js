import { Runtime } from "./core/runtime.js";
import { InterfaceManager } from "./ui/interface.js";

class Application {
  constructor() {
    this.canvas = document.getElementById("scene");
    this.runtime = new Runtime(this.canvas);
    
    this.ui = new InterfaceManager({
      promptInput: document.getElementById("prompt"),
      sendButton: document.getElementById("send")
    }, (intentText) => this._handleUserIntent(intentText));

    this.lastTime = performance.now();
    
    this._initSystem();
  }

  _initSystem() {
    // ผูกระบบจัดสรรขนาดหน้าจออย่างแม่นยำ
    window.addEventListener("resize", () => this._handleResize());
    this._handleResize();

    // เริ่มต้นระบบเรนเดอร์ลูปแบบถาวรชั่วกัลปาวสาน (Persistent Loop)
    requestAnimationFrame((timestamp) => this._loop(timestamp));
  }

  _handleResize() {
    this.runtime.resize(window.innerWidth, window.innerHeight);
  }

  async _handleUserIntent(text) {
    try {
      await this.runtime.processIntent(text);
    } catch (err) {
      console.error("[APPLICATION CORRUPTION CRITICAL]:", err);
    }
  }

  _loop(timestamp) {
    // คำนวณหาค่าความต่างของเวลาเพื่อรองรับหน้าจอความถี่สูง (120Hz, 144Hz, 240Hz)
    let deltaTime = (timestamp - this.lastTime) / 1000;
    
    // ล็อกเพดานกรณีสลับแท็บเบราว์เซอร์ไปที่อื่น (Prevent deltaTime Explosion)
    if (deltaTime > 0.1) deltaTime = 0.1; 
    this.lastTime = timestamp;

    // บังคับประมวลผลตรรกะและการวาดแยกขาดจากกันอย่างชัดเจนตามมาตรฐานสากล
    this.runtime.update(deltaTime);
    this.runtime.render();

    requestAnimationFrame((t) => this._loop(t));
  }
}

// จุดจุดประกายระบบไฟของจักรวาล Aetherium
window.addEventListener("DOMContentLoaded", () => {
  new Application();
});
