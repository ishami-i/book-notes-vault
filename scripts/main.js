// scripts/main.js
import { initUI } from "./ui.js";
import { State } from "./state.js";

// expose State to window for debugging (optional)
window.AppState = State;

document.addEventListener("DOMContentLoaded", () => {
  initUI();
});
