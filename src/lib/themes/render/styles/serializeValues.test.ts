import { describe, expect, it } from "vitest";
import { ReferenceKind } from "../../componentModel";
import type { PaletteSlot } from "../../componentModel";
import type { IRBrush, IRColor, IRShadowLayer } from "../../ir";
import { themeFontFamilyName } from "../../runtime";
import {
  serializeBrush,
  serializeColor,
  serializeCornerRadius,
  serializeLength,
  serializeShadow,
  serializeTextStyle,
  serializeThickness,
} from "./serializeValues";
import type { ResolvedThemeImage } from "./types";

function literal(value: string): IRColor {
  return { kind: "literal", value };
}

function slot(name: PaletteSlot): IRColor {
  return { kind: "slot", slot: name };
}

function image(
  overrides: Partial<ResolvedThemeImage> = {}
): ResolvedThemeImage {
  return { url: "blob:test/1", ...overrides };
}

const noImages = (): undefined => undefined;

describe("serializeColor", () => {
  it("writes the first variable of a palette slot", () => {
    expect(serializeColor(slot("card"))).toBe("var(--card)");
    expect(serializeColor(slot("ring"))).toBe("var(--ring)");
  });

  it("keeps a literal value", () => {
    expect(serializeColor(literal("#0b1a3aff"))).toBe("#0b1a3aff");
  });
});

describe("serializeLength", () => {
  it("writes pixels and keeps zero unitless", () => {
    expect(serializeLength(16)).toBe("16px");
    expect(serializeLength(0)).toBe("0");
  });
});

describe("serializeThickness", () => {
  it("writes logical padding in top right bottom left order", () => {
    expect(serializeThickness("padding", [4, 10, 4, 10])).toEqual({
      "padding-block-start": "4px",
      "padding-inline-end": "10px",
      "padding-block-end": "4px",
      "padding-inline-start": "10px",
    });
  });

  it("writes the four border width properties", () => {
    expect(serializeThickness("border-width", [1, 0, 0, 0])).toEqual({
      "border-block-start-width": "1px",
      "border-inline-end-width": "0",
      "border-block-end-width": "0",
      "border-inline-start-width": "0",
    });
  });
});

describe("serializeCornerRadius", () => {
  it("maps top-left top-right bottom-right bottom-left", () => {
    expect(serializeCornerRadius([6, 6, 0, 0])).toEqual({
      "border-start-start-radius": "6px",
      "border-start-end-radius": "6px",
      "border-end-end-radius": "0",
      "border-end-start-radius": "0",
    });
  });
});

describe("serializeShadow", () => {
  it("writes stacked layers in order", () => {
    const layers: IRShadowLayer[] = [
      {
        x: 0,
        y: 2,
        blur: 6,
        spread: 0,
        color: literal("#00000066"),
        inset: false,
      },
      {
        x: 0,
        y: 8,
        blur: 16,
        spread: -2,
        color: literal("#00000040"),
        inset: true,
      },
    ];
    expect(serializeShadow(layers)).toBe(
      "0px 2px 6px 0px #00000066, inset 0px 8px 16px -2px #00000040"
    );
  });
});

describe("serializeBrush", () => {
  const brushes: Record<string, IRBrush> = {
    panel: { type: "solid", color: slot("card") },
    gloss: {
      type: "linear",
      angle: 180,
      stops: [
        { offset: 0, color: literal("#5f8fe0ff") },
        { offset: 0.5, color: literal("#2f5fb8ff") },
        { offset: 1, color: literal("#1c3f94ff") },
      ],
    },
    frame: { type: "image", image: "chrome-frame", fit: "nineSlice" },
    photo: { type: "image", image: "photo", fit: "cover" },
    tile: { type: "image", image: "tile", fit: "tile" },
    tinted: {
      type: "image",
      image: "photo",
      fit: "stretch",
      tint: literal("#ff0000ff"),
    },
    missing: { type: "image", image: "absent", fit: "stretch" },
  };

  const images = (id: string): ResolvedThemeImage | undefined => {
    if (id === "chrome-frame") return image({ slice: [12, 12, 12, 12] });
    if (id === "photo" || id === "tile") return image();
    return undefined;
  };

  it("writes a solid brush as a background color", () => {
    expect(
      serializeBrush({ kind: "brush", id: "panel" }, { brushes, images })
    ).toEqual({
      "background-color": "var(--card)",
      "background-image": "none",
    });
  });

  it("writes a color brush as a background color", () => {
    expect(
      serializeBrush(
        { kind: "color", color: literal("#ffffff1aff") },
        { brushes, images }
      )
    ).toEqual({
      "background-color": "#ffffff1aff",
      "background-image": "none",
    });
  });

  it("writes a linear gradient with percentage stops", () => {
    expect(
      serializeBrush({ kind: "brush", id: "gloss" }, { brushes, images })
    ).toEqual({
      "background-image":
        "linear-gradient(180deg, #5f8fe0ff 0%, #2f5fb8ff 50%, #1c3f94ff 100%)",
    });
  });

  it("stretches an image brush over its box", () => {
    expect(
      serializeBrush({ kind: "brush", id: "tinted" }, { brushes, images })
    ).toEqual({
      "background-image": 'url("blob:test/1")',
      "background-size": "100% 100%",
      "background-repeat": "no-repeat",
      "background-color": "#ff0000ff",
      "background-blend-mode": "multiply",
    });
  });

  it("centers a cover image brush", () => {
    expect(
      serializeBrush({ kind: "brush", id: "photo" }, { brushes, images })
    ).toEqual({
      "background-image": 'url("blob:test/1")',
      "background-size": "cover",
      "background-repeat": "no-repeat",
      "background-position": "center",
    });
  });

  it("tiles a tile image brush", () => {
    expect(
      serializeBrush({ kind: "brush", id: "tile" }, { brushes, images })
    ).toEqual({
      "background-image": 'url("blob:test/1")',
      "background-repeat": "repeat",
      "background-size": "auto",
    });
  });

  it("writes a nine-slice image brush as a border image", () => {
    expect(
      serializeBrush({ kind: "brush", id: "frame" }, { brushes, images })
    ).toEqual({
      "border-image-source": 'url("blob:test/1")',
      "border-image-slice": "12 12 12 12 fill",
      "border-image-width": "12px 12px 12px 12px",
      "border-image-repeat": "stretch",
      "border-image-outset": "0",
      "border-style": "solid",
    });
  });

  it("uses the resolver image-set when variants exist", () => {
    const set = 'image-set(url("blob:test/1") 1x, url("blob:test/2") 2x)';
    expect(
      serializeBrush(
        { kind: "brush", id: "photo" },
        { brushes, images: () => image({ set }) }
      )["background-image"]
    ).toBe(set);
  });

  it("degrades to no declarations when the image is unresolved", () => {
    expect(
      serializeBrush({ kind: "brush", id: "missing" }, { brushes, images })
    ).toEqual({});
    expect(
      serializeBrush({ kind: "brush", id: "unknown" }, { brushes, images })
    ).toEqual({});
  });
});

describe("serializeTextStyle", () => {
  const fonts = {
    ui: {
      fallback: "sansSerif",
      faces: [{ src: "assets/fonts/ui.woff2", weight: 400, style: "normal" }],
    },
    mono: { fallback: "monospace", faces: [] },
  };

  it("writes the host family name of a font reference", () => {
    const declarations = serializeTextStyle(
      { font: { ref: ReferenceKind.Font, id: "ui" }, size: 13 },
      { themeId: "classic-blue", fonts, shadows: {} }
    );
    expect(declarations["font-family"]).toBe(
      `"${themeFontFamilyName("classic-blue", "ui")}", sans-serif`
    );
    expect(declarations["font-size"]).toBe("13px");
  });

  it("writes only the generic fallback for a family without faces", () => {
    const declarations = serializeTextStyle(
      { font: { ref: ReferenceKind.Font, id: "mono" } },
      { themeId: "classic-blue", fonts, shadows: {} }
    );
    expect(declarations["font-family"]).toBe("monospace");
  });

  it("truncates and clamps to a line count", () => {
    const declarations = serializeTextStyle(
      { overflow: "truncate", maxLines: 3 },
      { themeId: "classic-blue", fonts, shadows: {} }
    );
    expect(declarations).toMatchObject({
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      display: "-webkit-box",
      "-webkit-box-orient": "vertical",
      "-webkit-line-clamp": "3",
    });
  });

  it("writes a text shadow from the first layer", () => {
    const declarations = serializeTextStyle(
      { shadow: { ref: ReferenceKind.Shadow, id: "glow" } },
      {
        themeId: "classic-blue",
        fonts,
        shadows: {
          glow: [
            {
              x: 0,
              y: 0,
              blur: 6,
              spread: 0,
              color: literal("#9ec3ff99"),
              inset: false,
            },
          ],
        },
      }
    );
    expect(declarations["text-shadow"]).toBe("0px 0px 6px #9ec3ff99");
  });

  it("ignores unknown properties", () => {
    expect(
      serializeTextStyle(
        { bogus: "value" },
        { themeId: "classic-blue", fonts, shadows: {} }
      )
    ).toEqual({});
  });

  it("never writes an author string through", () => {
    const declarations = serializeTextStyle(
      { transform: "uppercase", align: "end" },
      { themeId: "classic-blue", fonts, shadows: {} }
    );
    expect(declarations["text-transform"]).toBe("uppercase");
    expect(declarations["text-align"]).toBe("end");
  });
});

describe("serializeBrush without an image resolver", () => {
  it("returns no declarations for an image brush", () => {
    const brushes: Record<string, IRBrush> = {
      frame: { type: "image", image: "chrome-frame", fit: "stretch" },
    };
    expect(
      serializeBrush(
        { kind: "brush", id: "frame" },
        { brushes, images: noImages }
      )
    ).toEqual({});
  });
});
