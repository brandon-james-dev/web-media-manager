import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { initMetadataStore } from "./lib/file-utils/index.ts";
import "./index.css";
import App from "./App.tsx";

await initMetadataStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter>
      <App />
    </MemoryRouter>
  </StrictMode>
);
