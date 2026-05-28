export class InterfaceManager {
  constructor(elements, onIntentEmitted) {
    this.promptInput = elements.promptInput;
    this.sendButton = elements.sendButton;
    this.onIntentEmitted = onIntentEmitted;

    this._bindEvents();
  }

  _bindEvents() {
    this.sendButton.addEventListener("click", () => this._triggerEmit());
    this.promptInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this._triggerEmit();
    });
  }

  _triggerEmit() {
    const query = this.promptInput.value.trim();
    if (!query) return;
    
    this.onIntentEmitted(query);
    this.promptInput.value = ""; // เคลียร์บัฟเฟอร์อินพุตทันที
  }
}
