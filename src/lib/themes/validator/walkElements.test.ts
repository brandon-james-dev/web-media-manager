import { describe, expect, it } from "vitest";
import { parseThemeXml } from "../parser";
import type { ParseOptions } from "../parser";
import {
  CLASSIC_BLUE_THEME_FILE,
  classicBlueTheme,
} from "../testing/classicBlueTheme";
import { DESKTOP_SONGS_FILE, desktopSongs } from "../testing/desktopSongs";
import { walkElements } from "./walkElements";

const options: ParseOptions = {
  file: DESKTOP_SONGS_FILE,
  root: "Layout",
  spec: "1.0",
};

const versioned =
  'xmlns:v1_2="urn:wmm:theme:1.2" spec="1.0" formFactor="desktop"';

function layout(body: string, attributes = 'spec="1.0" formFactor="desktop"') {
  return `<Layout xmlns="urn:wmm:theme:1" ${attributes}>${body}</Layout>`;
}

function walk(xml: string) {
  const { root, issues } = parseThemeXml(xml, options);
  expect(issues).toEqual([]);
  return walkElements(root!, options.file);
}

function codes(xml: string) {
  return walk(xml).map((issue) => issue.code);
}

describe("walkElements", () => {
  it("accepts the wmm-default desktop Songs layout", () => {
    expect(walk(desktopSongs)).toEqual([]);
  });

  it("reports issues with file, position and path", () => {
    const xml = layout('<Shell>\n  <Stack color="red" /></Shell>');

    expect(walk(xml)).toEqual([
      {
        code: "E4002",
        severity: "error",
        file: "layouts/desktop.xml",
        line: 2,
        column: 3,
        path: "/Layout/Shell/Stack",
        message: "<Stack> has no color attribute.",
      },
    ]);
  });

  it("reports unknown elements and skips foreign subtrees", () => {
    expect(codes(layout("<Shell><Marquee /></Shell>"))).toEqual(["E4001"]);
    expect(
      codes(
        layout(
          '<Shell><x:Stack xmlns:x="urn:other"><Marquee /></x:Stack></Shell>'
        )
      )
    ).toEqual(["E4001"]);
  });

  it("reports unknown and namespaced attributes", () => {
    expect(codes(layout('<Shell><Stack color="red" /></Shell>'))).toEqual([
      "E4002",
    ]);
    expect(
      codes(layout('<Shell><Stack v1_2:gap="4" /></Shell>', versioned))
    ).toEqual(["E4002"]);
  });

  it("reports missing required attributes", () => {
    const [issue] = walk(
      layout('<Shell><Button labelKey="playback.next" /></Shell>')
    );

    expect(issue).toMatchObject({
      code: "E4003",
      message: "<Button> needs a command attribute.",
    });
    expect(codes(layout("<Shell><Stack /></Shell>", 'spec="1.0"'))).toEqual([
      "E4003",
    ]);
  });

  it("checks attribute values and names the attribute", () => {
    const [issue] = walk(
      layout(
        '<Shell><Button command="wmm.playback.next" labelKey="playback.next" display="big" /></Shell>'
      )
    );

    expect(issue.code).toBe("E4005");
    expect(issue.message).toMatch(/^display: /);
  });

  it("reports children not allowed under their parent", () => {
    expect(codes(layout("<Stack />"))).toEqual(["E4008"]);
    expect(
      codes(
        layout(
          '<Shell><Stack><Tab id="songs" titleKey="navigation.songs"><Stack /></Tab></Stack></Shell>'
        )
      )
    ).toEqual(["E4008"]);
  });

  it("reports child counts", () => {
    const oneTab =
      '<Tabs><Tab id="songs" titleKey="navigation.songs"><Stack /></Tab></Tabs>';

    expect(codes(layout("<Shell />"))).toEqual(["E4009"]);
    expect(codes(layout("<Shell><Stack /><Stack /></Shell>"))).toEqual([
      "E4009",
    ]);
    expect(codes(layout(`<Shell>${oneTab}</Shell>`))).toEqual(["E4009"]);
  });

  it("leaves widget children to the semantic stage", () => {
    expect(
      codes(layout("<Shell><TrackList><Stack /></TrackList></Shell>"))
    ).toEqual([]);
  });

  it("rejects reserved event, binding and animation syntax", () => {
    expect(codes(layout('<Shell><Stack onClick="x" /></Shell>'))).toEqual([
      "E4021",
    ]);
    expect(codes(layout("<Shell><Stack><Binding /></Stack></Shell>"))).toEqual([
      "E4022",
    ]);
    expect(
      codes(layout("<Shell><Stack><Storyboard /></Stack></Shell>"))
    ).toEqual(["E4023"]);
    expect(codes(layout('<Shell><Stack transition="fade" /></Shell>'))).toEqual(
      ["E4024"]
    );
  });

  it("drops elements and attributes with an ignorable prefix", () => {
    const ignorable = `${versioned} ignorable="v1_2"`;

    expect(
      codes(
        layout(
          '<Shell><v1_2:Marquee /><Stack v1_2:gap="4"><v1_2:Slider /></Stack></Shell>',
          ignorable
        )
      )
    ).toEqual([]);
  });
});

describe("walkElements on theme.xml", () => {
  const themeOptions: ParseOptions = {
    file: CLASSIC_BLUE_THEME_FILE,
    root: "Theme",
    spec: "1.0",
  };
  const palettes = `<Palettes><Palette scheme="dark"><Set slot="background" value="#000000" /><Set slot="foreground" value="#ffffff" /><Set slot="accent" value="#3d8bff" /><Set slot="border" value="#333333" /></Palette></Palettes>`;
  const theme = (body: string) =>
    `<Theme xmlns="urn:wmm:theme:1" spec="1.0">${body}</Theme>`;
  const walkTheme = (xml: string) => {
    const { root, issues } = parseThemeXml(xml, themeOptions);
    expect(issues).toEqual([]);
    return walkElements(root!, themeOptions.file);
  };
  const themeCodes = (body: string) =>
    walkTheme(theme(body)).map((issue) => issue.code);

  it("accepts the classic-blue theme", () => {
    expect(walkTheme(classicBlueTheme)).toEqual([]);
  });

  it("checks theme elements and attributes against THEME_ELEMENTS", () => {
    expect(themeCodes(`${palettes}<Shell />`)).toEqual(["E4001"]);
    expect(
      themeCodes(
        `${palettes}<Shadows><Shadow id="raised" x="40" color="#000000" /></Shadows>`
      )
    ).toEqual(["E4006"]);
    expect(
      themeCodes(`<Colors><Color id="navy" /></Colors>${palettes}`)
    ).toEqual(["E4003"]);
  });

  it("reports E4012 for sections out of order or repeated", () => {
    const issues = walkTheme(
      theme(`<Metrics />${palettes}<Colors /><Metrics />`)
    );
    expect(issues).toEqual([
      expect.objectContaining({
        code: "E4012",
        path: "/Theme/Palettes",
        message: expect.stringContaining("before <Metrics>"),
      }),
      expect.objectContaining({ code: "E4012", path: "/Theme/Colors" }),
      expect.objectContaining({
        code: "E4012",
        path: "/Theme/Metrics[2]",
        message: expect.stringContaining("more than once"),
      }),
    ]);
  });

  it("reports E4009 when Palettes is missing", () => {
    expect(themeCodes(`<Colors />`)).toEqual(["E4009"]);
  });
});
