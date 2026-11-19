import { describe, expect, it } from "vitest";
import { parseThemeXml } from "../parser";
import {
  CLASSIC_BLUE_THEME_FILE,
  classicBlueTheme,
} from "../testing/classicBlueTheme";
import { checkTheme } from "./checkTheme";
import { walkElements } from "./walkElements";

const palettes = `<Palettes><Palette scheme="dark"><Set slot="background" value="#000000" /><Set slot="foreground" value="#ffffff" /><Set slot="accent" value="#3d8bff" /><Set slot="border" value="#333333" /></Palette></Palettes>`;

const theme = (before: string, after = ""): string =>
  `<Theme xmlns="urn:wmm:theme:1" spec="1.0">${before}${palettes}${after}</Theme>`;

const check = (xml: string) => {
  const { root, issues } = parseThemeXml(xml, {
    file: CLASSIC_BLUE_THEME_FILE,
    root: "Theme",
    spec: "1.0",
  });
  expect(issues).toEqual([]);
  expect(walkElements(root!, CLASSIC_BLUE_THEME_FILE)).toEqual([]);
  return checkTheme(root!, CLASSIC_BLUE_THEME_FILE);
};

const codes = (xml: string): string[] => check(xml).map((issue) => issue.code);

const textStyles = (count: number): string =>
  `<TextStyles><TextStyle id="t0" size="12" />${Array.from(
    { length: count },
    (_, index) => `<TextStyle id="t${index + 1}" basedOn="@text/t${index}" />`
  ).join("")}</TextStyles>`;

describe("checkTheme", () => {
  it("accepts the classic-blue theme", () => {
    expect(check(classicBlueTheme)).toEqual([]);
  });

  it("reports E6011 for a repeated id within one reference kind", () => {
    expect(
      check(
        theme(
          `<Colors><Color id="blue" value="#0000ff" /><Color id="blue" value="#0000aa" /></Colors>`,
          `<Brushes><SolidBrush id="blue" color="@color/blue" /></Brushes>`
        )
      )
    ).toEqual([
      expect.objectContaining({
        code: "E6011",
        path: "/Theme/Colors/Color[2]",
        message: expect.stringContaining("/Theme/Colors/Color[1]"),
      }),
    ]);
  });

  it("reports E6010 for references that resolve to nothing", () => {
    const issues = check(
      theme(
        `<Colors><Color id="ice" value="@color/missing" /></Colors>`,
        `<Shadows><Shadow id="glow" color="@slot/glowColor" /></Shadows><PanelStyles><PanelStyle id="inset" padding="@length/gap 4" background="@slot/card" /></PanelStyles><Defaults panel="@panel/plain" />`
      )
    );
    expect(issues.map((issue) => issue.code)).toEqual([
      "E6010",
      "E6010",
      "E6010",
      "E6010",
    ]);
    expect(issues.map((issue) => issue.message)).toEqual([
      expect.stringContaining("@color/missing"),
      expect.stringContaining("@slot/glowColor"),
      expect.stringContaining("@length/gap"),
      expect.stringContaining("@panel/plain"),
    ]);
  });

  it("reports E4011 for each color in a reference cycle", () => {
    expect(
      check(
        theme(
          `<Colors><Color id="a" value="@color/b" /><Color id="b" value="@color/a" /><Color id="c" value="@color/a" /><Color id="d" value="@color/d" /></Colors>`
        )
      )
    ).toEqual([
      expect.objectContaining({
        code: "E4011",
        path: "/Theme/Colors/Color[1]",
      }),
      expect.objectContaining({
        code: "E4011",
        path: "/Theme/Colors/Color[2]",
      }),
      expect.objectContaining({
        code: "E4011",
        path: "/Theme/Colors/Color[4]",
      }),
    ]);
  });

  it("reports E6014 for missing required slots and repeated schemes", () => {
    const xml = `<Theme xmlns="urn:wmm:theme:1" spec="1.0"><Palettes><Palette scheme="dark"><Set slot="background" value="#000000" /><Set slot="accent" value="#3d8bff" /></Palette><Palette scheme="dark"><Set slot="background" value="#000000" /><Set slot="foreground" value="#ffffff" /><Set slot="accent" value="#3d8bff" /><Set slot="border" value="#333333" /></Palette></Palettes></Theme>`;
    expect(check(xml)).toEqual([
      expect.objectContaining({
        code: "E6014",
        path: "/Theme/Palettes/Palette[1]",
        message: expect.stringContaining("foreground, border"),
      }),
      expect.objectContaining({
        code: "E6014",
        path: "/Theme/Palettes/Palette[2]",
        message: expect.stringContaining("already declared"),
      }),
    ]);
  });

  it("reports E6015 for invalid State elements", () => {
    const buttons = `<ButtonStyles><ButtonStyle id="repeat"><State name="active" image="@image/a" /><State name="active" value="one" image="@image/a" /><State name="active" value="one" image="@image/a" /><State name="hover" value="one" /><State name="pressed" minWidth="40" /><State name="focused" thumbSize="14" /></ButtonStyle></ButtonStyles>`;
    const sliders = `<SliderStyles><SliderStyle id="seek" thickness="4"><State name="hover" thumbSize="14" /><State name="selected" /></SliderStyle></SliderStyles>`;
    const issues = check(
      theme(
        "",
        `<Images><Image id="a" src="assets/images/a.png" /></Images>${buttons}${sliders}`
      )
    );
    expect(issues.map((issue) => [issue.code, issue.path])).toEqual([
      ["E6015", "/Theme/ButtonStyles/ButtonStyle/State[3]"],
      ["E6015", "/Theme/ButtonStyles/ButtonStyle/State[4]"],
      ["E6015", "/Theme/ButtonStyles/ButtonStyle/State[5]"],
      ["E6015", "/Theme/ButtonStyles/ButtonStyle/State[6]"],
      ["E6015", "/Theme/SliderStyles/SliderStyle/State[2]"],
    ]);
  });

  it("reports E6016 for cross-attribute rules", () => {
    const text = `<TextStyles><TextStyle id="wrap" overflow="wrap" /><TextStyle id="ok" basedOn="@text/wrap" maxLines="2" /><TextStyle id="bad" maxLines="2" /></TextStyles>`;
    const brushes = `<Brushes><LinearGradient id="g"><Stop offset="0.5" color="#000000" /><Stop offset="0.2" color="#ffffff" /></LinearGradient></Brushes>`;
    const sliders = `<SliderStyles><SliderStyle id="s" thumb="image" /></SliderStyles>`;
    const fonts = `<Fonts>${Array.from(
      { length: 9 },
      (_, index) =>
        `<FontFamily id="f${index}" fallback="serif"><Face src="assets/fonts/a.woff2" /><Face src="assets/fonts/b.woff2" /></FontFamily>`
    ).join("")}</Fonts>`;
    const issues = check(theme("", `${fonts}${text}${brushes}${sliders}`));
    expect(issues.map((issue) => [issue.path, issue.message])).toEqual([
      [
        "/Theme/Fonts/FontFamily[9]",
        expect.stringContaining("8 font families"),
      ],
      [
        "/Theme/Fonts/FontFamily[9]/Face[1]",
        expect.stringContaining("16 font faces"),
      ],
      ["/Theme/TextStyles/TextStyle[3]", expect.stringContaining("maxLines")],
      ["/Theme/Brushes/LinearGradient/Stop[2]", expect.stringContaining("0.2")],
      [
        "/Theme/SliderStyles/SliderStyle",
        expect.stringContaining("thumbImage"),
      ],
    ]);
    expect(new Set(issues.map((issue) => issue.code))).toEqual(
      new Set(["E6016"])
    );
  });

  it("reports E6013 for basedOn cycles and chains deeper than 8", () => {
    expect(codes(theme("", textStyles(8)))).toEqual([]);
    expect(check(theme("", textStyles(9)))).toEqual([
      expect.objectContaining({
        code: "E6013",
        path: "/Theme/TextStyles/TextStyle[10]",
        message: expect.stringContaining("9 deep"),
      }),
    ]);
    expect(
      codes(
        theme(
          "",
          `<ButtonStyles><ButtonStyle id="a" basedOn="@button/b" /><ButtonStyle id="b" basedOn="@button/a" /></ButtonStyles>`
        )
      )
    ).toEqual(["E6013", "E6013"]);
  });
});

describe("checkTheme with layouts", () => {
  const LAYOUT_FILE = "layouts/desktop.xml";
  const layoutRoot = (body: string) => {
    const { root, issues } = parseThemeXml(
      `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop"><Shell><Stack>${body}</Stack></Shell></Layout>`,
      { file: LAYOUT_FILE, root: "Layout", spec: "1.0" }
    );
    expect(issues).toEqual([]);
    expect(walkElements(root!, LAYOUT_FILE)).toEqual([]);
    return root!;
  };
  const withLayout = (themeXml: string, body: string) => {
    const { root } = parseThemeXml(themeXml, {
      file: CLASSIC_BLUE_THEME_FILE,
      root: "Theme",
      spec: "1.0",
    });
    return checkTheme(root!, CLASSIC_BLUE_THEME_FILE, [
      { root: layoutRoot(body), file: LAYOUT_FILE },
    ]);
  };
  const repeatTheme = theme(
    "",
    `<Images><Image id="one" src="assets/images/one.png" /></Images><ButtonStyles><ButtonStyle id="repeat"><State name="active" value="one" image="@image/one" /></ButtonStyle><ButtonStyle id="repeat-big" basedOn="@button/repeat" minWidth="48" /></ButtonStyles><Defaults button="@button/repeat" />`
  );

  it("reports E6010 in the layout file for undeclared references", () => {
    expect(
      withLayout(
        classicBlueTheme,
        `<Button command="wmm.playback.next" labelKey="playback.next" icon="@icon/next" style="@button/transport" /><Panel style="@panel/missing" padding="@length/gap-sm @length/nope"><TrackList /></Panel>`
      )
    ).toEqual([
      expect.objectContaining({
        code: "E6010",
        file: LAYOUT_FILE,
        path: "/Layout/Shell/Stack/Panel",
        message: expect.stringContaining("@panel/missing"),
      }),
      expect.objectContaining({
        code: "E6010",
        message: expect.stringContaining("@length/nope"),
      }),
    ]);
  });

  it("reports E6104 at buttons whose style has an active value outside the command's domain", () => {
    const repeat = `<Button command="wmm.playback.toggleRepeat" labelKey="playback.repeat" style="@button/repeat-big" />`;
    const shuffle = `<Button command="wmm.playback.toggleShuffle" labelKey="playback.shuffle" style="@button/repeat" />`;
    const mute = `<Button command="wmm.playback.toggleMute" labelKey="playback.mute" />`;
    expect(withLayout(repeatTheme, repeat)).toEqual([]);
    expect(withLayout(repeatTheme, `${shuffle}${mute}`)).toEqual([
      expect.objectContaining({
        code: "E6104",
        file: LAYOUT_FILE,
        path: "/Layout/Shell/Stack/Button[1]",
        message: expect.stringContaining("only has on"),
      }),
      expect.objectContaining({
        code: "E6104",
        path: "/Layout/Shell/Stack/Button[2]",
        message: expect.stringContaining("no state values"),
      }),
    ]);
  });
});
