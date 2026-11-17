import { describe, expect, it } from "vitest";
import { parseThemeXml, XML_LIMITS } from "./index";
import type { ParseOptions } from "./index";
import { DESKTOP_SONGS_FILE, desktopSongs } from "../testing/desktopSongs";

const options: ParseOptions = {
  file: DESKTOP_SONGS_FILE,
  root: "Layout",
  spec: "1.0",
};

function positionOf(xml: string, needle: string) {
  const lines = xml.split("\n");
  const index = lines.findIndex((line) => line.includes(needle));
  return { line: index + 1, column: lines[index].indexOf(needle) + 1 };
}

function layout(body: string, attributes = 'spec="1.0"') {
  return `<Layout xmlns="urn:wmm:theme:1" ${attributes}>${body}</Layout>`;
}

function codes(xml: string, parseOptions: ParseOptions = options) {
  return parseThemeXml(xml, parseOptions).issues.map((i) => i.code);
}

describe("parseThemeXml", () => {
  it("parses the wmm-default desktop Songs layout without issues", () => {
    const { root, issues } = parseThemeXml(desktopSongs, options);

    expect(issues).toEqual([]);
    expect(root?.local).toBe("Layout");
    expect(root?.uri).toBe("urn:wmm:theme:1");
    expect(root?.children.map((c) => c.name)).toEqual([
      "Shell",
      "Page",
      "Page",
      "Page",
      "Page",
      "Page",
    ]);
    expect(Object.keys(root?.attributes ?? {})).toEqual(["spec", "formFactor"]);
  });

  it("indexes paths only when siblings share a name", () => {
    const { root } = parseThemeXml(desktopSongs, options);
    const dock = root!.children[0].children[0];
    const header = dock.children[0];
    const sidebarButton = header.children[0].children[2].children[3];

    expect(dock.path).toBe("/Layout/Shell/DockPanel");
    expect(dock.children.map((c) => c.path)).toEqual([
      "/Layout/Shell/DockPanel/Panel[1]",
      "/Layout/Shell/DockPanel/Panel[2]",
      "/Layout/Shell/DockPanel/MetadataEditor",
      "/Layout/Shell/DockPanel/Panel[3]",
      "/Layout/Shell/DockPanel/PageHost",
    ]);
    expect(sidebarButton.path).toBe(
      "/Layout/Shell/DockPanel/Panel[1]/Grid/Stack[2]/Button[4]"
    );
    expect(sidebarButton.attributes.commandParameter.value).toBe("sidebar");
  });

  it("records 1-based positions at the element's <", () => {
    const { root } = parseThemeXml(desktopSongs, options);
    const page = root!.children[1];
    const trackList = page.children[0];

    expect(page).toMatchObject(positionOf(desktopSongs, "<Page "));
    expect(trackList).toMatchObject(positionOf(desktopSongs, "<TrackList"));
  });

  it("positions an element whose name ends a line", () => {
    const { root } = parseThemeXml(
      layout('<Shell>\n  <PageHost\n    dock="fill" /></Shell>'),
      options
    );

    expect(root!.children[0].children[0]).toMatchObject({ line: 2, column: 3 });
  });

  it("keeps namespaced attributes and drops namespace declarations", () => {
    const { root } = parseThemeXml(
      layout('<Shell v:x="1" />', 'xmlns:v="urn:wmm:theme:1.2" spec="1.0"'),
      options
    );
    const shell = root!.children[0];

    expect(Object.keys(root!.attributes)).toEqual(["spec"]);
    expect(shell.attributes["v:x"]).toMatchObject({
      local: "x",
      prefix: "v",
      uri: "urn:wmm:theme:1.2",
    });
  });

  it("reports malformed XML and returns no tree", () => {
    const result = parseThemeXml(layout("<Shell>"), options);

    expect(result.root).toBeUndefined();
    expect(result.issues[0]).toMatchObject({
      code: "E3001",
      severity: "error",
      file: "layouts/desktop.xml",
    });
  });

  it("reports entities beyond the predefined five", () => {
    expect(codes(layout('<Shell a="&amp;&lt;" />'))).toEqual([]);
    expect(codes(layout('<Shell a="&nbsp;" />'))).toContain("E3001");
  });

  it("rejects DOCTYPE, processing instructions and non-UTF-8 encodings", () => {
    expect(codes(`<!DOCTYPE Layout>${layout("")}`)).toContain("E3002");
    expect(codes(`<?xml-stylesheet href="a"?>${layout("")}`)).toContain(
      "E3003"
    );
    expect(
      codes(`<?xml version="1.0" encoding="ISO-8859-1"?>${layout("")}`)
    ).toContain("E3004");
  });

  it("enforces depth, element count and attribute length caps", () => {
    const deep =
      "<Stack>".repeat(XML_LIMITS.maxDepth) +
      "</Stack>".repeat(XML_LIMITS.maxDepth);
    const many = "<Stack />".repeat(XML_LIMITS.maxElements);
    const long = `<Shell a="${"x".repeat(XML_LIMITS.maxAttributeLength + 1)}" />`;

    expect(codes(layout(deep))).toEqual(["E3005"]);
    expect(codes(layout(many))).toEqual(["E3006"]);
    expect(codes(layout(long))).toEqual(["E3007"]);
  });

  it("rejects text content and CDATA", () => {
    expect(codes(layout("<Shell>hi</Shell>"))).toEqual(["E3008"]);
    expect(codes(layout("<Shell><![CDATA[x]]></Shell>"))).toEqual(["E3008"]);
  });

  it("checks the root element and namespace", () => {
    expect(codes(layout(""), { ...options, root: "Theme" })).toEqual(["E3009"]);
    expect(codes('<Layout xmlns="urn:other" spec="1.0" />')).toEqual(["E3009"]);
  });

  it("checks spec against the manifest", () => {
    const missing = parseThemeXml(layout("", ""), options).issues;

    expect(codes(layout("", 'spec="1.1"'))).toEqual(["E3010"]);
    expect(missing).toMatchObject([
      { code: "E3010", path: "/Layout/@spec", line: 1, column: 1 },
    ]);
  });
});
