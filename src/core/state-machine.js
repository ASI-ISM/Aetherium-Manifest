import { RuntimeState } from "./contracts.js";

export class StateMachine {
  constructor(initialState = RuntimeState.IDLE) {
    this._current = initialState;
    this._listeners = new Set();
    
    // กำหนดเส้นทางเปลี่ยนผ่านสเตตที่ถูกต้องเพื่อป้องกันสถานะหลอนของระบบ
    this._allowedTransitions = {
      [RuntimeState.IDLE]: [RuntimeState.THINKING, RuntimeState.UNSAFE],
      [RuntimeState.THINKING]: [RuntimeState.MANIFESTING, RuntimeState.UNSAFE],
      [RuntimeState.MANIFESTING]: [RuntimeState.STABILIZING, RuntimeState.UNSAFE],
      [RuntimeState.STABILIZING]: [RuntimeState.IDLE, RuntimeState.THINKING, RuntimeState.UNSAFE],
      [RuntimeState.UNSAFE]: [RuntimeState.IDLE]
    };
  }

  get current() { return this._current; }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  transition(nextState) {
    if (this._current === nextState) return;
    
    const allowed = this._allowedTransitions[this._current];
    if (!allowed || !allowed.includes(nextState)) {
      console.warn(`[STATE MACHINE] Illegal transition attempt from ${this._current} to ${nextState}. Standardizing to UNSAFE.`);
      this._current = RuntimeState.UNSAFE;
    } else {
      this._current = nextState;
    }

    console.log(`%c[STATE TRANSITION] ➔ ${this._current}`, "color: #00f5ff; font-weight: bold;");
    this._listeners.forEach(listener => listener(this._current));
  }

  is(state) { return this._current === state; }
}
