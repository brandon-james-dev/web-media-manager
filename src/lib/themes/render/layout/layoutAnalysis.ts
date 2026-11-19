import type { IRNode } from "../../ir";
import { attrBool, attrString } from "./attributes";

/**
 * One page of a compiled layout, with the presentation facts the renderer
 * needs. `overlay` pages cover the Shell instead of rendering in the
 * `PageHost`, and `openOnPlay` asks the host to open them when playback
 * starts.
 *
 * @example
 * ```xml
 * <Page id="now-playing" role="nowPlaying" titleKey="playback.nowPlaying"
 *       presentation="overlay" openOnPlay="true"> ... </Page>
 * ```
 * @example
 * ```ts
 * const page: LayoutPage = {
 *   id: "now-playing",
 *   role: "nowPlaying",
 *   node,
 *   overlay: true,
 *   openOnPlay: true,
 *   titleKey: "playback.nowPlaying",
 * };
 * ```
 */
export interface LayoutPage {
  /** The page id, which is also the `wmm.ui.navigate` parameter. */
  readonly id: string;
  /** The app navigation intent the page answers, when it declares one. */
  readonly role?: string;
  /** The compiled `<Page>` node. */
  readonly node: IRNode;
  /** Whether the page covers the Shell instead of rendering in the host. */
  readonly overlay: boolean;
  /** Whether playback starting opens the page. */
  readonly openOnPlay: boolean;
  /** The resource key used for the document title and announcements. */
  readonly titleKey?: string;
}

/**
 * The structure of one compiled layout: its Shell, its pages, the page the
 * host shows first, the collapsible panels a toggle can target, and whether
 * the layout already offers a way into Settings.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell><PageHost /></Shell>
 *   <Page id="library" role="library" titleKey="navigation.library" default="true" />
 * </Layout>
 * ```
 * @example
 * ```ts
 * const analysis = analyzeLayout(layout);
 * analysis.defaultPageId; // "library"
 * analysis.hasPageHost; // true
 * ```
 */
export interface LayoutAnalysis {
  /** The always-visible part of the layout. */
  readonly shell: IRNode;
  /** The pages, in document order. */
  readonly pages: LayoutPage[];
  /** The page the host shows first, when the layout declares any. */
  readonly defaultPageId: string | undefined;
  /** The ids of the `Panel collapsible="true"` elements. */
  readonly collapsiblePanelIds: string[];
  /** Whether the layout already contains a Settings button. */
  readonly hasSettingsButton: boolean;
  /** Whether the Shell contains a `PageHost`. */
  readonly hasPageHost: boolean;
}

/**
 * Reads the structure of a compiled layout tree. The default page is the one
 * marked `default="true"`, otherwise the first page. A layout with no pages
 * renders its Shell alone.
 *
 * @example
 * ```xml
 * <Shell><DockPanel><PageHost dock="fill" /></DockPanel></Shell>
 * ```
 * @example
 * ```ts
 * const { shell, pages, defaultPageId } = analyzeLayout(layout);
 * const overlay = pages.find((page) => page.overlay);
 * ```
 */
export function analyzeLayout(root: IRNode): LayoutAnalysis {
  const shell =
    root.children.find((child) => child.element === "Shell") ?? root;
  const pages = root.children
    .filter((child) => child.element === "Page")
    .map(toPage);

  const collapsiblePanelIds: string[] = [];
  let hasSettingsButton = false;
  let hasPageHost = false;

  walk(shell, (node) => {
    if (node.element === "PageHost") hasPageHost = true;
    if (node.element === "Button" && isSettingsButton(node)) {
      hasSettingsButton = true;
    }
    if (node.element === "Panel" && attrBool(node, "collapsible") === true) {
      const id = attrString(node, "id");
      if (id !== undefined) collapsiblePanelIds.push(id);
    }
  });

  for (const page of pages) {
    walk(page.node, (node) => {
      if (node.element === "Button" && isSettingsButton(node)) {
        hasSettingsButton = true;
      }
      if (node.element === "Panel" && attrBool(node, "collapsible") === true) {
        const id = attrString(node, "id");
        if (id !== undefined) collapsiblePanelIds.push(id);
      }
    });
  }

  return {
    shell,
    pages,
    defaultPageId: defaultPageId(pages),
    collapsiblePanelIds,
    hasSettingsButton,
    hasPageHost,
  };
}

/** One `<Page>` node as a {@link LayoutPage}. */
function toPage(node: IRNode): LayoutPage {
  const role = attrString(node, "role");
  const titleKey = attrString(node, "titleKey");
  return {
    id: attrString(node, "id") ?? "",
    ...(role === undefined ? {} : { role }),
    node,
    overlay: attrString(node, "presentation") === "overlay",
    openOnPlay: attrBool(node, "openOnPlay") ?? false,
    ...(titleKey === undefined ? {} : { titleKey }),
  };
}

/** The page the host shows first. */
function defaultPageId(pages: readonly LayoutPage[]): string | undefined {
  const marked = pages.find((page) => attrBool(page.node, "default") === true);
  return (marked ?? pages[0])?.id;
}

/** Whether the button opens the host Settings page. */
function isSettingsButton(node: IRNode): boolean {
  return attrString(node, "command") === "wmm.ui.openSettings";
}

/** Visits every node of a tree in document order. */
function walk(node: IRNode, visit: (node: IRNode) => void): void {
  visit(node);
  for (const child of node.children) walk(child, visit);
}
