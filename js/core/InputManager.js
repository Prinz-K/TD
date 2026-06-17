// Tracks keyboard state and mouse clicks on the canvas stack.
export default class InputManager {
  constructor(canvasContainer) {
    this.keys = new Set();
    this.container = canvasContainer;
    this.clickHandlers = [];

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      this._dispatchKey(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    this.keyPressHandlers = new Map();

    canvasContainer.addEventListener('click', (e) => {
      const rect = canvasContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.clickHandlers.forEach((h) => h(x, y));
    });
  }

  _dispatchKey(key) {
    if (this.keyPressHandlers.has(key)) {
      this.keyPressHandlers.get(key).forEach((h) => h());
    }
  }

  onKeyPress(key, handler) {
    const k = key.toLowerCase();
    if (!this.keyPressHandlers.has(k)) this.keyPressHandlers.set(k, new Set());
    this.keyPressHandlers.get(k).add(handler);
  }

  onClick(handler) {
    this.clickHandlers.push(handler);
  }

  isDown(key) {
    return this.keys.has(key.toLowerCase());
  }
}
