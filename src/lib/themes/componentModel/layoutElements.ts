import { COMMON_ATTRIBUTES } from "./commonAttributes";
import {
  ALIGN_VALUES,
  DISPLAY_VALUES,
  LAYOUT_LIST,
  NO_CHILDREN,
  OPTIONAL_LAYOUT,
  SINGLE_LAYOUT,
  THEME_SPEC_VERSION,
} from "./constants";
import { ElementCategory } from "./elementCategory";
import { FORM_FACTOR_VALUES } from "./formFactorValues";
import { ReferenceKind } from "./referenceKind";
import { TRACK_COLUMN_VALUES } from "./trackColumnValues";
import type { ElementDef } from "./types";
import { ValueType } from "./valueType";
import { WIDGET_ATTRIBUTES } from "./widgetAttributes";

/**
 * The song fields a `TrackInfo` can show. These are the allowed values of its
 * `fields` and `trailing` attributes (ordered, space-separated subsets; a
 * field listed twice is `E4004`, an unknown field is `E4005`). The time
 * fields `elapsed`, `total`, `remaining` and `elapsedAndTotal` read the
 * playback clock and show `--:--` while the duration is unknown.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title artist" trailing="elapsedAndTotal" />
 * ```
 * @example
 * ```ts
 * const values: readonly string[] = TRACK_INFO_FIELDS;
 * const timed = values.includes("elapsedAndTotal");
 * ```
 */
export const TRACK_INFO_FIELDS = [
  "title",
  "explicit",
  "favorite",
  "artist",
  "album",
  "albumArtist",
  "genre",
  "year",
  "track",
  "disc",
  "bitrate",
  "elapsed",
  "total",
  "remaining",
  "elapsedAndTotal",
] as const;

/**
 * Every element a v1 layout file may contain, keyed by its exact XML element
 * name. The validator reads each definition to check category, attributes,
 * children, parents, minimum size and per-page cardinality. A name missing
 * from this table is an unknown element.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell>
 *     <DockPanel>
 *       <LibraryBrowser dock="start" width="220" />
 *       <TrackList dock="fill" />
 *     </DockPanel>
 *   </Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * const def = getElementDef(node.name);
 * if (!def) {
 *   reportUnknownElement(node);
 * }
 * ```
 */
export const LAYOUT_ELEMENTS: Readonly<Record<string, ElementDef>> = {
  /**
   * The root of every layout file. `spec` must match the manifest (`E3010`)
   * and `formFactor` must match the file name (`E6001`). Holds one `Shell`
   * and any number of `Page` elements.
   *
   * @example
   * ```xml
   * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tablet">
   *   <Shell>
   *     <PageHost />
   *   </Shell>
   *   <Page id="library" role="library" titleKey="navigation.library" default="true">
   *     <TrackList />
   *   </Page>
   * </Layout>
   * ```
   * @example
   * ```ts
   * const formFactor = root.attributes.formFactor;
   * if (`layouts/${formFactor}.xml` !== layoutPath) {
   *   issues.push({ code: "E6001", attribute: "formFactor" });
   * }
   * ```
   */
  Layout: {
    name: "Layout",
    category: ElementCategory.Root,
    attributes: {
      spec: { type: ValueType.String, required: true },
      formFactor: {
        type: ValueType.Enum,
        values: FORM_FACTOR_VALUES,
        required: true,
      },
    },
    children: { min: 1, max: null, allowed: ["Shell", "Page"] },
    since: THEME_SPEC_VERSION,
  },
  /**
   * The always-visible part of a layout, with exactly one root element. When
   * the layout declares pages, the Shell must contain exactly one `PageHost`.
   *
   * @example
   * ```xml
   * <Shell>
   *   <DockPanel>
   *     <Panel dock="bottom" height="72" style="@panel/chrome" />
   *     <PageHost dock="fill" />
   *   </DockPanel>
   * </Shell>
   * ```
   * @example
   * ```ts
   * const shell = LAYOUT_ELEMENTS.Shell;
   * shell.parents; // ["Layout"]
   * shell.children; // SINGLE_LAYOUT
   * ```
   */
  Shell: {
    name: "Shell",
    category: ElementCategory.Structure,
    attributes: {},
    children: SINGLE_LAYOUT,
    parents: ["Layout"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * A page with exactly one root element, rendered in the Shell's `PageHost`.
   * `id` is the `wmm.ui.navigate` parameter (`E6020` when a button names a
   * missing id). `role` tells the host which page answers an app navigation
   * intent. `presentation="overlay"` covers the Shell and is only allowed on
   * the `nowPlaying` role, as is `openOnPlay` (`E6103`).
   *
   * @example
   * ```xml
   * <Page id="now-playing" role="nowPlaying" titleKey="playback.nowPlaying"
   *       presentation="overlay" openOnPlay="true">
   *   <NowPlaying />
   * </Page>
   * ```
   * @example
   * ```ts
   * const pageIds = new Set(
   *   pages.map((page) => page.attributes.id)
   * );
   * if (!pageIds.has(button.attributes.commandParameter)) {
   *   issues.push({ code: "E6020", attribute: "commandParameter" });
   * }
   * ```
   */
  Page: {
    name: "Page",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      titleKey: { type: ValueType.ResourceKey, required: true },
      role: {
        type: ValueType.Enum,
        values: [
          "library",
          "artists",
          "albums",
          "playlists",
          "nowPlaying",
          "sync",
        ],
      },
      default: { type: ValueType.Boolean },
      presentation: {
        type: ValueType.Enum,
        values: ["page", "overlay"],
        default: "page",
      },
      openOnPlay: { type: ValueType.Boolean },
    },
    children: SINGLE_LAYOUT,
    parents: ["Layout"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * The slot inside the Shell where the current page renders. Takes only the
   * common layout attributes and has no children.
   *
   * @example
   * ```xml
   * <PageHost dock="fill" margin="8" />
   * ```
   * @example
   * ```ts
   * const hosts = shellDescendants.filter((node) => node.name === "PageHost");
   * if (hosts.length > 1 || (pages.length > 0 && hosts.length === 0)) {
   *   reportSpecMismatch(shell);
   * }
   * ```
   */
  PageHost: {
    name: "PageHost",
    category: ElementCategory.Structure,
    attributes: { ...COMMON_ATTRIBUTES },
    children: NO_CHILDREN,
    since: THEME_SPEC_VERSION,
  },
  /**
   * A decorated container with zero or one child. `style` names a
   * `@panel/` style, and the inline attributes override single properties of
   * it. A `collapsible` panel starts closed, needs an `id`, and opens with
   * `wmm.ui.togglePanel` (`E6204` when the target is not a collapsible
   * Panel). A `resizable` panel docked to `start` or `end` gets a drag handle
   * on its inner edge. A `hideInFullscreen` panel renders nothing while the
   * document is in full screen.
   *
   * @example
   * ```xml
   * <Panel id="editor-panel" style="@panel/chrome" padding="8" collapsible="true">
   *   <MetadataEditor mode="quick" />
   * </Panel>
   * ```
   * @example
   * ```ts
   * const panel = LAYOUT_ELEMENTS.Panel;
   * panel.attributes.style.refKinds; // [ReferenceKind.Panel]
   * panel.attributes.collapsible.default; // "false"
   * panel.attributes.resizable.default; // "false"
   * panel.attributes.hideInFullscreen.default; // "false"
   * ```
   */
  Panel: {
    name: "Panel",
    category: ElementCategory.Primitive,
    attributes: {
      ...COMMON_ATTRIBUTES,
      style: { type: ValueType.Reference, refKinds: [ReferenceKind.Panel] },
      background: {
        type: ValueType.Brush,
        refKinds: [
          ReferenceKind.Brush,
          ReferenceKind.Slot,
          ReferenceKind.Color,
        ],
      },
      border: {
        type: ValueType.Color,
        refKinds: [ReferenceKind.Color, ReferenceKind.Slot],
      },
      borderWidth: { type: ValueType.Thickness },
      cornerRadius: { type: ValueType.CornerRadius },
      padding: { type: ValueType.Thickness },
      shadow: { type: ValueType.Reference, refKinds: [ReferenceKind.Shadow] },
      collapsible: { type: ValueType.Boolean, default: "false" },
      resizable: { type: ValueType.Boolean, default: "false" },
      /**
       * Whether the panel is left out while the document is in full screen,
       * so chrome such as a tab strip or a transport bar can step aside.
       */
      hideInFullscreen: { type: ValueType.Boolean, default: "false" },
    },
    children: OPTIONAL_LAYOUT,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Arranges children in a line. `align` is the cross axis, `justify` the
   * main axis, and `wrap` only applies when horizontal. Children may set
   * `grow` to share leftover space.
   *
   * @example
   * ```xml
   * <Stack orientation="horizontal" gap="4" align="center" justify="spaceBetween">
   *   <Text resourceKey="library.songs" style="@text/title" />
   *   <SearchBox grow="1" />
   * </Stack>
   * ```
   * @example
   * ```ts
   * LAYOUT_ELEMENTS.Stack.attributes.orientation.default; // "vertical"
   * ```
   */
  Stack: {
    name: "Stack",
    category: ElementCategory.Primitive,
    attributes: {
      ...COMMON_ATTRIBUTES,
      orientation: {
        type: ValueType.Enum,
        values: ["horizontal", "vertical"],
        default: "vertical",
      },
      gap: { type: ValueType.Length },
      align: { type: ValueType.Enum, values: ALIGN_VALUES },
      justify: {
        type: ValueType.Enum,
        values: ["start", "center", "end", "spaceBetween"],
      },
      overflow: { type: ValueType.Enum, values: ["clip", "scroll"] },
      wrap: { type: ValueType.Boolean },
    },
    children: LAYOUT_LIST,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Docks children to its edges in document order and gives the remaining
   * space to the `fill` child. At most one child fills; with none marked,
   * the last child fills. `start` and `end` follow reading direction.
   *
   * @example
   * ```xml
   * <DockPanel>
   *   <Panel dock="top" height="56" />
   *   <Panel dock="start" width="220" />
   *   <TrackList dock="fill" />
   * </DockPanel>
   * ```
   * @example
   * ```ts
   * const fills = node.children.filter(
   *   (child) => child.attributes.dock === "fill"
   * );
   * const fillChild = fills[0] ?? node.children.at(-1);
   * ```
   */
  DockPanel: {
    name: "DockPanel",
    category: ElementCategory.Primitive,
    attributes: { ...COMMON_ATTRIBUTES },
    children: LAYOUT_LIST,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Places children in cells of 1–12 columns and 1–12 rows. Each track is a
   * Length, `auto`, or a star share `N*` (N = 1–100); an omitted list means
   * one `1*` track. A child's cell and span must lie inside the grid
   * (`E6041`). Overlapping children are allowed, later ones on top.
   *
   * @example
   * ```xml
   * <Grid columns="220 1* 2*" rows="auto 1*" columnGap="4" rowGap="4">
   *   <SearchBox row="0" column="0" columnSpan="3" />
   *   <LibraryBrowser row="1" column="0" />
   *   <TrackList row="1" column="1" columnSpan="2" />
   * </Grid>
   * ```
   * @example
   * ```ts
   * if (column + columnSpan > columnCount || row + rowSpan > rowCount) {
   *   issues.push({ code: "E6041", element: child.name });
   * }
   * ```
   */
  Grid: {
    name: "Grid",
    category: ElementCategory.Primitive,
    attributes: {
      ...COMMON_ATTRIBUTES,
      columns: { type: ValueType.GridTracks },
      rows: { type: ValueType.GridTracks },
      columnGap: { type: ValueType.Length },
      rowGap: { type: ValueType.Length },
    },
    children: LAYOUT_LIST,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Switches between 2–8 `Tab` panels (`E6106`), with an optional
   * `TabStripEnd` drawn at the end of the strip. `tabStyle` names a
   * `@button/` style, and the host applies `selected` to the current tab.
   * Hidden panels stay unmounted, except a `Visualizer`, which is paused.
   * The strip's start holds the controls the selected tab's widget places
   * there, such as a `Visualizer`'s picker and settings. A `hideInFullscreen`
   * strip steps aside in full screen while the selected tab's content stays,
   * and a `TabStripEnd` stays visible while the tabs step aside.
   *
   * @example
   * ```xml
   * <Tabs strip="top" stripAlign="center" tabStyle="@button/tab">
   *   <Tab id="queue" titleKey="playback.queue" icon="@icon/queue">
   *     <PlayQueue />
   *   </Tab>
   *   <Tab id="lyrics" titleKey="playback.lyrics" icon="@icon/lyrics">
   *     <Lyrics />
   *   </Tab>
   * </Tabs>
   * ```
   * @example
   * ```ts
   * const tabs = node.children.filter((child) => child.name === "Tab");
   * if (tabs.length < 2 || tabs.length > 8) {
   *   issues.push({ code: "E6106", element: "Tabs" });
   * }
   * ```
   */
  Tabs: {
    name: "Tabs",
    category: ElementCategory.Primitive,
    attributes: {
      ...COMMON_ATTRIBUTES,
      strip: {
        type: ValueType.Enum,
        values: ["top", "bottom", "start", "end"],
      },
      stripAlign: { type: ValueType.Enum, values: ["start", "center", "end"] },
      tabStyle: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
      display: {
        type: ValueType.Enum,
        values: DISPLAY_VALUES,
        default: "iconAndLabel",
      },
      /**
       * Whether the tab strip is left out while the document is in full
       * screen, so the selected tab's content keeps the whole window.
       */
      hideInFullscreen: { type: ValueType.Boolean, default: "false" },
    },
    children: { min: 2, max: 9, allowed: ["Tab", "TabStripEnd"] },
    since: THEME_SPEC_VERSION,
  },
  /**
   * One panel of a `Tabs` element, with exactly one root element. `titleKey`
   * labels the tab and `icon` decorates it. The host remembers the selected
   * tab per layout.
   *
   * @example
   * ```xml
   * <Tab id="visualizer" titleKey="visualizer.title" icon="@icon/visualizer">
   *   <Visualizer />
   * </Tab>
   * ```
   * @example
   * ```ts
   * const tab = LAYOUT_ELEMENTS.Tab;
   * tab.parents; // ["Tabs"]
   * tab.attributes.icon.refKinds; // [ReferenceKind.Icon, ReferenceKind.Image]
   * ```
   */
  Tab: {
    name: "Tab",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      titleKey: { type: ValueType.ResourceKey, required: true },
      icon: {
        type: ValueType.Reference,
        refKinds: [ReferenceKind.Icon, ReferenceKind.Image],
      },
    },
    children: SINGLE_LAYOUT,
    parents: ["Tabs"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * Content drawn at the end of a `Tabs` strip, beside the tab buttons. Has
   * exactly one root element and no attributes.
   *
   * @example
   * ```xml
   * <TabStripEnd>
   *   <Button command="wmm.ui.toggleFullscreen" labelKey="common.fullScreen"
   *           icon="@icon/fullscreen" display="icon" />
   * </TabStripEnd>
   * ```
   * @example
   * ```ts
   * LAYOUT_ELEMENTS.TabStripEnd.parents; // ["Tabs"]
   * ```
   */
  TabStripEnd: {
    name: "TabStripEnd",
    category: ElementCategory.Structure,
    attributes: {},
    children: SINGLE_LAYOUT,
    parents: ["Tabs"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * Invokes a theme-invokable command (`E6050` otherwise). `commandParameter`
   * is required exactly when the command declares a literal parameter.
   * `labelKey` is the accessible name and, depending on `display`, the
   * visible label. `style` names a `@button/` style, and the inline
   * attributes override its properties but not its states.
   *
   * @example
   * ```xml
   * <Button command="wmm.ui.navigate" commandParameter="library"
   *         labelKey="navigation.library" icon="@icon/library" />
   * <Button command="wmm.playback.playpause" labelKey="playback.playPause"
   *         icon="@icon/playPause" style="@button/transport" display="icon" />
   * ```
   * @example
   * ```ts
   * if (!Object.hasOwn(WMM_THEME_COMMANDS, button.attributes.command)) {
   *   issues.push({ code: "E6050", attribute: "command" });
   * }
   * ```
   */
  Button: {
    name: "Button",
    category: ElementCategory.Control,
    attributes: {
      ...COMMON_ATTRIBUTES,
      command: { type: ValueType.Command, required: true },
      commandParameter: { type: ValueType.String },
      labelKey: { type: ValueType.ResourceKey, required: true },
      tooltipKey: { type: ValueType.ResourceKey },
      icon: {
        type: ValueType.Reference,
        refKinds: [ReferenceKind.Icon, ReferenceKind.Image],
      },
      display: {
        type: ValueType.Enum,
        values: DISPLAY_VALUES,
        default: "iconAndLabel",
      },
      style: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
      background: {
        type: ValueType.Brush,
        refKinds: [
          ReferenceKind.Brush,
          ReferenceKind.Slot,
          ReferenceKind.Color,
        ],
      },
      foreground: {
        type: ValueType.Color,
        refKinds: [ReferenceKind.Color, ReferenceKind.Slot],
      },
      border: {
        type: ValueType.Color,
        refKinds: [ReferenceKind.Color, ReferenceKind.Slot],
      },
      borderWidth: { type: ValueType.Thickness },
      cornerRadius: { type: ValueType.CornerRadius },
      padding: { type: ValueType.Thickness },
    },
    children: NO_CHILDREN,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Static text: exactly one of `resourceKey` or `literal`. `literal` is for
   * brand marks only, at most 32 characters, never translated, and always
   * raises `I6060` for gallery review. Dynamic text belongs to widgets.
   *
   * @example
   * ```xml
   * <Text resourceKey="library.songs" style="@text/title" />
   * <Text literal="CLASSIC" style="@text/logo" />
   * ```
   * @example
   * ```ts
   * const { resourceKey, literal } = node.attributes;
   * if ((resourceKey === undefined) === (literal === undefined)) {
   *   reportSpecMismatch(node);
   * }
   * ```
   */
  Text: {
    name: "Text",
    category: ElementCategory.Control,
    attributes: {
      ...COMMON_ATTRIBUTES,
      resourceKey: { type: ValueType.ResourceKey },
      literal: { type: ValueType.String, maxLength: 32 },
      style: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Shows an `@image/` resource. Needs exactly one of `decorative="true"` or
   * `altKey`, which forces an explicit accessibility decision.
   *
   * @example
   * ```xml
   * <Image source="@image/logo" fit="contain" decorative="true" />
   * <Image source="@image/badge" altKey="app.title" />
   * ```
   * @example
   * ```ts
   * const decorative = node.attributes.decorative === "true";
   * if (decorative === (node.attributes.altKey !== undefined)) {
   *   reportSpecMismatch(node);
   * }
   * ```
   */
  Image: {
    name: "Image",
    category: ElementCategory.Control,
    attributes: {
      ...COMMON_ATTRIBUTES,
      source: {
        type: ValueType.Reference,
        refKinds: [ReferenceKind.Image],
        required: true,
      },
      fit: {
        type: ValueType.Enum,
        values: ["none", "stretch", "cover", "contain", "nineSlice"],
      },
      decorative: { type: ValueType.Boolean },
      altKey: { type: ValueType.ResourceKey },
    },
    children: NO_CHILDREN,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Navigates artists, albums, genres, playlists and songs. Its selection
   * drives the `TrackList` on the same page. `views` is an ordered subset of
   * the five views. `display` is `list`, `grid` or `tree`: `tree` renders a
   * vertical navigation tree with a playlists node and a library node whose
   * children are the other views, each expandable into its values. Minimum
   * 160×160, one per page.
   *
   * @example
   * ```xml
   * <LibraryBrowser
   *   views="artists albums playlists"
   *   initialView="albums"
   *   display="grid"
   *   artwork="true"
   *   panel="@panel/inset"
   * />
   * <LibraryBrowser views="playlists artists albums songs" display="tree" />
   * ```
   * @example
   * ```ts
   * const def = LAYOUT_ELEMENTS.LibraryBrowser;
   * const found = pageWidgets.filter((n) => n.name === def.name);
   * if (typeof def.perPage === "number" && found.length > def.perPage) {
   *   reportSpecMismatch(found[def.perPage]);
   * }
   * ```
   */
  LibraryBrowser: {
    name: "LibraryBrowser",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      views: {
        type: ValueType.EnumList,
        values: ["artists", "albums", "genres", "playlists", "songs"],
      },
      initialView: {
        type: ValueType.Enum,
        values: ["artists", "albums", "genres", "playlists", "songs"],
      },
      display: { type: ValueType.Enum, values: ["list", "grid", "tree"] },
      artwork: { type: ValueType.Boolean },
      itemText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      headerText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    minSize: { width: 160, height: 160 },
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Songs for the current selection on the page: the `LibraryBrowser`
   * selection, the playlist picked in a `Playlist`, or all songs. `variant`
   * is `table`, `albums`, `list` or `tv`, and each option lists the variants
   * that accept it (`E6202`). `albums` groups the rows by album: a header row
   * per album carries the album artist, and a left column shows the cover,
   * album, album artist, genre and year beside that album's tracks, so the
   * `album` column is redundant there and is dropped if listed. `sortBy` must
   * be one of `columns` (`E6203`); a repeated column is `E4004`. `density`
   * sets the row height: `compact` 28 px, `comfortable` 44 px; `tv` is always
   * 72 px. Minimum size depends on the variant. One per page.
   *
   * @example
   * ```xml
   * <TrackList
   *   variant="table"
   *   columns="title artist album duration"
   *   sortBy="artist"
   *   density="compact"
   *   playingText="@text/accent"
   * />
   * <TrackList variant="albums" columns="track title duration" resizeColumns="true" />
   * <TrackList variant="list" fields="artwork artist duration" scrubber="true" />
   * ```
   * @example
   * ```ts
   * const variant = node.attributes.variant ?? "table";
   * for (const [name, attr] of Object.entries(def.attributes)) {
   *   const set = node.attributes[name] !== undefined;
   *   if (set && attr.variants && !attr.variants.includes(variant)) {
   *     issues.push({ code: "E6202", attribute: name });
   *   }
   * }
   * ```
   */
  TrackList: {
    name: "TrackList",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      variant: {
        type: ValueType.Enum,
        values: ["table", "albums", "list", "tv"],
      },
      columns: {
        type: ValueType.EnumList,
        values: TRACK_COLUMN_VALUES,
        default: "title album artist track genre year duration bitrate offline",
        variants: ["table", "albums"],
      },
      sortBy: {
        type: ValueType.Enum,
        values: TRACK_COLUMN_VALUES,
        default: "title",
        variants: ["table", "albums"],
      },
      sortDirection: {
        type: ValueType.Enum,
        values: ["ascending", "descending"],
        default: "ascending",
        variants: ["table", "albums"],
      },
      columnMenu: {
        type: ValueType.Boolean,
        default: "true",
        variants: ["table", "albums"],
      },
      reorderColumns: {
        type: ValueType.Boolean,
        default: "true",
        variants: ["table", "albums"],
      },
      resizeColumns: {
        type: ValueType.Boolean,
        default: "true",
        variants: ["table", "albums"],
      },
      scrubber: {
        type: ValueType.Boolean,
        variants: ["table", "albums", "list"],
      },
      fields: {
        type: ValueType.EnumList,
        values: [
          "artwork",
          "explicit",
          "artist",
          "album",
          "duration",
          "favorite",
        ],
        variants: ["list", "tv"],
      },
      alternateRows: {
        type: ValueType.Boolean,
        variants: ["table", "albums", "tv"],
      },
      showHeader: {
        type: ValueType.Boolean,
        default: "true",
        variants: ["table", "albums"],
      },
      rowText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      headerText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      playingText: {
        type: ValueType.Reference,
        refKinds: [ReferenceKind.Text],
      },
      alternateBrush: {
        type: ValueType.Reference,
        refKinds: [ReferenceKind.Brush],
      },
    },
    children: NO_CHILDREN,
    minSize: {
      table: { width: 240, height: 120 },
      albums: { width: 360, height: 160 },
      list: { width: 200, height: 120 },
      tv: { width: 480, height: 200 },
    },
    minSizeBy: "variant",
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Summary of the page's `TrackList` collection: a mosaic of the first four
   * album covers, the page's `titleKey`, and "N songs · M min". Needs a
   * `TrackList` on the same page (`E6205`). Minimum 160×40, one per page.
   *
   * @example
   * ```xml
   * <CollectionSummary
   *   fields="artwork title count duration"
   *   titleText="@text/tv-title"
   *   detailText="@text/tv-detail"
   * />
   * ```
   * @example
   * ```ts
   * const hasTrackList = pageWidgets.some((n) => n.name === "TrackList");
   * if (node.name === "CollectionSummary" && !hasTrackList) {
   *   issues.push({ code: "E6205", element: node.name });
   * }
   * ```
   */
  CollectionSummary: {
    name: "CollectionSummary",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      fields: {
        type: ValueType.EnumList,
        values: ["artwork", "title", "count", "duration"],
      },
      titleText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      detailText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    minSize: { width: 160, height: 40 },
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * The playlists list. Picking one fills the page's `TrackList`, and rows
   * from a `TrackList` can be dragged onto it. `editable` adds a
   * new-playlist button and gives each row a context menu with play, rename
   * and delete, F2 to rename the focused row and Delete to ask before
   * deleting it; `editable="false"` leaves the list read-only. The play queue
   * is `PlayQueue`. Minimum 160×120, one per page.
   *
   * @example
   * ```xml
   * <Tab id="playlists" titleKey="navigation.playlists" icon="@icon/playlists">
   *   <Playlist artwork="true" rowText="@text/body" />
   * </Tab>
   * <Playlist artwork="false" editable="false" />
   * ```
   * @example
   * ```ts
   * const min = LAYOUT_ELEMENTS.Playlist.minSize as Size;
   * if (box.width < min.width || box.height < min.height) {
   *   issues.push({ code: "W6071", element: "Playlist" });
   * }
   * ```
   */
  Playlist: {
    name: "Playlist",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      artwork: { type: ValueType.Boolean },
      editable: { type: ValueType.Boolean, default: "true" },
      rowText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    minSize: { width: 160, height: 120 },
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Edits the selected songs' tags. `mode="full"` is the docked editor and
   * `quick` is the quick-edit dialog content. It takes text entry, so it is
   * invalid in `tv.xml` (`E6095`), and it belongs on a page rather than in
   * the Shell (`W6094`). Minimum 240×200, one per layout.
   *
   * @example
   * ```xml
   * <MetadataEditor
   *   dock="bottom"
   *   libraryMode="edit"
   *   mode="full"
   *   height="320"
   *   panel="@panel/editor"
   * />
   * ```
   * @example
   * ```ts
   * const editors = layoutWidgets.filter((n) => n.name === "MetadataEditor");
   * if (editors.length > (LAYOUT_ELEMENTS.MetadataEditor.perLayout ?? 1)) {
   *   reportSpecMismatch(editors[1]);
   * }
   * ```
   */
  MetadataEditor: {
    name: "MetadataEditor",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      mode: { type: ValueType.Enum, values: ["quick", "full"] },
      labelText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    minSize: { width: 240, height: 200 },
    perPage: 1,
    perLayout: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Songs queued for device sync. `summary` adds the totals line. Rows from
   * a `TrackList` can be dragged onto it. Minimum 200×120, one per page.
   *
   * @example
   * ```xml
   * <Tab id="sync" titleKey="navigation.sync" icon="@icon/sync">
   *   <SyncQueue summary="true" rowText="@text/body" />
   * </Tab>
   * ```
   * @example
   * ```ts
   * if (node.name === "SyncQueue" && node.children.length > 0) {
   *   issues.push({ code: "E6070", element: node.name });
   * }
   * ```
   */
  SyncQueue: {
    name: "SyncQueue",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      summary: { type: ValueType.Boolean },
      rowText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    minSize: { width: 200, height: 120 },
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Connected devices. `storage` shows the storage bar and `allowAdd` the
   * add-device button. Minimum 200×80, one per page.
   *
   * @example
   * ```xml
   * <DevicePanel
   *   grow="1"
   *   storage="true"
   *   allowAdd="true"
   *   titleText="@text/pane-header"
   * />
   * ```
   * @example
   * ```ts
   * const attr = LAYOUT_ELEMENTS.DevicePanel.attributes.titleText;
   * const ref = parseReference(node.attributes.titleText);
   * if (ref && !attr.refKinds?.includes(ref.kind)) {
   *   reportSpecMismatch(node);
   * }
   * ```
   */
  DevicePanel: {
    name: "DevicePanel",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      storage: { type: ValueType.Boolean },
      allowAdd: { type: ValueType.Boolean },
      titleText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    minSize: { width: 200, height: 80 },
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Search input that filters the page's `TrackList` by title, album, artist
   * and genre. `sourceFilter` and `resultCount` are library-only (`E6206`).
   * `presentation="button"` shows an icon button that opens a full-width
   * overlay; `display` and `style` then work as on `Button`. Invalid in
   * `tv.xml` (`E6095`). Minimum 120×32, one per scope per page.
   *
   * @example
   * ```xml
   * <SearchBox
   *   scope="library"
   *   sourceFilter="true"
   *   resultCount="true"
   *   placeholderKey="search.placeholder"
   * />
   * <SearchBox
   *   presentation="button"
   *   display="iconAndLabel"
   *   style="@button/bottom-nav"
   * />
   * ```
   * @example
   * ```ts
   * const { scope = "library", sourceFilter, resultCount } = node.attributes;
   * if (scope === "sync" && (sourceFilter ?? resultCount) !== undefined) {
   *   issues.push({ code: "E6206", element: node.name });
   * }
   * ```
   */
  SearchBox: {
    name: "SearchBox",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      scope: {
        type: ValueType.Enum,
        values: ["library", "sync"],
        default: "library",
      },
      placeholderKey: { type: ValueType.ResourceKey },
      sourceFilter: { type: ValueType.Boolean },
      resultCount: { type: ValueType.Boolean },
      presentation: {
        type: ValueType.Enum,
        values: ["inline", "button"],
        default: "inline",
      },
      display: { type: ValueType.Enum, values: DISPLAY_VALUES },
      style: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
    },
    children: NO_CHILDREN,
    minSize: { width: 120, height: 32 },
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * The current track's cover, or a disc icon when there is none.
   * `action="openNowPlaying"` makes it open the Now Playing page when
   * pressed. Minimum 24×24, unlimited per page.
   *
   * @example
   * ```xml
   * <Artwork width="56" height="56" action="openNowPlaying" />
   * <Artwork width="360" height="360" fit="contain" cornerRadius="12" />
   * ```
   * @example
   * ```ts
   * const { values } = LAYOUT_ELEMENTS.Artwork.attributes.fit;
   * const fit = node.attributes.fit;
   * if (fit !== undefined && !values?.includes(fit)) {
   *   reportSpecMismatch(node);
   * }
   * ```
   */
  Artwork: {
    name: "Artwork",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      fit: { type: ValueType.Enum, values: ["cover", "contain"] },
      action: { type: ValueType.Enum, values: ["none", "openNowPlaying"] },
      cornerRadius: { type: ValueType.CornerRadius },
    },
    children: NO_CHILDREN,
    minSize: { width: 24, height: 24 },
    perPage: null,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Title and details of the current track, or `playback.nothingPlaying`
   * when idle. `fields` is an ordered subset of {@link TRACK_INFO_FIELDS};
   * `favorite` is a button that toggles the current song's favorite.
   * `trailing` takes the same values and draws them right after the title,
   * on the title line when `stacked`. A centered `hAlign` centers stacked
   * text. The time
   * fields show `--:--` while the duration is unknown, and
   * `elapsedAndTotal` reads `01:07 / 08:57`. Minimum 80×16, unlimited per
   * page.
   *
   * @example
   * ```xml
   * <TrackInfo fields="title explicit artist favorite" />
   * <TrackInfo fields="title" trailing="elapsedAndTotal" arrangement="inline" />
   * ```
   * @example
   * ```ts
   * const { values } = LAYOUT_ELEMENTS.TrackInfo.attributes.fields;
   * const fields = (node.attributes.fields ?? "").split(/\s+/);
   * for (const field of fields.filter(Boolean)) {
   *   if (!values?.includes(field)) reportSpecMismatch(node);
   * }
   * ```
   */
  TrackInfo: {
    name: "TrackInfo",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      fields: {
        type: ValueType.EnumList,
        values: TRACK_INFO_FIELDS,
      },
      trailing: {
        type: ValueType.EnumList,
        values: TRACK_INFO_FIELDS,
      },
      arrangement: {
        type: ValueType.Enum,
        values: ["stacked", "inline"],
      },
      titleText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      detailText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    minSize: { width: 80, height: 16 },
    perPage: null,
    since: THEME_SPEC_VERSION,
  },
  /**
   * A time readout for the current track. Shows `--:--` while the duration
   * is unknown. Minimum 32×12, unlimited per page.
   *
   * @example
   * ```xml
   * <Stack orientation="horizontal" gap="8" align="center">
   *   <PlaybackTime format="elapsed" />
   *   <SeekBar grow="1" slider="@slider/seek" />
   *   <PlaybackTime format="remaining" text="@text/caption" />
   * </Stack>
   * ```
   * @example
   * ```ts
   * const limit = LAYOUT_ELEMENTS.PlaybackTime.perPage;
   * if (limit !== null && limit !== undefined && count > limit) {
   *   reportSpecMismatch(node);
   * }
   * ```
   */
  PlaybackTime: {
    name: "PlaybackTime",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      format: {
        type: ValueType.Enum,
        values: ["elapsed", "total", "remaining", "elapsedAndTotal"],
      },
      text: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    minSize: { width: 32, height: 12 },
    perPage: null,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Seek slider with a buffering indicator; seeking sends
   * `wmm.playback.seek`. `variant="edge"` is a thin rule along the parent's
   * top edge with an enlarged touch area, and needs a `Panel` or `Grid` row
   * parent (`W6110`). Buffering is never shown for offline tracks. Minimum
   * bar 80×16, edge 80×2; two per page.
   *
   * @example
   * ```xml
   * <SeekBar grow="1" slider="@slider/seek" />
   * <Panel dock="bottom" style="@panel/mini-player">
   *   <SeekBar variant="edge" buffering="false" />
   * </Panel>
   * ```
   * @example
   * ```ts
   * const def = LAYOUT_ELEMENTS.SeekBar;
   * const key = node.attributes[def.minSizeBy ?? ""] ?? "bar";
   * const min = (def.minSize as Readonly<Record<string, Size>>)[key];
   * ```
   */
  SeekBar: {
    name: "SeekBar",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      variant: { type: ValueType.Enum, values: ["bar", "edge"] },
      buffering: { type: ValueType.Boolean, default: "true" },
      slider: { type: ValueType.Reference, refKinds: [ReferenceKind.Slider] },
    },
    children: NO_CHILDREN,
    minSize: {
      bar: { width: 80, height: 16 },
      edge: { width: 80, height: 2 },
    },
    minSizeBy: "variant",
    perPage: 2,
    since: THEME_SPEC_VERSION,
  },
  /**
   * App-wide volume slider, 0–1 in 0.01 steps, with an optional mute
   * button styled by `button`. Warns in `tv.xml`, where the remote controls
   * volume (`W6108`). Minimum horizontal 80×16, vertical 16×80; two per
   * page.
   *
   * @example
   * ```xml
   * <VolumeControl width="140" muteButton="true" slider="@slider/volume" />
   * <VolumeControl
   *   orientation="vertical"
   *   height="120"
   *   button="@button/icon"
   * />
   * ```
   * @example
   * ```ts
   * if (formFactor === FormFactor.Tv && node.name === "VolumeControl") {
   *   issues.push({ code: "W6108", element: node.name });
   * }
   * ```
   */
  VolumeControl: {
    name: "VolumeControl",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      orientation: {
        type: ValueType.Enum,
        values: ["horizontal", "vertical"],
      },
      muteButton: { type: ValueType.Boolean },
      slider: { type: ValueType.Reference, refKinds: [ReferenceKind.Slider] },
      button: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
    },
    children: NO_CHILDREN,
    minSize: {
      horizontal: { width: 80, height: 16 },
      vertical: { width: 16, height: 80 },
    },
    minSizeBy: "orientation",
    perPage: 2,
    since: THEME_SPEC_VERSION,
  },
  /**
   * The play queue: current and upcoming songs. With `upNext`, an empty
   * queue with shuffle off shows the next song of the current collection
   * under `playback.upNext`. `presentation="popover"` is a button, styled by
   * `button`, that opens the queue in a host popover and is disabled while
   * the queue is empty. Without `artwork`, rows show track numbers. Minimum
   * inline 160×120, popover 28×28; one per page.
   *
   * @example
   * ```xml
   * <PlayQueue presentation="popover" artwork="true" clearButton="true" />
   * <PlayQueue
   *   column="1"
   *   artwork="true"
   *   clearButton="true"
   *   upNext="true"
   *   headerText="@text/pane-header"
   * />
   * ```
   * @example
   * ```ts
   * const queues = pageWidgets.filter((n) => n.name === "PlayQueue");
   * if (queues.length > (LAYOUT_ELEMENTS.PlayQueue.perPage ?? 1)) {
   *   reportSpecMismatch(queues[1]);
   * }
   * ```
   */
  PlayQueue: {
    name: "PlayQueue",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      presentation: { type: ValueType.Enum, values: ["inline", "popover"] },
      artwork: { type: ValueType.Boolean },
      clearButton: { type: ValueType.Boolean },
      upNext: { type: ValueType.Boolean },
      rowText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      detailText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      headerText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      button: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
    },
    children: NO_CHILDREN,
    minSize: {
      inline: { width: 160, height: 120 },
      popover: { width: 28, height: 28 },
    },
    minSizeBy: "presentation",
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * The current song's lyrics, or `playback.noLyrics`. Minimum 160×80, one
   * per page.
   *
   * @example
   * ```xml
   * <Tab id="lyrics" titleKey="playback.lyrics" icon="@icon/lyrics">
   *   <Lyrics align="center" text="@text/body" />
   * </Tab>
   * ```
   * @example
   * ```ts
   * const align = node.attributes.align ?? "start";
   * const centered = align === "center";
   * ```
   */
  Lyrics: {
    name: "Lyrics",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      align: { type: ValueType.Enum, values: ["start", "center"] },
      text: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    minSize: { width: 160, height: 80 },
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * The active visualizer plugin. `selector` and `settingsButton` add the
   * plugin picker and its settings, `trackInfo` overlays title and artist,
   * and `fallback` decides what shows without a plugin. Minimum 120×80, one
   * per layout.
   *
   * @example
   * ```xml
   * <Tab id="visualizer" titleKey="visualizer.title" icon="@icon/visualizer">
   *   <Visualizer
   *     selector="true"
   *     settingsButton="true"
   *     trackInfo="true"
   *     fallback="artwork"
   *   />
   * </Tab>
   * ```
   * @example
   * ```ts
   * const found = layoutWidgets.filter((n) => n.name === "Visualizer");
   * if (found.length > (LAYOUT_ELEMENTS.Visualizer.perLayout ?? 1)) {
   *   reportSpecMismatch(found[1]);
   * }
   * ```
   */
  Visualizer: {
    name: "Visualizer",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      selector: { type: ValueType.Boolean },
      settingsButton: { type: ValueType.Boolean },
      trackInfo: { type: ValueType.Boolean },
      fallback: { type: ValueType.Enum, values: ["artwork", "none"] },
      titleText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      detailText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    minSize: { width: 120, height: 80 },
    perPage: 1,
    perLayout: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * The animated background behind a page: a seeded gradient with dots,
   * circles and notes. `source="artwork"` takes colors from the cover and
   * `palette` from `@slot/accent`. Static when reduced motion is on. No
   * minimum size, one per page.
   *
   * @example
   * ```xml
   * <Grid rows="1* auto">
   *   <Backdrop row="0" rowSpan="2" source="artwork" />
   * </Grid>
   * ```
   * @example
   * ```ts
   * const hasMinSize = LAYOUT_ELEMENTS.Backdrop.minSize !== undefined;
   * ```
   */
  Backdrop: {
    name: "Backdrop",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      source: { type: ValueType.Enum, values: ["artwork", "palette"] },
    },
    children: NO_CHILDREN,
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
  /**
   * Composite shortcut that renders a built-in player arrangement. The
   * Booleans `artwork`, `transport`, `seek`, `volume` and `queue` pick its
   * parts and are ignored by `indicator`. `variant="indicator"` is the TV
   * navigation chip: it opens the Now Playing page and renders nothing while
   * no track is loaded. Minimum bar 320×56, compact 240×56, indicator
   * 160×40, full 320×320; one per page.
   *
   * @example
   * ```xml
   * <NowPlaying row="1" variant="bar" artwork="false" idleHide="true" />
   * <NowPlaying
   *   variant="compact"
   *   transport="true"
   *   seek="true"
   *   transportButton="@button/play"
   *   slider="@slider/seek"
   * />
   * ```
   * @example
   * ```ts
   * const hasTransport = pageWidgets.some(
   *   (n) => n.name === "NowPlaying" && n.attributes.transport === "true"
   * );
   * if (!hasTransport && !hasPlayPauseButton) {
   *   issues.push({ code: "W6109", element: "Page" });
   * }
   * ```
   */
  NowPlaying: {
    name: "NowPlaying",
    category: ElementCategory.Widget,
    attributes: {
      ...COMMON_ATTRIBUTES,
      ...WIDGET_ATTRIBUTES,
      variant: {
        type: ValueType.Enum,
        values: ["bar", "compact", "indicator", "full"],
      },
      artwork: { type: ValueType.Boolean },
      transport: { type: ValueType.Boolean },
      seek: { type: ValueType.Boolean },
      volume: { type: ValueType.Boolean },
      queue: { type: ValueType.Boolean },
      titleText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      detailText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      transportButton: {
        type: ValueType.Reference,
        refKinds: [ReferenceKind.Button],
      },
      slider: { type: ValueType.Reference, refKinds: [ReferenceKind.Slider] },
    },
    children: NO_CHILDREN,
    minSize: {
      bar: { width: 320, height: 56 },
      compact: { width: 240, height: 56 },
      indicator: { width: 160, height: 40 },
      full: { width: 320, height: 320 },
    },
    minSizeBy: "variant",
    perPage: 1,
    since: THEME_SPEC_VERSION,
  },
};
