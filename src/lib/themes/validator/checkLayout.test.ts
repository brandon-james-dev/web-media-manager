import { describe, expect, it } from "vitest";
import { parseThemeXml } from "../parser";
import { DESKTOP_SONGS_FILE, desktopSongs } from "../testing/desktopSongs";
import { checkLayout } from "./checkLayout";
import { walkElements } from "./walkElements";

const layout = (body: string, formFactor = "desktop"): string =>
  `<Layout xmlns="urn:wmm:theme:1" xmlns:v1_2="urn:wmm:theme:1.2" spec="1.0" ignorable="v1_2" formFactor="${formFactor}"><Shell>${body}</Shell></Layout>`;

const check = (xml: string, file = "layouts/desktop.xml") => {
  const { root, issues } = parseThemeXml(xml, {
    file,
    root: "Layout",
    spec: "1.0",
  });
  expect(issues).toEqual([]);
  expect(walkElements(root!, file)).toEqual([]);
  return checkLayout(root!, file);
};

const codes = (xml: string, file?: string): string[] =>
  check(xml, file).map((issue) => issue.code);

describe("checkLayout", () => {
  it("accepts a grid whose children fit", () => {
    const xml = layout(
      `<Grid columns="220 1* 2*" rows="auto 1*"><SearchBox row="0" column="0" columnSpan="3" scope="library" /><LibraryBrowser row="1" column="0" /><TrackList row="1" column="1" columnSpan="2" /></Grid>`
    );
    expect(codes(xml)).toEqual([]);
  });

  it("reports E6001 when formFactor does not match the file name", () => {
    const issues = check(layout("<PageHost />", "tablet"));
    expect(issues).toEqual([
      expect.objectContaining({
        code: "E6001",
        severity: "error",
        file: "layouts/desktop.xml",
        path: "/Layout",
        line: 1,
        column: 1,
      }),
    ]);
  });

  it("matches formFactor against the file name", () => {
    expect(codes(layout("<PageHost />", "tv"), "layouts/tv.xml")).toEqual([]);
  });

  it("reports E6041 for a cell outside the grid", () => {
    const xml = layout(
      `<Grid columns="auto 1*"><SearchBox column="2" scope="library" /></Grid>`
    );
    expect(check(xml)).toEqual([
      expect.objectContaining({
        code: "E6041",
        path: "/Layout/Shell/Grid/SearchBox",
      }),
    ]);
  });

  it("reports E6041 for a span past the last track", () => {
    const xml = layout(
      `<Grid columns="1* 1*" rows="auto 1*"><TrackList row="1" rowSpan="2" /></Grid>`
    );
    expect(codes(xml)).toEqual(["E6041"]);
  });

  it("treats omitted tracks as one 1* track", () => {
    expect(codes(layout(`<Grid><TrackList /></Grid>`))).toEqual([]);
    expect(codes(layout(`<Grid><TrackList row="1" /></Grid>`))).toEqual([
      "E6041",
    ]);
  });

  it("reports E6070 for a widget with children", () => {
    const xml = layout(`<TrackList><Text literal="Hi" /></TrackList>`);
    expect(check(xml)).toEqual([
      expect.objectContaining({
        code: "E6070",
        path: "/Layout/Shell/TrackList",
      }),
    ]);
  });

  it("accepts the desktop Songs fixture", () => {
    expect(check(desktopSongs, DESKTOP_SONGS_FILE)).toEqual([]);
  });

  it("reports E6020 for each navigate target that is not a page", () => {
    const xml = `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop"><Shell><Stack><Button command="wmm.ui.navigate" commandParameter="albums" labelKey="navigation.albums" /><Button command="wmm.ui.navigate" commandParameter="sync" labelKey="navigation.sync" /><PageHost /></Stack></Shell><Page id="songs" titleKey="navigation.songs"><TrackList /></Page></Layout>`;
    const issues = check(xml);
    expect(issues.map((issue) => issue.code)).toEqual(["E6020", "E6020"]);
    expect(issues.map((issue) => issue.message)).toEqual([
      expect.stringContaining('"albums"'),
      expect.stringContaining('"sync"'),
    ]);
  });

  it("accepts navigate targets that are declared pages", () => {
    const xml = `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop"><Shell><Stack><Button command="wmm.ui.navigate" commandParameter="songs" labelKey="navigation.songs" /><PageHost /></Stack></Shell><Page id="songs" titleKey="navigation.songs"><TrackList /></Page></Layout>`;
    expect(codes(xml)).toEqual([]);
  });

  it("reports E6050 for commands themes may not invoke", () => {
    const xml = layout(
      `<Stack><Button command="wmm.playback.playAll" labelKey="playback.play" /><Button command="wmm.scanning.clearLibrary" labelKey="playback.play" /><Button command="wmm.playback.previous" labelKey="playback.previous" /></Stack>`
    );
    expect(check(xml)).toEqual([
      expect.objectContaining({
        code: "E6050",
        path: "/Layout/Shell/Stack/Button[2]",
        message: expect.stringContaining("wmm.scanning.clearLibrary"),
      }),
      expect.objectContaining({
        code: "E6050",
        path: "/Layout/Shell/Stack/Button[3]",
        message: expect.stringContaining("wmm.playback.previous"),
      }),
    ]);
  });

  it("reports E6204 for togglePanel targets that are not collapsible panels", () => {
    const xml = layout(
      `<Stack><Button command="wmm.ui.togglePanel" commandParameter="sidebar" labelKey="playback.queue" /><Button command="wmm.ui.togglePanel" commandParameter="fixed" labelKey="playback.queue" /><Button command="wmm.ui.togglePanel" commandParameter="missing" labelKey="playback.queue" /><Button command="wmm.ui.togglePanel" labelKey="playback.queue" /><Panel id="sidebar" collapsible="true"><TrackList /></Panel><Panel id="fixed"><TrackList /></Panel></Stack>`
    );
    expect(check(xml)).toEqual([
      expect.objectContaining({
        code: "E6204",
        path: "/Layout/Shell/Stack/Button[2]",
        message: expect.stringContaining('"fixed"'),
      }),
      expect.objectContaining({
        code: "E6204",
        path: "/Layout/Shell/Stack/Button[3]",
        message: expect.stringContaining('"missing"'),
      }),
      expect.objectContaining({
        code: "E6105",
        path: "/Layout/Shell/Stack/Button[4]",
      }),
    ]);
  });

  it("reports E6105 for a commandParameter outside the command's domain", () => {
    const button = (command: string, parameter?: string): string =>
      `<Button command="${command}"${parameter === undefined ? "" : ` commandParameter="${parameter}"`} labelKey="playback.next" />`;
    const result = (command: string, parameter?: string): string[] =>
      codes(layout(button(command, parameter)));
    expect(result("wmm.playback.seekBy", "30")).toEqual([]);
    expect(result("wmm.playback.seekBy", "-300")).toEqual([]);
    expect(result("wmm.playback.next")).toEqual([]);
    expect(result("wmm.playback.seekBy", "0")).toEqual(["E6105"]);
    expect(result("wmm.playback.seekBy", "600")).toEqual(["E6105"]);
    expect(result("wmm.playback.seekBy", "1.5")).toEqual(["E6105"]);
    expect(result("wmm.playback.seekBy")).toEqual(["E6105"]);
    expect(result("wmm.playback.next", "1")).toEqual(["E6105"]);
    expect(check(layout(button("wmm.playback.seekBy", "600")))).toEqual([
      expect.objectContaining({
        code: "E6105",
        path: "/Layout/Shell/Button",
        message: expect.stringContaining("-300 to 300, not 0"),
      }),
    ]);
  });

  it("reports E6030 for a parent-specific attribute under the wrong parent", () => {
    const xml = layout(
      `<Stack><TrackList row="1" grow="1" /><DockPanel><SearchBox dock="top" scope="library" /><TrackList grow="2" /></DockPanel></Stack>`
    );
    expect(check(xml)).toEqual([
      expect.objectContaining({
        code: "E6030",
        path: "/Layout/Shell/Stack/TrackList",
        message: expect.stringContaining("row"),
      }),
      expect.objectContaining({
        code: "E6030",
        path: "/Layout/Shell/Stack/DockPanel/TrackList",
        message: expect.stringContaining("grow"),
      }),
    ]);
  });

  it("reports E6201 for libraryMode outside the Shell and library pages", () => {
    const xml = `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop"><Shell><Stack><TrackList libraryMode="playback" /><PageHost /></Stack></Shell><Page id="songs" role="library" titleKey="navigation.songs"><MetadataEditor libraryMode="edit" mode="full" /></Page><Page id="albums" role="albums" titleKey="navigation.albums"><Stack><TrackList libraryMode="edit" /></Stack></Page><Page id="now" role="nowPlaying" titleKey="playback.nowPlaying"><Stack><TrackList libraryMode="playback" /><NowPlaying transport="true" /></Stack></Page><Page id="other" titleKey="navigation.sync"><TrackList libraryMode="edit" /></Page></Layout>`;
    expect(check(xml)).toEqual([
      expect.objectContaining({
        code: "E6201",
        path: "/Layout/Page[3]/Stack/TrackList",
      }),
      expect.objectContaining({
        code: "E6201",
        path: "/Layout/Page[4]/TrackList",
      }),
    ]);
  });

  it("reports E6202 for TrackList options the variant does not support", () => {
    expect(
      codes(layout(`<TrackList variant="table" columns="title duration" />`))
    ).toEqual([]);
    expect(
      check(
        layout(`<TrackList variant="list" sortBy="title" scrubber="true" />`)
      )
    ).toEqual([
      expect.objectContaining({
        code: "E6202",
        path: "/Layout/Shell/TrackList",
      }),
    ]);
    expect(
      codes(
        layout(`<TrackList variant="tv" scrubber="false" />`, "tv"),
        "layouts/tv.xml"
      )
    ).toEqual(["E6202"]);
  });

  it("treats the albums variant like table for its options", () => {
    expect(
      codes(
        layout(
          `<TrackList variant="albums" columns="track title duration" sortBy="title" />`
        )
      )
    ).toEqual([]);
    expect(
      codes(layout(`<TrackList variant="albums" fields="artwork artist" />`))
    ).toEqual(["E6202"]);
  });

  it("uses the form factor's default TrackList variant for E6202", () => {
    expect(codes(layout(`<TrackList fields="artwork artist" />`))).toEqual([
      "E6202",
    ]);
    expect(
      codes(
        layout(`<TrackList fields="artwork artist" />`, "tablet"),
        "layouts/tablet.xml"
      )
    ).toEqual([]);
    expect(
      codes(
        layout(`<TrackList alternateRows="true" />`, "tv"),
        "layouts/tv.xml"
      )
    ).toEqual([]);
  });

  it("reports E6203 for sortBy outside columns", () => {
    expect(
      codes(layout(`<TrackList columns="title artist" sortBy="artist" />`))
    ).toEqual([]);
    expect(codes(layout(`<TrackList sortBy="year" />`))).toEqual([]);
    expect(
      check(layout(`<TrackList columns="title artist" sortBy="year" />`))
    ).toEqual([
      expect.objectContaining({
        code: "E6203",
        path: "/Layout/Shell/TrackList",
      }),
    ]);
    expect(codes(layout(`<TrackList sortBy="source" />`))).toEqual(["E6203"]);
  });

  it("reports E6205 for collection headers on a page without a TrackList", () => {
    const header = `<CollectionSummary fields="title count" /><Button command="wmm.playback.playAll" labelKey="playback.play" />`;
    const xml = `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop"><Shell><PageHost /></Shell><Page id="songs" role="library" titleKey="navigation.songs"><Stack>${header}<TrackList /></Stack></Page><Page id="sync" titleKey="navigation.sync"><Stack>${header}</Stack></Page></Layout>`;
    expect(check(xml)).toEqual([
      expect.objectContaining({
        code: "E6205",
        path: "/Layout/Page[2]/Stack/CollectionSummary",
      }),
      expect.objectContaining({
        code: "E6205",
        path: "/Layout/Page[2]/Stack/Button",
      }),
    ]);
  });

  it("reports E6206 for library-only options on a sync SearchBox", () => {
    expect(
      codes(
        layout(
          `<SearchBox scope="library" sourceFilter="true" resultCount="false" />`
        )
      )
    ).toEqual([]);
    expect(
      check(
        layout(
          `<SearchBox scope="sync" sourceFilter="true" resultCount="false" />`
        )
      )
    ).toEqual([
      expect.objectContaining({
        code: "E6206",
        path: "/Layout/Shell/SearchBox",
      }),
      expect.objectContaining({ code: "E6206" }),
    ]);
  });

  it("warns W6207 for a collapsible Panel no togglePanel button can open", () => {
    const toggle = `<Button command="wmm.ui.togglePanel" commandParameter="sidebar" labelKey="playback.queue" />`;
    const panel = (inner = ""): string =>
      `<Panel id="sidebar" collapsible="true"><Stack><TrackList />${inner}</Stack></Panel>`;
    expect(codes(layout(`<Stack>${toggle}${panel()}</Stack>`))).toEqual([]);
    expect(check(layout(`<Stack>${panel(toggle)}</Stack>`))).toEqual([
      expect.objectContaining({
        code: "W6207",
        severity: "warning",
        path: "/Layout/Shell/Stack/Panel",
        message: expect.stringContaining('id="sidebar"'),
      }),
    ]);
    expect(codes(layout(`<Stack>${panel()}</Stack>`))).toEqual(["W6207"]);
  });

  it("warns W6208 for a TrackList variant that does not fit the form factor", () => {
    const list = (variant: string, formFactor: string): string[] =>
      codes(
        layout(`<TrackList variant="${variant}" />`, formFactor),
        `layouts/${formFactor}.xml`
      );
    expect(list("table", "desktop")).toEqual([]);
    expect(list("table", "tablet")).toEqual([]);
    expect(list("albums", "mobile")).toEqual(["W6208"]);
    expect(list("list", "mobile")).toEqual([]);
    expect(list("tv", "tv")).toEqual([]);
    expect(list("table", "mobile")).toEqual(["W6208"]);
    expect(list("table", "tv")).toEqual(["W6208"]);
    expect(list("tv", "desktop")).toEqual(["W6208"]);
    expect(
      check(
        layout(`<TrackList variant="tv" />`, "tablet"),
        "layouts/tablet.xml"
      )
    ).toEqual([
      expect.objectContaining({
        code: "W6208",
        severity: "warning",
        path: "/Layout/Shell/TrackList",
      }),
    ]);
  });

  it("warns W6209 for an edit toggle with no edit-mode MetadataEditor", () => {
    const toggle = `<Button command="wmm.ui.toggleEditMode" labelKey="common.edit" />`;
    expect(
      codes(
        layout(
          `<Stack>${toggle}<MetadataEditor libraryMode="edit" mode="full" /></Stack>`
        )
      )
    ).toEqual([]);
    expect(
      codes(
        layout(
          `<Stack>${toggle}<Panel libraryMode="edit"><MetadataEditor mode="full" /></Panel></Stack>`
        )
      )
    ).toEqual([]);
    expect(
      check(layout(`<Stack>${toggle}<MetadataEditor mode="full" /></Stack>`))
    ).toEqual([
      expect.objectContaining({
        code: "W6209",
        severity: "warning",
        path: "/Layout/Shell/Stack/Button",
      }),
    ]);
  });

  it("warns W6210 for a resizable Panel docked to neither start nor end", () => {
    const panel = (dock: string): string =>
      `<Panel id="nav" dock="${dock}" resizable="true"><TrackList /></Panel>`;
    const body = (dock: string): string =>
      `<DockPanel>${panel(dock)}<PageHost dock="fill" /></DockPanel>`;
    expect(codes(layout(body("start")))).toEqual([]);
    expect(codes(layout(body("end")))).toEqual([]);
    expect(check(layout(body("top")))).toEqual([
      expect.objectContaining({
        code: "W6210",
        severity: "warning",
        path: "/Layout/Shell/DockPanel/Panel",
      }),
    ]);
  });

  it("reports E6095 for text-entry widgets in the tv layout", () => {
    const body = `<Stack><SearchBox scope="library" /><MetadataEditor mode="quick" /></Stack>`;
    expect(codes(layout(body, "tablet"), "layouts/tablet.xml")).toEqual([]);
    expect(check(layout(body, "tv"), "layouts/tv.xml")).toEqual([
      expect.objectContaining({
        code: "E6095",
        severity: "error",
        path: "/Layout/Shell/Stack/SearchBox",
      }),
      expect.objectContaining({
        code: "E6095",
        path: "/Layout/Shell/Stack/MetadataEditor",
      }),
    ]);
  });

  it("reports E6101 and E6103 for nowPlaying-only attributes elsewhere", () => {
    const page = (id: string, role: string, extra = ""): string =>
      `<Page id="${id}" role="${role}" titleKey="playback.nowPlaying"${extra}><Stack idleHide="true"><TrackList /><NowPlaying transport="true" /></Stack></Page>`;
    const xml = (pages: string): string =>
      `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop"><Shell><PageHost /></Shell>${pages}</Layout>`;
    expect(codes(xml(page("now", "nowPlaying", ` openOnPlay="true"`)))).toEqual(
      []
    );
    expect(
      check(
        xml(
          `<Page id="songs" role="library" titleKey="library.songs" openOnPlay="true"><TrackList idleHide="true" /></Page>`
        )
      )
    ).toEqual([
      expect.objectContaining({ code: "E6103", path: "/Layout/Page" }),
      expect.objectContaining({
        code: "E6101",
        path: "/Layout/Page/TrackList",
      }),
    ]);
    expect(
      codes(layout(`<Stack idleHide="true"><TrackList /></Stack>`))
    ).toEqual(["E6101"]);
  });

  it("reports E6102 for an overlay page that is not nowPlaying", () => {
    const xml = (role: string, presentation: string): string =>
      `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop"><Shell><PageHost /></Shell><Page id="p" role="${role}" titleKey="playback.nowPlaying" presentation="${presentation}"><Stack><NowPlaying transport="true" /><Button command="wmm.ui.closeNowPlaying" labelKey="playback.closeNowPlaying" /></Stack></Page></Layout>`;
    expect(codes(xml("nowPlaying", "overlay"))).toEqual([]);
    expect(codes(xml("library", "page"))).toEqual([]);
    expect(check(xml("library", "overlay"))).toEqual([
      expect.objectContaining({
        code: "E6102",
        severity: "error",
        path: "/Layout/Page",
      }),
    ]);
  });

  it("reports E6107 and W6107 for an overlay Now Playing page with no close button", () => {
    const close = `<Button command="wmm.ui.closeNowPlaying" labelKey="playback.closeNowPlaying" />`;
    const xml = (
      formFactor: string,
      inPage: string,
      inShell = "",
      presentation = "overlay"
    ): string =>
      `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="${formFactor}"><Shell><Stack><PageHost />${inShell}</Stack></Shell><Page id="now" role="nowPlaying" titleKey="playback.nowPlaying" presentation="${presentation}"><Stack><NowPlaying transport="true" />${inPage}</Stack></Page></Layout>`;
    const result = (formFactor: string, ...rest: string[]): string[] =>
      codes(
        xml(formFactor, rest[0] ?? "", rest[1], rest[2]),
        `layouts/${formFactor}.xml`
      );
    expect(result("mobile", close)).toEqual([]);
    expect(result("tv", "")).toEqual([]);
    expect(result("tablet", "", "", "page")).toEqual([]);
    expect(result("tablet", "")).toEqual(["E6107"]);
    expect(result("mobile", "", close)).toEqual(["E6107"]);
    expect(check(xml("desktop", ""), "layouts/desktop.xml")).toEqual([
      expect.objectContaining({
        code: "W6107",
        severity: "warning",
        path: "/Layout/Page",
      }),
    ]);
  });

  it("warns W6108 for a VolumeControl in the tv layout", () => {
    const body = `<VolumeControl />`;
    expect(codes(layout(body, "desktop"))).toEqual([]);
    expect(check(layout(body, "tv"), "layouts/tv.xml")).toEqual([
      expect.objectContaining({
        code: "W6108",
        severity: "warning",
        path: "/Layout/Shell/VolumeControl",
      }),
    ]);
  });

  it("warns W6109 for a Now Playing page with no play/pause control", () => {
    const xml = (inner: string): string =>
      `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tv"><Shell><PageHost /></Shell><Page id="now" role="nowPlaying" titleKey="playback.nowPlaying"><Stack>${inner}</Stack></Page></Layout>`;
    const result = (inner: string): string[] =>
      codes(xml(inner), "layouts/tv.xml");
    expect(result(`<NowPlaying transport="true" />`)).toEqual([]);
    expect(
      result(
        `<NowPlaying /><Button command="wmm.playback.playpause" labelKey="playback.playPause" />`
      )
    ).toEqual([]);
    expect(result(`<NowPlaying transport="false" />`)).toEqual(["W6109"]);
    expect(
      result(`<NowPlaying variant="indicator" transport="true" />`)
    ).toEqual(["W6109"]);
    expect(check(xml(`<NowPlaying />`), "layouts/tv.xml")).toEqual([
      expect.objectContaining({
        code: "W6109",
        severity: "warning",
        path: "/Layout/Page",
      }),
    ]);
  });

  it("counts a Shell play/pause for W6109 unless the page is an overlay", () => {
    const xml = (presentation: string): string =>
      `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop"><Shell><Stack><Button command="wmm.playback.playpause" labelKey="playback.playPause" /><PageHost /></Stack></Shell><Page id="now" role="nowPlaying" titleKey="playback.nowPlaying"${presentation}><Stack><NowPlaying /><Button command="wmm.ui.closeNowPlaying" labelKey="playback.nowPlaying" /></Stack></Page></Layout>`;
    expect(codes(xml(""), "layouts/desktop.xml")).toEqual([]);
    expect(codes(xml(` presentation="page"`), "layouts/desktop.xml")).toEqual(
      []
    );
    expect(
      codes(xml(` presentation="overlay"`), "layouts/desktop.xml")
    ).toEqual(["W6109"]);
  });

  it("warns W6110 for an edge SeekBar outside a Panel or Grid", () => {
    expect(
      codes(
        layout(
          `<Panel><Grid rows="auto auto"><SeekBar row="0" variant="edge" /><TrackList row="1" /></Grid></Panel>`
        )
      )
    ).toEqual([]);
    expect(codes(layout(`<Panel><SeekBar variant="edge" /></Panel>`))).toEqual(
      []
    );
    expect(codes(layout(`<Stack><SeekBar variant="bar" /></Stack>`))).toEqual(
      []
    );
    expect(check(layout(`<Stack><SeekBar variant="edge" /></Stack>`))).toEqual([
      expect.objectContaining({
        code: "W6110",
        severity: "warning",
        path: "/Layout/Shell/Stack/SeekBar",
      }),
    ]);
  });

  it("reports E6106 for a second nowPlaying page", () => {
    const xml = `<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop"><Shell><PageHost /></Shell><Page id="a" role="nowPlaying" titleKey="playback.nowPlaying"><NowPlaying transport="true" /></Page><Page id="b" role="nowPlaying" titleKey="playback.nowPlaying"><NowPlaying transport="true" /></Page></Layout>`;
    expect(check(xml)).toEqual([
      expect.objectContaining({ code: "E6106", path: "/Layout/Page[2]" }),
    ]);
  });

  it("reports E6106 for Tabs outside 2 to 8 tabs", () => {
    const tab = (id: string): string =>
      `<Tab id="${id}" titleKey="navigation.songs"><TrackList /></Tab>`;
    const tabs = (count: number): string =>
      layout(
        `<Tabs>${Array.from({ length: count }, (_, i) => tab(`t${i}`)).join("")}<TabStripEnd><SearchBox scope="library" /></TabStripEnd></Tabs>`
      );
    expect(codes(tabs(2))).toEqual([]);
    expect(codes(tabs(8))).toEqual([]);
    expect(codes(tabs(1))).toEqual(["E6106"]);
  });

  it("skips ignorable children", () => {
    const xml = layout(
      `<Grid columns="1*"><TrackList><v1_2:Badge /></TrackList><v1_2:Meter column="5" /></Grid>`
    );
    expect(codes(xml)).toEqual([]);
  });

  it("accepts the TrackInfo fields and trailing values", () => {
    const xml = layout(
      `<TrackInfo fields="title genre year" trailing="elapsedAndTotal" />`
    );
    expect(codes(xml)).toEqual([]);
  });

  it("reports E4005 for a trailing value outside the field list", () => {
    const xml = layout(`<TrackInfo trailing="bogus" />`);
    const { root, issues } = parseThemeXml(xml, {
      file: "layouts/desktop.xml",
      root: "Layout",
      spec: "1.0",
    });
    expect(issues).toEqual([]);
    expect(
      walkElements(root!, "layouts/desktop.xml").map((issue) => issue.code)
    ).toEqual(["E4005"]);
  });
});
