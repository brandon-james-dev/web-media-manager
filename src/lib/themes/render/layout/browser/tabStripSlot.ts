import { createContext, useContext } from "react";

/**
 * The element a `Tabs` strip keeps at its start, so the selected tab's widget
 * can place its own controls there. `null` outside a strip, and in a tab that
 * is not selected.
 *
 * @example
 * ```xml
 * <Tabs strip="top" stripAlign="end">
 *   <Tab id="visualizer" titleKey="visualizer.title">
 *     <Visualizer selector="true" settingsButton="true" />
 *   </Tab>
 * </Tabs>
 * ```
 * @example
 * ```tsx
 * <TabStripStartContext.Provider value={element}>
 *   <RenderNode node={child} />
 * </TabStripStartContext.Provider>
 * ```
 */
export const TabStripStartContext = createContext<HTMLElement | null>(null);

/**
 * The start slot of the `Tabs` strip the caller sits in, or `null` when the
 * caller is outside a strip or in a tab that is not selected.
 *
 * @example
 * ```xml
 * <Visualizer selector="true" settingsButton="true" />
 * ```
 * @example
 * ```tsx
 * const stripStart = useTabStripStart();
 * if (stripStart !== null) return createPortal(controls, stripStart);
 * ```
 */
export function useTabStripStart(): HTMLElement | null {
  return useContext(TabStripStartContext);
}

/**
 * The button class the `Tabs` strip draws its own tabs with, so the controls a
 * selected tab portals into the strip start take the same foreground and hover
 * colours. `undefined` when the strip names no `tabStyle` or the caller is
 * outside a strip.
 *
 * @example
 * ```xml
 * <Tabs strip="top" tabStyle="@button/tab">
 *   <Tab id="visualizer" titleKey="visualizer.title">
 *     <Visualizer selector="true" settingsButton="true" />
 *   </Tab>
 * </Tabs>
 * ```
 * @example
 * ```tsx
 * <TabStripButtonClassContext.Provider value={tabClass}>
 *   <RenderNode node={child} />
 * </TabStripButtonClassContext.Provider>
 * ```
 */
export const TabStripButtonClassContext = createContext<string | undefined>(
  undefined
);

/**
 * The button class of the `Tabs` strip the caller sits in, or `undefined` when
 * the caller is outside a strip or the strip names no `tabStyle`.
 *
 * @example
 * ```xml
 * <Visualizer selector="true" settingsButton="true" />
 * ```
 * @example
 * ```tsx
 * const stripButtonClass = useTabStripButtonClass();
 * <Button className={cn(stripButtonClass)} />
 * ```
 */
export function useTabStripButtonClass(): string | undefined {
  return useContext(TabStripButtonClassContext);
}
