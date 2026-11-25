import { describe, expect, it } from "vitest";
import { expandHeaders, expandTemplate } from "./expandTemplate";

describe("expandTemplate", () => {
  it("substitutes a named value", () => {
    expect(expandTemplate("Bearer {apiKey}", { apiKey: "abc" })).toBe(
      "Bearer abc"
    );
  });

  it("substitutes several placeholders in one value", () => {
    expect(
      expandTemplate("{scheme} {token}", { scheme: "Bearer", token: "t" })
    ).toBe("Bearer t");
  });

  it("resolves an unknown placeholder to an empty string", () => {
    expect(expandTemplate("Bearer {missing}", {})).toBe("Bearer ");
  });

  it("leaves a value with no placeholders untouched", () => {
    expect(expandTemplate("application/json", {})).toBe("application/json");
  });

  it("base64-encodes a value for basic auth", () => {
    expect(
      expandTemplate("Basic {base64:credentials}", {
        credentials: "user:pass",
      })
    ).toBe(`Basic ${btoa("user:pass")}`);
  });

  it("base64-encodes non-ASCII credentials from their UTF-8 bytes", () => {
    const encoded = expandTemplate("{base64:credentials}", {
      credentials: "üser:päss",
    });
    expect(encoded).toBe(btoa(String.fromCharCode(0xc3, 0xbc, 0x73, 0x65, 0x72, 0x3a, 0x70, 0xc3, 0xa4, 0x73, 0x73)));
  });

  it("resolves a missing base64 value to an empty string", () => {
    expect(expandTemplate("Basic {base64:missing}", {})).toBe("Basic ");
  });
});

describe("expandHeaders", () => {
  it("returns undefined when the descriptor declares no headers", () => {
    expect(expandHeaders(undefined, { apiKey: "abc" })).toBeUndefined();
  });

  it("expands every value and keeps the keys", () => {
    expect(
      expandHeaders(
        {
          Authorization: "Bearer {apiKey}",
          "X-Client": "web-media-manager",
        },
        { apiKey: "abc" }
      )
    ).toEqual({
      Authorization: "Bearer abc",
      "X-Client": "web-media-manager",
    });
  });
});
