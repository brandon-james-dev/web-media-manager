import { WMM_THEME_COMMANDS } from "@/events/taxonomy";
import type { WmmCommandName } from "@/events/taxonomy";
import { ElementCategory, LAYOUT_ELEMENTS } from "../componentModel";
import { IssueSeverity } from "@/lib/themes/issues";
import type { ThemeIssue } from "@/lib/themes/issues";
import type { ThemeNode } from "../parser";

/**
 * Page roles whose elements may use `libraryMode`, besides the Shell.
 *
 * @example
 * ```xml
 * <Page id="songs" role="library" titleKey="navigation.songs">
 *   <MetadataEditor libraryMode="edit" mode="full" />
 * </Page>
 * ```
 * @example
 * ```ts
 * LIBRARY_ROLES.has(page.attributes.role?.value ?? "");
 * ```
 */
const LIBRARY_ROLES = new Set(["library", "artists", "albums", "playlists"]);

/**
 * The `TrackList` variant used when `variant` is omitted, by form factor.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tablet">
 *   <Shell><TrackList fields="artwork artist duration" /></Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * TRACK_LIST_DEFAULT_VARIANT[formFactor] ?? "table";
 * ```
 */
const TRACK_LIST_DEFAULT_VARIANT: Readonly<Record<string, string>> = {
  desktop: "table",
  tablet: "list",
  mobile: "list",
  tv: "tv",
};

/**
 * Runs the stage 6 semantic checks over a layout tree that passed stage 4:
 * `formFactor` must match the file name (`E6001`), `wmm.ui.navigate` must
 * name a declared page (`E6020`), Button commands must be theme-invokable
 * (`E6050`), `commandParameter` is present exactly when the command declares
 * one and integers lie in its domain (`E6105`), `wmm.ui.togglePanel` must
 * name a collapsible Panel (`E6204`),
 * parent-specific attributes need their parent (`E6030`), Grid children must lie inside the grid (`E6041`),
 * widgets take no children (`E6070`), and there is at most one `nowPlaying`
 * page and 2 to 8 tabs per `Tabs` (`E6106`), and `libraryMode` appears only
 * in the Shell or a library-family page (`E6201`), and variant-specific
 * options match the element's variant (`E6202`), and a table `TrackList`
 * sorts by one of its columns (`E6203`), and a page with a
 * `CollectionSummary` or `wmm.playback.playAll` button has a TrackList
 * (`E6205`), and a `scope="sync"` SearchBox has no `sourceFilter` or
 * `resultCount` (`E6206`), and the tv layout has no SearchBox or
 * MetadataEditor (`E6095`), and `idleHide` appears only inside the
 * `nowPlaying` page (`E6101`), and `presentation="overlay"` (`E6102`) and
 * `openOnPlay` (`E6103`) only on it, and an overlay Now Playing page holds
 * a `wmm.ui.closeNowPlaying` button (`E6107` on tablet and mobile, `W6107`
 * on desktop; the overlay hides the Shell, so Shell buttons do not count).
 * A Now Playing page warns `W6109` when neither it nor, unless it is an
 * overlay, the Shell holds a play/pause control.
 * A collapsible Panel that no togglePanel button
 * outside it can open gets a warning (`W6207`), as does a table TrackList in
 * a mobile or tv layout or a tv TrackList outside tv (`W6208`), and a
 * `wmm.ui.toggleEditMode` button when no MetadataEditor renders in
 * `libraryMode="edit"`, on itself or an ancestor (`W6209`), and a
 * VolumeControl in the tv layout (`W6108`), and a Now Playing page with no
 * play/pause control (`W6109`), and an edge SeekBar whose parent is not a
 * Panel or Grid (`W6110`).
 * Elements whose prefix the root lists in `ignorable` are skipped.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell>
 *     <Grid columns="auto 1*">
 *       <SearchBox column="1" scope="library" />
 *     </Grid>
 *   </Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * const grammar = walkElements(root, "layouts/desktop.xml");
 * const issues = grammar.length
 *   ? grammar
 *   : checkLayout(root, "layouts/desktop.xml");
 * ```
 */
export function checkLayout(root: ThemeNode, file: string): ThemeIssue[] {
  const issues: ThemeIssue[] = [];
  const ignorable = new Set(
    (root.attributes.ignorable?.value ?? "").split(" ").filter(Boolean)
  );

  const report = (
    code: string,
    message: string,
    node: ThemeNode,
    severity: IssueSeverity = IssueSeverity.Error
  ): void => {
    issues.push({
      code,
      severity,
      file,
      line: node.line,
      column: node.column,
      path: node.path,
      message,
    });
  };

  const childrenOf = (node: ThemeNode): ThemeNode[] =>
    node.children.filter(
      (child) => child.prefix === "" || !ignorable.has(child.prefix)
    );

  const numberOf = (node: ThemeNode, name: string, fallback: number): number =>
    Object.hasOwn(node.attributes, name)
      ? Number(node.attributes[name].value)
      : fallback;

  const trackCount = (node: ThemeNode, name: string): number =>
    Object.hasOwn(node.attributes, name)
      ? node.attributes[name].value.split(/\s+/).filter(Boolean).length
      : 1;

  const checkGrid = (grid: ThemeNode, children: ThemeNode[]): void => {
    const rows = trackCount(grid, "rows");
    const columns = trackCount(grid, "columns");
    for (const child of children) {
      const row = numberOf(child, "row", 0);
      const column = numberOf(child, "column", 0);
      const rowEnd = row + numberOf(child, "rowSpan", 1);
      const columnEnd = column + numberOf(child, "columnSpan", 1);
      if (rowEnd > rows || columnEnd > columns) {
        report(
          "E6041",
          `<${child.name}> spans rows ${row}–${rowEnd - 1} and columns ${column}–${columnEnd - 1}; the grid has ${rows} rows and ${columns} columns.`,
          child
        );
      }
    }
  };

  const pages = childrenOf(root).filter((child) => child.local === "Page");
  const pageIds = new Set(pages.map((page) => page.attributes.id?.value));

  const nowPlaying = pages.filter(
    (page) => page.attributes.role?.value === "nowPlaying"
  );
  for (const page of nowPlaying.slice(1)) {
    report("E6106", `Only one page may have role="nowPlaying".`, page);
  }

  const checkParentAttributes = (
    node: ThemeNode,
    parent: ThemeNode | undefined
  ): void => {
    if (!Object.hasOwn(LAYOUT_ELEMENTS, node.local)) return;
    const attributes = LAYOUT_ELEMENTS[node.local].attributes;
    for (const [name, def] of Object.entries(attributes)) {
      if (!("parent" in def) || def.parent === undefined) continue;
      if (!Object.hasOwn(node.attributes, name)) continue;
      if (parent?.local === def.parent) continue;
      report(
        "E6030",
        `${name} only applies to children of <${def.parent}>; <${node.name}> is inside <${parent?.name ?? "nothing"}>.`,
        node
      );
    }
  };

  const checkCommand = (node: ThemeNode): void => {
    const command = node.attributes.command?.value;
    if (command === undefined || Object.hasOwn(WMM_THEME_COMMANDS, command)) {
      return;
    }
    report("E6050", `${command} is not a command themes may invoke.`, node);
  };

  const checkParameter = (node: ThemeNode): void => {
    const command = node.attributes.command?.value;
    if (command === undefined || !Object.hasOwn(WMM_THEME_COMMANDS, command)) {
      return;
    }
    const domain = WMM_THEME_COMMANDS[command as WmmCommandName]?.parameter;
    const value = node.attributes.commandParameter?.value;
    const problem =
      domain === undefined
        ? value === undefined
          ? undefined
          : `${command} takes no commandParameter.`
        : value === undefined
          ? `${command} needs a commandParameter.`
          : domain.kind === "integer" &&
              (!/^-?\d+$/.test(value) ||
                Number(value) < domain.min ||
                Number(value) > domain.max ||
                (domain.nonZero && Number(value) === 0))
            ? `${command} takes a whole number from ${domain.min} to ${domain.max}${domain.nonZero ? ", not 0" : ""}; got "${value}".`
            : undefined;
    if (problem !== undefined) report("E6105", problem, node);
  };

  const checkNavigate = (node: ThemeNode): void => {
    if (node.attributes.command?.value !== "wmm.ui.navigate") return;
    const target = node.attributes.commandParameter?.value;
    if (target === undefined || pageIds.has(target)) return;
    report(
      "E6020",
      `wmm.ui.navigate names page "${target}", which this layout does not declare.`,
      node
    );
  };

  const collapsibleIds = new Set<string>();
  const collapsiblePanels: ThemeNode[] = [];
  const toggleTargets: { target: string; node: ThemeNode }[] = [];
  const collectPanels = (node: ThemeNode): void => {
    const id = node.attributes.id?.value;
    if (
      node.local === "Panel" &&
      node.attributes.collapsible?.value === "true" &&
      id !== undefined
    ) {
      collapsibleIds.add(id);
      collapsiblePanels.push(node);
    }
    const target = node.attributes.commandParameter?.value;
    if (
      node.attributes.command?.value === "wmm.ui.togglePanel" &&
      target !== undefined
    ) {
      toggleTargets.push({ target, node });
    }
    for (const child of childrenOf(node)) collectPanels(child);
  };
  collectPanels(root);

  const checkTogglePanel = (node: ThemeNode): void => {
    if (node.attributes.command?.value !== "wmm.ui.togglePanel") return;
    const target = node.attributes.commandParameter?.value;
    if (target === undefined || collapsibleIds.has(target)) return;
    report(
      "E6204",
      `wmm.ui.togglePanel names "${target}", which is not the id of a Panel with collapsible="true" in this layout.`,
      node
    );
  };

  const checkTabs = (tabs: ThemeNode, children: ThemeNode[]): void => {
    const count = children.filter((child) => child.local === "Tab").length;
    if (count < 2 || count > 8) {
      report(
        "E6106",
        `<${tabs.name}> has ${count} tabs; it needs 2 to 8.`,
        tabs
      );
    }
  };

  const checkLibraryMode = (node: ThemeNode, inLibrary: boolean): void => {
    if (inLibrary || !Object.hasOwn(node.attributes, "libraryMode")) return;
    report(
      "E6201",
      `libraryMode only applies inside the Shell or a library, artists, albums or playlists page; <${node.name}> is outside them.`,
      node
    );
  };

  const formFactor = root.attributes.formFactor?.value;
  const expected = /([^/]+)\.xml$/.exec(file)?.[1];

  const variantOf = (node: ThemeNode): string | undefined => {
    if (!Object.hasOwn(LAYOUT_ELEMENTS, node.local)) return undefined;
    const attributes = LAYOUT_ELEMENTS[node.local].attributes;
    if (!Object.hasOwn(attributes, "variant")) return undefined;
    return (
      node.attributes.variant?.value ??
      (node.local === "TrackList"
        ? (TRACK_LIST_DEFAULT_VARIANT[formFactor ?? expected ?? ""] ?? "table")
        : attributes.variant.default)
    );
  };

  const checkVariantOptions = (node: ThemeNode): void => {
    const variant = variantOf(node);
    if (variant === undefined) return;
    const attributes = LAYOUT_ELEMENTS[node.local].attributes;
    for (const [name, def] of Object.entries(attributes)) {
      if (!("variants" in def) || def.variants === undefined) continue;
      if (!Object.hasOwn(node.attributes, name)) continue;
      if (def.variants.includes(variant)) continue;
      report(
        "E6202",
        `${name} applies to the ${def.variants.join(" and ")} variants of <${node.name}>, not ${variant}.`,
        node
      );
    }
  };

  const checkColumns = (node: ThemeNode): void => {
    if (node.local !== "TrackList" || variantOf(node) !== "table") return;
    const columns = (
      node.attributes.columns?.value ??
      LAYOUT_ELEMENTS.TrackList.attributes.columns.default ??
      ""
    )
      .split(/\s+/)
      .filter(Boolean);
    const sortBy = node.attributes.sortBy?.value;
    if (sortBy !== undefined && !columns.includes(sortBy)) {
      report(
        "E6203",
        `sortBy "${sortBy}" is not one of the columns of <${node.name}>.`,
        node
      );
    }
  };

  const checkVariantFit = (node: ThemeNode): void => {
    if (node.local !== "TrackList") return;
    const variant = node.attributes.variant?.value;
    const target = formFactor ?? expected;
    const tableWithoutPointer =
      variant === "table" && (target === "mobile" || target === "tv");
    const tvOutsideTv = variant === "tv" && target !== "tv";
    if (!tableWithoutPointer && !tvOutsideTv) return;
    report(
      "W6208",
      tableWithoutPointer
        ? `variant="table" needs a pointer; the ${target} layout should use list or tv.`
        : `variant="tv" is meant for tv.xml; this is the ${target} layout.`,
      node,
      IssueSeverity.Warning
    );
  };

  const checkTvTextEntry = (node: ThemeNode): void => {
    if (node.local !== "SearchBox" && node.local !== "MetadataEditor") return;
    if ((formFactor ?? expected) !== "tv") return;
    report(
      "E6095",
      `<${node.name}> needs text entry and is not allowed in the tv layout; TV search uses the host's on-screen flow.`,
      node
    );
  };

  const checkTvVolume = (node: ThemeNode): void => {
    if (node.local !== "VolumeControl") return;
    if ((formFactor ?? expected) !== "tv") return;
    report(
      "W6108",
      `<${node.name}> is redundant in the tv layout; the TV remote controls volume.`,
      node,
      IssueSeverity.Warning
    );
  };

  const checkSearchScope = (node: ThemeNode): void => {
    if (node.local !== "SearchBox") return;
    if (node.attributes.scope?.value !== "sync") return;
    for (const name of ["sourceFilter", "resultCount"]) {
      if (!Object.hasOwn(node.attributes, name)) continue;
      report(
        "E6206",
        `${name} only applies to a library SearchBox; <${node.name}> has scope="sync".`,
        node
      );
    }
  };

  const descendantsOf = (node: ThemeNode): ThemeNode[] =>
    childrenOf(node).flatMap((child) => [child, ...descendantsOf(child)]);

  const checkCollection = (page: ThemeNode): void => {
    const nodes = descendantsOf(page);
    if (nodes.some((node) => node.local === "TrackList")) return;
    for (const node of nodes) {
      const playAll = node.attributes.command?.value === "wmm.playback.playAll";
      if (node.local !== "CollectionSummary" && !playAll) continue;
      report(
        "E6205",
        playAll
          ? `wmm.playback.playAll needs a TrackList on the same page.`
          : `<${node.name}> summarizes the page's TrackList; this page has none.`,
        node
      );
    }
  };

  const checkNowPlayingOnly = (
    node: ThemeNode,
    inNowPlaying: boolean
  ): void => {
    if (!inNowPlaying && Object.hasOwn(node.attributes, "idleHide")) {
      report(
        "E6101",
        `idleHide only applies inside the nowPlaying page; <${node.name}> is outside it.`,
        node
      );
    }
    if (node.local !== "Page" || node.attributes.role?.value === "nowPlaying") {
      return;
    }
    if (node.attributes.presentation?.value === "overlay") {
      report(
        "E6102",
        `presentation="overlay" only applies to the page with role="nowPlaying".`,
        node
      );
    }
    if (Object.hasOwn(node.attributes, "openOnPlay")) {
      report(
        "E6103",
        `openOnPlay only applies to the page with role="nowPlaying".`,
        node
      );
    }
  };

  const visit = (
    node: ThemeNode,
    parent?: ThemeNode,
    inheritedLibrary = false,
    inheritedNowPlaying = false
  ): void => {
    const children = childrenOf(node);
    const inLibrary =
      node.local === "Shell" ||
      (node.local === "Page"
        ? LIBRARY_ROLES.has(node.attributes.role?.value ?? "")
        : inheritedLibrary);
    const inNowPlaying =
      node.local === "Page"
        ? node.attributes.role?.value === "nowPlaying"
        : inheritedNowPlaying;
    checkLibraryMode(node, inLibrary);
    checkNowPlayingOnly(node, inNowPlaying);
    checkParentAttributes(node, parent);
    checkCommand(node);
    checkParameter(node);
    checkNavigate(node);
    checkTogglePanel(node);
    checkVariantOptions(node);
    checkColumns(node);
    checkVariantFit(node);
    checkTvTextEntry(node);
    checkTvVolume(node);
    if (
      node.local === "SeekBar" &&
      node.attributes.variant?.value === "edge" &&
      parent?.local !== "Panel" &&
      parent?.local !== "Grid"
    ) {
      report(
        "W6110",
        `variant="edge" draws along its container's top edge; put <${node.name}> directly in a Panel or a Grid row, not <${parent?.name ?? "nothing"}>.`,
        node,
        IssueSeverity.Warning
      );
    }
    checkSearchScope(node);
    const isWidget =
      Object.hasOwn(LAYOUT_ELEMENTS, node.local) &&
      LAYOUT_ELEMENTS[node.local].category === ElementCategory.Widget;
    if (isWidget && children.length > 0) {
      report(
        "E6070",
        `<${node.name}> is a widget and takes no children.`,
        node
      );
    }
    if (node.local === "Grid") checkGrid(node, children);
    if (node.local === "Tabs") checkTabs(node, children);
    for (const child of children) visit(child, node, inLibrary, inNowPlaying);
  };

  if (formFactor !== undefined && formFactor !== expected) {
    report(
      "E6001",
      `formFactor "${formFactor}" does not match the file name ${file}.`,
      root
    );
  }

  visit(root);
  for (const page of pages) checkCollection(page);
  const isPlayPause = (node: ThemeNode): boolean =>
    node.attributes.command?.value === "wmm.playback.playpause" ||
    (node.local === "NowPlaying" &&
      node.attributes.transport?.value === "true" &&
      node.attributes.variant?.value !== "indicator");
  const shellCanPlayPause = childrenOf(root)
    .filter((child) => child.local === "Shell")
    .some((shell) => descendantsOf(shell).some(isPlayPause));
  for (const page of nowPlaying) {
    const shellVisible = page.attributes.presentation?.value !== "overlay";
    if (shellVisible && shellCanPlayPause) continue;
    if (descendantsOf(page).some(isPlayPause)) continue;
    report(
      "W6109",
      `This Now Playing page has no wmm.playback.playpause button and no <NowPlaying transport="true">.`,
      page,
      IssueSeverity.Warning
    );
  }
  const closeSeverity: Partial<Record<string, IssueSeverity>> = {
    desktop: IssueSeverity.Warning,
    tablet: IssueSeverity.Error,
    mobile: IssueSeverity.Error,
  };
  const overlaySeverity = closeSeverity[formFactor ?? expected ?? ""];
  for (const page of overlaySeverity === undefined ? [] : nowPlaying) {
    if (page.attributes.presentation?.value !== "overlay") continue;
    const canClose = descendantsOf(page).some(
      (node) => node.attributes.command?.value === "wmm.ui.closeNowPlaying"
    );
    if (canClose) continue;
    const isError = overlaySeverity === IssueSeverity.Error;
    report(
      isError ? "E6107" : "W6107",
      isError
        ? `This overlay Now Playing page has no wmm.ui.closeNowPlaying button; touch devices have no reliable back key.`
        : `This overlay Now Playing page has no wmm.ui.closeNowPlaying button; only Escape leaves it.`,
      page,
      overlaySeverity
    );
  }
  const editToggles: ThemeNode[] = [];
  let hasEditEditor = false;
  const collectEditMode = (node: ThemeNode, inEdit: boolean): void => {
    const edit = inEdit || node.attributes.libraryMode?.value === "edit";
    if (node.local === "MetadataEditor" && edit) hasEditEditor = true;
    if (node.attributes.command?.value === "wmm.ui.toggleEditMode") {
      editToggles.push(node);
    }
    for (const child of childrenOf(node)) collectEditMode(child, edit);
  };
  collectEditMode(root, false);
  for (const toggle of hasEditEditor ? [] : editToggles) {
    report(
      "W6209",
      `wmm.ui.toggleEditMode has nothing to show: no <MetadataEditor> renders in libraryMode="edit".`,
      toggle,
      IssueSeverity.Warning
    );
  }
  for (const panel of collapsiblePanels) {
    const id = panel.attributes.id.value;
    const inside = new Set(descendantsOf(panel));
    const reachable = toggleTargets.some(
      ({ target, node }) => target === id && !inside.has(node)
    );
    if (reachable) continue;
    report(
      "W6207",
      `Collapsible <${panel.name} id="${id}"> has no wmm.ui.togglePanel button outside it, so it can never open.`,
      panel,
      IssueSeverity.Warning
    );
  }
  return issues;
}
