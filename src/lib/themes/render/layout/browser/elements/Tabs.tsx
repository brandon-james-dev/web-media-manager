import { useState } from "react";
import { cn } from "cn";
import { useTranslation } from "@/i18n";
import type { WmmResourceKey } from "@/i18n";
import {
  Tabs as TabsRoot,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { IconName } from "../../../../componentModel/iconNames";
import { attrBool, attrRef, attrString } from "../../attributes";
import { FILL_PLACEMENT } from "../../layoutStyle";
import { THEME_ICONS } from "../../themeIcons";
import type { ElementProps } from "../elementProps";
import { RenderNode } from "../renderNode";
import {
  TabStripButtonClassContext,
  TabStripStartContext,
} from "../tabStripSlot";
import { useThemeLayoutSnapshot, useThemeRender } from "../ThemeRenderContext";
import {
  FULLSCREEN_FADE_STYLE,
  useFullscreenHidden,
} from "../useFullscreenHidden";

/**
 * Switches between the `Tab` panels of the node. The selected tab is
 * remembered in the layout state, the strip follows `strip` and `stripAlign`,
 * and a `TabStripEnd` child is drawn beside the strip. The strip's start holds
 * the controls the selected tab's widget places there, such as a Visualizer's
 * picker and settings. A `hideInFullscreen` strip steps aside in full screen
 * while the selected tab's content stays, and a `TabStripEnd` stays visible
 * while the tabs step aside.
 *
 * @example
 * ```xml
 * <Tabs strip="top" stripAlign="center" tabStyle="@button/tab">
 *   <Tab id="queue" titleKey="playback.queue" icon="@icon/queue"><PlayQueue /></Tab>
 *   <Tab id="lyrics" titleKey="playback.lyrics" icon="@icon/lyrics"><Lyrics /></Tab>
 * </Tabs>
 * ```
 * @example
 * ```tsx
 * <RenderNode node={tabs} />
 * ```
 */
export function Tabs({ node, style }: ElementProps) {
  const { stylesheet, layoutState } = useThemeRender();
  const snapshot = useThemeLayoutSnapshot();
  const { get } = useTranslation();

  const tabsId = attrString(node, "id") ?? "";
  const tabs = node.children.filter((child) => child.element === "Tab");
  const stripEnd = node.children.find(
    (child) => child.element === "TabStripEnd"
  );
  const firstTabId = tabs.length === 0 ? "" : (attrString(tabs[0], "id") ?? "");
  const selected = snapshot.selectedTabs[tabsId] ?? firstTabId;

  const strip = attrString(node, "strip") ?? "top";
  const vertical = strip === "start" || strip === "end";
  const stripAlign = attrString(node, "stripAlign") ?? "start";
  const tabStyleId = attrRef(node, "tabStyle", "button");
  const tabClass =
    tabStyleId === undefined
      ? undefined
      : stylesheet.classes.button[tabStyleId];
  const stripHidden = useFullscreenHidden(
    attrBool(node, "hideInFullscreen") === true,
    snapshot.fullscreen
  );
  const [startElement, setStartElement] = useState<HTMLElement | null>(null);

  return (
    <TabsRoot
      value={selected}
      onValueChange={(value) => layoutState.selectTab(tabsId, String(value))}
      orientation={vertical ? "vertical" : "horizontal"}
      style={style}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          vertical && "flex-col items-stretch",
          vertical && stripAlign === "center" && "justify-center",
          vertical && stripAlign === "end" && "justify-end"
        )}
      >
        <div
          ref={setStartElement}
          className={cn(
            "flex min-w-0 items-center gap-1",
            !vertical && stripAlign === "end" && "me-auto",
            !vertical && stripAlign === "center" && "flex-1",
            stripHidden === "hidden" && "invisible pointer-events-none"
          )}
          style={stripHidden === "fading" ? FULLSCREEN_FADE_STYLE : undefined}
        />
        <TabsList
          className={cn(
            tabClass === undefined
              ? undefined
              : "bg-transparent p-0 group-data-horizontal/tabs:h-auto",
            stripHidden === "hidden" && "invisible pointer-events-none"
          )}
          style={stripHidden === "fading" ? FULLSCREEN_FADE_STYLE : undefined}
        >
          {tabs.map((tab) => {
            const id = attrString(tab, "id") ?? "";
            const iconId = attrRef(tab, "icon", "icon");
            const Icon =
              iconId === undefined
                ? undefined
                : THEME_ICONS[iconId as IconName];
            const titleKey = attrString(tab, "titleKey");
            return (
              <TabsTrigger
                key={id}
                value={id}
                className={tabClass}
                data-selected={selected === id ? "" : undefined}
              >
                {Icon === undefined ? null : <Icon aria-hidden />}
                <span>
                  {titleKey === undefined
                    ? ""
                    : get(titleKey as WmmResourceKey)}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {stripEnd?.children[0] === undefined ? null : (
          <div
            className={cn(
              !vertical && stripAlign === "center" && "flex flex-1 justify-end",
              !vertical && stripAlign === "start" && "ms-auto"
            )}
          >
            <RenderNode node={stripEnd.children[0]} />
          </div>
        )}
      </div>
      {tabs.map((tab) => {
        const id = attrString(tab, "id") ?? "";
        const child = tab.children[0];
        return (
          <TabsContent key={id} value={id} className="flex min-h-0 flex-col">
            <TabStripStartContext.Provider
              value={selected === id ? startElement : null}
            >
              <TabStripButtonClassContext.Provider value={tabClass}>
                {child === undefined ? null : (
                  <RenderNode node={child} placement={FILL_PLACEMENT} />
                )}
              </TabStripButtonClassContext.Provider>
            </TabStripStartContext.Provider>
          </TabsContent>
        );
      })}
    </TabsRoot>
  );
}
