import { describe, expect, it } from "vitest";
import type { ThemeTokens } from "../buildThemeTokens";
import { ThemeTokenApplier } from "./applyThemeTokens";

function fakeRoot(): { root: HTMLElement; values: Map<string, string> } {
  const values = new Map<string, string>();
  const root = {
    style: {
      setProperty: (name: string, value: string) => {
        values.set(name, value);
      },
      removeProperty: (name: string) => {
        values.delete(name);
      },
    },
  } as unknown as HTMLElement;
  return { root, values };
}

function tokens(
  variables: Record<string, string>,
  fontFamily?: string
): ThemeTokens {
  return {
    scheme: "dark",
    variables,
    ...(fontFamily === undefined ? {} : { fontFamily }),
  };
}

describe("ThemeTokenApplier", () => {
  it("sets the variables of a scheme", () => {
    const { root, values } = fakeRoot();
    const applier = new ThemeTokenApplier(root);

    applier.apply(tokens({ "--background": "#0b1a3aff" }));

    expect(values.get("--background")).toBe("#0b1a3aff");
    expect(applier.hasTokens).toBe(true);
  });

  it("removes the variables the previous scheme set", () => {
    const { root, values } = fakeRoot();
    const applier = new ThemeTokenApplier(root);
    applier.apply(
      tokens({ "--background": "#0b1a3aff", "--wmm-selection": "#3d7bea40" })
    );

    applier.apply(tokens({ "--background": "#ffffffff" }));

    expect(values.get("--background")).toBe("#ffffffff");
    expect(values.has("--wmm-selection")).toBe(false);
  });

  it("sets and removes the root font family", () => {
    const { root, values } = fakeRoot();
    const applier = new ThemeTokenApplier(root);

    applier.apply(tokens({}, '"wmm-t-1a2b3c4d", sans-serif'));
    expect(values.get("font-family")).toBe('"wmm-t-1a2b3c4d", sans-serif');

    applier.apply(tokens({}));
    expect(values.has("font-family")).toBe(false);
  });

  it("clears every token it set", () => {
    const { root, values } = fakeRoot();
    const applier = new ThemeTokenApplier(root);
    applier.apply(tokens({ "--background": "#0b1a3aff" }, "serif"));

    applier.clear();

    expect(values.size).toBe(0);
    expect(applier.hasTokens).toBe(false);
  });

  it("has no tokens before the first apply", () => {
    const { root } = fakeRoot();

    expect(new ThemeTokenApplier(root).hasTokens).toBe(false);
  });
});
