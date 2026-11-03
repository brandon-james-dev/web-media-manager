import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import App from "./App.tsx";

window.addEventListener("error", (event) => {
  console.error("[boot] uncaught error:", event.error ?? event.message);
  const root = document.getElementById("root");
  if (root && !root.hasChildNodes()) {
    root.innerHTML =
      '<pre style="padding:1rem;color:#b91c1c;font:12px/1.4 monospace;white-space:pre-wrap">' +
      "[boot] failed to start:\n" +
      String(event.error?.stack ?? event.message ?? event.error) +
      "</pre>";
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter>
      <App />
    </MemoryRouter>
  </StrictMode>
);
