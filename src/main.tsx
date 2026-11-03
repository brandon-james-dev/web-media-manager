import "./index.css";

import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import App from "./App.tsx";

function formatError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

function renderBootFailure(label: string, error: unknown): void {
  console.error(label, error);
  const root = document.getElementById("root");
  if (root && !root.hasChildNodes()) {
    root.innerHTML =
      "<pre style=\"padding:1rem;color:#b91c1c;font:12px/1.4 monospace;white-space:pre-wrap\">" +
      label +
      "\n" +
      formatError(error)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;") +
      "</pre>";
  }
}

window.addEventListener("error", (event) => {
  renderBootFailure("[boot] uncaught error:", event.error ?? event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  renderBootFailure("[boot] unhandled rejection:", event.reason);
});

class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown) {
    console.error("[boot] render error:", error);
  }
  render() {
    if (this.state.error) {
      return (
        <pre
          style={{
            padding: "1rem",
            color: "#b91c1c",
            font: "12px/1.4 monospace",
            whiteSpace: "pre-wrap",
          }}
        >
          [boot] render error:
          {formatError(this.state.error)}
        </pre>
      );
    }
    return this.props.children;
  }
}

try {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </ErrorBoundary>
    </StrictMode>
  );
} catch (error) {
  renderBootFailure("[boot] mount error:", error);
}
