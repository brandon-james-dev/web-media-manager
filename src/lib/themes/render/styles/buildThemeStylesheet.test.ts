import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { ReferenceKind } from "../../componentModel";
import { THEME_IR_VERSION } from "../../ir";
import type { IRColor, IRNode, IRStyle, ThemeIR } from "../../ir";
import { validateThemePackage } from "../../pipeline";
import { classicBlueDesktop } from "../../testing/classicBlueDesktop";
import { classicBlueTheme } from "../../testing/classicBlueTheme";
import { buildThemeStylesheet } from "./buildThemeStylesheet";

const manifest = {
  kind: "theme",
  spec: "1.0",
  id: "classic-blue",
  name: "Classic Blue",
  version: "1.2.0",
  formFactors: ["desktop"],
  colorSchemes: ["dark"],
};

const noImages = (): undefined => undefined;

function literal(value: string): IRColor {
  return { kind: "literal", value };
}

function classicBlueIr(): ThemeIR {
  const input = zipSync({
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "theme.xml": strToU8(classicBlueTheme),
    "layouts/desktop.xml": strToU8(classicBlueDesktop),
  });
  const result = validateThemePackage(input);
  expect(result.issues.filter((issue) => issue.severity === "error")).toEqual(
    []
  );
  return result.ir as ThemeIR;
}

function makeIr(overrides: Partial<ThemeIR> = {}): ThemeIR {
  return {
    irVersion: THEME_IR_VERSION,
    spec: "1.0",
    themeId: "test-theme",
    themeVersion: "1.0.0",
    name: "Test",
    colorSchemes: ["dark"],
    honorsUserAccent: false,
    formFactors: ["desktop"],
    palettes: {},
    fonts: {},
    textStyles: {},
    images: {},
    brushes: {},
    shadows: {},
    buttonStyles: {},
    sliderStyles: {},
    panelStyles: {},
    defaults: {},
    layouts: {},
    ...overrides,
  };
}

const allStates: IRStyle = {
  base: { foreground: literal("#ffffffff") },
  states: [
    { name: "disabled", properties: { opacity: 0.4 } },
    { name: "pressed", properties: { opacity: 0.5 } },
    { name: "active", value: "one", properties: { opacity: 0.6 } },
    { name: "active", properties: { opacity: 0.7 } },
    { name: "selected", properties: { opacity: 0.8 } },
    { name: "hover", properties: { opacity: 0.9 } },
    { name: "focused", properties: { border: literal("#ffffffff") } },
  ],
};

describe("buildThemeStylesheet", () => {
  it("gives every style id a generated class", () => {
    const ir = classicBlueIr();
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    for (const id of Object.keys(ir.buttonStyles)) {
      expect(sheet.classes.button[id]).toMatch(/^wmm-t-[0-9a-z]{6,}$/);
    }
    for (const id of Object.keys(ir.panelStyles)) {
      expect(sheet.classes.panel[id]).toMatch(/^wmm-t-[0-9a-z]{6,}$/);
    }
    for (const id of Object.keys(ir.textStyles)) {
      expect(sheet.classes.text[id]).toMatch(/^wmm-t-[0-9a-z]{6,}$/);
    }
  });

  it("keeps author ids out of the CSS text", () => {
    const ir = classicBlueIr();
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    const ids = [
      "classic-blue",
      "transport",
      "transport-bar",
      "play-orb",
      "chrome-gloss",
      "title-strip",
      "task-pane",
      "pane-header",
      "standard",
      "caption",
      "nav-touch",
    ];
    for (const id of ids) {
      expect(sheet.cssText).not.toContain(id);
    }
    expect(sheet.classes.panel.inset).not.toContain("inset");
  });

  it("orders state rules by precedence after the base rule", () => {
    const ir = makeIr({ buttonStyles: { transport: allStates } });
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    const className = sheet.classes.button.transport;
    const positions = [
      sheet.cssText.indexOf(`.${className}{`),
      sheet.cssText.indexOf(`.${className}:where(:focus-visible)`),
      sheet.cssText.indexOf(`.${className}:where(:hover:not(:disabled))`),
      sheet.cssText.indexOf(`.${className}:where([data-selected])`),
      sheet.cssText.indexOf(`.${className}:where([data-active])`),
      sheet.cssText.indexOf(`.${className}:where([data-active-value="one"])`),
      sheet.cssText.indexOf(`.${className}:where(:active:not(:disabled))`),
      sheet.cssText.indexOf(`.${className}:where(:disabled,`),
    ];
    expect(positions.every((position) => position >= 0)).toBe(true);
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index - 1]).toBeLessThan(positions[index]);
    }
  });

  it("omits hover rules outside the desktop form factor", () => {
    const ir = makeIr({ buttonStyles: { transport: allStates } });
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "tablet",
      images: noImages,
    });
    expect(sheet.cssText).not.toContain(":hover");
  });

  it("draws the focus ring when the focused state sets no border or shadow", () => {
    const ir = classicBlueIr();
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    const className = sheet.classes.button.transport;
    expect(sheet.cssText).toContain(
      `.${className}:where(:focus-visible){outline:2px solid var(--ring);outline-offset:2px;}`
    );
  });

  it("keeps the theme focus indicator when the focused state sets a border", () => {
    const ir = makeIr({ buttonStyles: { transport: allStates } });
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    const className = sheet.classes.button.transport;
    expect(sheet.cssText).not.toContain(
      `.${className}:where(:focus-visible){outline`
    );
  });

  it("skips a valued active state whose value is not a keyword", () => {
    const style: IRStyle = {
      base: {},
      states: [
        { name: "active", value: "One Two", properties: { opacity: 0.6 } },
      ],
    };
    const ir = makeIr({ buttonStyles: { transport: style } });
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    expect(sheet.cssText).not.toContain("[data-active-value=");
  });

  it("falls back to the background when a button image is unresolved", () => {
    const style: IRStyle = {
      base: {
        image: { ref: ReferenceKind.Image, id: "play-orb" },
        background: { kind: "color", color: literal("#112233ff") },
      },
      states: [],
    };
    const ir = makeIr({ buttonStyles: { transport: style } });
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    expect(sheet.cssText).toContain("background-color:#112233ff;");
    expect(sheet.cssText).not.toContain("inline-size");
  });

  it("sizes a button from a resolved image", () => {
    const style: IRStyle = {
      base: { image: { ref: ReferenceKind.Image, id: "play-orb" } },
      states: [],
    };
    const ir = makeIr({ buttonStyles: { transport: style } });
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: () => ({ url: "blob:test/1", width: 56, height: 56 }),
    });
    expect(sheet.cssText).toContain(
      'background:url("blob:test/1") center / contain no-repeat;'
    );
    expect(sheet.cssText).toContain("inline-size:56px;");
    expect(sheet.cssText).toContain("block-size:56px;");
  });

  it("colors an image button icon from its foreground", () => {
    const style: IRStyle = {
      base: {
        image: { ref: ReferenceKind.Image, id: "play-orb" },
        foreground: literal("#ffffffff"),
      },
      states: [],
    };
    const ir = makeIr({ buttonStyles: { transport: style } });
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: () => ({ url: "blob:test/1", width: 56, height: 56 }),
    });
    expect(sheet.cssText).toContain("color:#ffffffff;");
  });

  it("fills the icon glyph when iconFill is true", () => {
    const style: IRStyle = { base: { iconFill: true }, states: [] };
    const ir = makeIr({ buttonStyles: { transport: style } });
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    expect(sheet.cssText).toContain("--wmm-icon-fill:currentColor;");
  });

  it("maps the defaults to the Defaults classes", () => {
    const ir = classicBlueIr();
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    expect(sheet.defaults.button).toBe(sheet.classes.button.standard);
    expect(sheet.defaults.panel).toBe(sheet.classes.panel.content);
    expect(sheet.defaults.text).toBe(sheet.classes.text.body);
  });

  it("falls back to the built-in classes without Defaults", () => {
    const ir = makeIr();
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    expect(sheet.defaults.button).toBe("wmm-builtin-button");
    expect(sheet.defaults.panel).toBe("wmm-builtin-panel");
    expect(sheet.defaults.text).toBe("wmm-builtin-text");
  });

  it("has no node overrides for the classic blue layout", () => {
    const ir = classicBlueIr();
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    expect(sheet.nodeClasses.size).toBe(0);
  });

  it("emits a rule for a node with inline visual overrides", () => {
    const panel: IRNode = {
      element: "Panel",
      attributes: { padding: [8, 8, 8, 8], cornerRadius: [4, 4, 4, 4] },
      children: [],
    };
    const layout: IRNode = {
      element: "Layout",
      attributes: {},
      children: [panel],
    };
    const ir = makeIr({ layouts: { desktop: layout } });
    const sheet = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    const className = sheet.nodeClasses.get(panel);
    expect(className).toBeDefined();
    expect(sheet.cssText).toContain(
      `.${className}{border-start-start-radius:4px;border-start-end-radius:4px;border-end-end-radius:4px;border-end-start-radius:4px;padding-block-start:8px;padding-inline-end:8px;padding-block-end:8px;padding-inline-start:8px;}`
    );
  });

  it("builds the same text twice", () => {
    const ir = classicBlueIr();
    const first = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    const second = buildThemeStylesheet(ir, {
      formFactor: "desktop",
      images: noImages,
    });
    expect(first.cssText).toBe(second.cssText);
  });
});
