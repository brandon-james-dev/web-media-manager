import { DockPanel } from "./elements/DockPanel";
import { Grid } from "./elements/Grid";
import { Image } from "./elements/Image";
import { PageHost } from "./elements/PageHost";
import { Panel } from "./elements/Panel";
import { SingleChild } from "./elements/singleChild";
import { Stack } from "./elements/Stack";
import { Tabs } from "./elements/Tabs";
import { Text } from "./elements/Text";
import { ThemeButton } from "./elements/ThemeButton";
import type { ElementComponent } from "./elementProps";

/**
 * The component that renders each layout element the theme can place.
 * Widgets join through {@link registerThemeWidgets}; one that never
 * registers is drawn by {@link RenderNode} as a placeholder.
 *
 * @example
 * ```xml
 * <Panel style="@panel/chrome"><Stack orientation="horizontal" /></Panel>
 * ```
 * @example
 * ```ts
 * const Component = elementRegistry.Panel;
 * ```
 */
export const elementRegistry: Record<string, ElementComponent> = {
  Shell: SingleChild,
  Page: SingleChild,
  PageHost,
  Panel,
  Stack,
  DockPanel,
  Grid,
  Tabs,
  Tab: SingleChild,
  TabStripEnd: SingleChild,
  Button: ThemeButton,
  Text,
  Image,
};

/**
 * Adds widget components to the registry. The app registers its widgets at
 * startup, so the renderer never imports app components itself. Returns a
 * disposer that removes the entries it added, if they are still the same.
 *
 * @example
 * ```xml
 * <SeekBar slider="@slider/seek" />
 * ```
 * @example
 * ```ts
 * registerThemeWidgets({ SeekBar: ThemeSeekBar });
 * ```
 */
export function registerThemeWidgets(
  widgets: Readonly<Record<string, ElementComponent>>
): () => void {
  Object.assign(elementRegistry, widgets);
  return () => {
    for (const [name, component] of Object.entries(widgets)) {
      if (elementRegistry[name] === component) delete elementRegistry[name];
    }
  };
}
