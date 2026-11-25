/**
 * Elements that own their own click. A tap that lands on one of these must not
 * also toggle the playback chrome, or pressing play would hide the controls.
 */
const INTERACTIVE_SELECTOR =
  "button, a, li, [role='slider'], [data-no-bg-click]";

/**
 * Whether a click on `target` counts as a tap on empty space.
 *
 * The now-playing overlay and the player bar are separate portals stacked on
 * top of each other, so both need this check to make a tap anywhere on a phone
 * toggle the controls.
 */
export function isBackgroundClick(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  return target.closest(INTERACTIVE_SELECTOR) === null;
}
