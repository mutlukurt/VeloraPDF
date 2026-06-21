import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

function signalWindowReady() {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
  void import("@tauri-apps/api/event")
    .then(({ emit }) => emit("velora-ready"))
    .catch(() => {
      /* Fallback timer in the Rust layer still reveals the window. */
    });
}

requestAnimationFrame(() => {
  requestAnimationFrame(signalWindowReady);
});
