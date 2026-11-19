/**
 * The role an element plays in a layout. The category decides which
 * attribute sets apply and whether the element may have children.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal">
 *   <Button
 *     command="wmm.playback.playpause"
 *     labelKey="playback.playPause"
 *     icon="@icon/playPause"
 *   />
 *   <SeekBar />
 * </Stack>
 * ```
 * @example
 * ```ts
 * if (def.category === ElementCategory.Widget && node.children.length > 0) {
 *   report("E6070", node);
 * }
 * ```
 */
export const ElementCategory = {
  /**
   * The document root. Only `<Layout>`.
   *
   * @example
   * ```xml
   * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
   * ```
   */
  Root: "root",
  /**
   * Elements that shape the page model rather than draw anything:
   * `<Shell>`, `<Page>`, `<PageHost>`, `<Tab>` and `<TabStripEnd>`.
   *
   * @example
   * ```xml
   * <Shell>
   *   <DockPanel>
   *     <PageHost />
   *   </DockPanel>
   * </Shell>
   * ```
   */
  Structure: "structure",
  /**
   * Layout containers that arrange their children: `<Panel>`, `<Stack>`,
   * `<DockPanel>`, `<Grid>` and `<Tabs>`.
   *
   * @example
   * ```xml
   * <Grid columns="auto 1*" rows="1*">
   *   <LibraryBrowser column="0" />
   *   <TrackList column="1" />
   * </Grid>
   * ```
   */
  Primitive: "primitive",
  /**
   * Small leaf elements the theme configures directly: `<Button>`,
   * `<Text>` and `<Image>`.
   *
   * @example
   * ```xml
   * <Button
   *   command="wmm.playback.next"
   *   labelKey="playback.next"
   *   icon="@icon/next"
   * />
   * ```
   */
  Control: "control",
  /**
   * Host-rendered app components such as `<TrackList>` or `<SeekBar>`.
   * Widgets never have children (`E6070`).
   *
   * @example
   * ```xml
   * <VolumeControl width="120" />
   * ```
   */
  Widget: "widget",
} as const;

/**
 * One of the {@link ElementCategory} values.
 *
 * @example
 * ```ts
 * const category: ElementCategory = getElementDef("Grid")!.category;
 * ```
 */
export type ElementCategory =
  (typeof ElementCategory)[keyof typeof ElementCategory];
