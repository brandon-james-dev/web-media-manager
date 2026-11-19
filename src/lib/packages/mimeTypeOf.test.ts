import { describe, expect, it } from "vitest";

import { mimeTypeOf } from "./mimeTypeOf";

describe("mimeTypeOf", () => {
  it("maps fonts and shaders", () => {
    expect(mimeTypeOf("assets/fonts/body.woff2")).toBe("font/woff2");
    expect(mimeTypeOf("shaders/main.glsl")).toBe("text/plain");
    expect(mimeTypeOf("shaders/main.vert")).toBe("text/plain");
  });

  it("maps wasm and images", () => {
    expect(mimeTypeOf("plugin.wasm")).toBe("application/wasm");
    expect(mimeTypeOf("thumbnail.png")).toBe("image/png");
  });

  it("lowercases the extension", () => {
    expect(mimeTypeOf("assets/images/LOGO.PNG")).toBe("image/png");
  });

  it("falls back for paths without an extension", () => {
    expect(mimeTypeOf("LICENSE")).toBe("application/octet-stream");
    expect(mimeTypeOf("assets/fonts/body")).toBe("application/octet-stream");
  });

  it("falls back for unknown extensions", () => {
    expect(mimeTypeOf("notes.txt")).toBe("application/octet-stream");
  });
});
