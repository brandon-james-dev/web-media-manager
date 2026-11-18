import { cn } from "cn";
import { useTranslation } from "@/i18n";
import type { WmmResourceKey } from "@/i18n";
import { wmmBus } from "@/events";
import type { WmmCommandName, WmmCommandPayload } from "@/events";
import type { IconName } from "../../../../componentModel/iconNames";
import { attrRef, attrString } from "../../attributes";
import { buildCommandPayload } from "../../commandPayload";
import { isToggleCommand } from "../../buttonState";
import { resolveThemeIcon } from "../../themeIcons";
import type { ElementProps } from "../elementProps";
import { useButtonState } from "../useButtonState";
import { useThemeRender } from "../ThemeRenderContext";

/**
 * The class that hides a label visually while keeping it for assistive
 * technology, used when `display="icon"`.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.next" labelKey="playback.next" display="icon" />
 * ```
 * @example
 * ```ts
 * SCREEN_READER_ONLY; // "sr-only"
 * ```
 */
const SCREEN_READER_ONLY = "sr-only";

/**
 * A button that invokes one theme-invokable command. Its style class comes
 * from the theme's `@button/...` table, its host state from
 * {@link useButtonState}, and its icon swaps to the active face when the
 * command is on.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.playpause" labelKey="playback.playPause"
 *         icon="@icon/playPause" style="@button/transport" display="icon" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={button} />
 * ```
 */
export function ThemeButton({ node, style }: ElementProps) {
  const { stylesheet } = useThemeRender();
  const { get } = useTranslation();

  const command = attrString(node, "command") ?? "";
  const commandParameter = attrString(node, "commandParameter");
  const state = useButtonState(command, commandParameter);

  const styleId = attrRef(node, "style", "button");
  const buttonClass =
    styleId === undefined
      ? stylesheet.defaults.button
      : (stylesheet.classes.button[styleId] ?? stylesheet.defaults.button);
  const className = cn(buttonClass, stylesheet.nodeClasses.get(node));

  const labelKey = attrString(node, "labelKey");
  const label = labelKey === undefined ? "" : get(labelKey as WmmResourceKey);
  const display = attrString(node, "display") ?? "iconAndLabel";

  const iconId = attrRef(node, "icon", "icon");
  const Icon =
    iconId === undefined
      ? undefined
      : resolveThemeIcon(iconId as IconName, {
          active: state.active,
          ...(state.activeValue === undefined
            ? {}
            : { activeValue: state.activeValue }),
        });

  function handleClick(): void {
    const result = buildCommandPayload(command, commandParameter);
    if (!result.ok) {
      console.warn(`[themes] ${result.reason}`);
      return;
    }
    wmmBus.invoke(
      command as WmmCommandName,
      result.payload as WmmCommandPayload[WmmCommandName]
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-label={label}
      aria-pressed={isToggleCommand(command) ? state.active : undefined}
      data-active={state.active ? "" : undefined}
      data-active-value={state.activeValue}
      data-selected={state.selected ? "" : undefined}
      disabled={state.disabled}
      onClick={handleClick}
    >
      {Icon === undefined ? null : (
        <span
          aria-hidden
          style={{
            display:
              display === "label"
                ? "none"
                : "var(--wmm-icon-display, inline-flex)",
          }}
        >
          <Icon
            style={{
              width: "var(--wmm-icon-size, 1em)",
              height: "var(--wmm-icon-size, 1em)",
              fill: "var(--wmm-icon-fill, none)",
            }}
          />
        </span>
      )}
      <span
        className={display === "icon" ? SCREEN_READER_ONLY : undefined}
        style={{ display: "var(--wmm-label-display, inline)" }}
      >
        {label}
      </span>
      {state.badge === undefined ? null : (
        <span className="ml-1 rounded-full px-1 text-xs">{state.badge}</span>
      )}
    </button>
  );
}
