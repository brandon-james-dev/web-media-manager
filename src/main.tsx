import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { initFileSystemMetadataStore } from "./lib/file-utils";
import App from "./App.tsx";

import "./index.css";

await initFileSystemMetadataStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter>
      <App />
    </MemoryRouter>
  </StrictMode>
);
