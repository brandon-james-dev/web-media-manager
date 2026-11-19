import type { IRNode, ThemeIR } from "../../../ir";
import { PALETTE_VARIABLES } from "../../../runtime";
import { serializeTextStyle } from "../serializeValues";
import { themeClassName } from "../styleClassNames";
import type { BuildThemeStylesheetOptions, ThemeStylesheet } from "../types";
import {
  BUILTIN_BUTTON_CLASS,
  BUILTIN_PANEL_CLASS,
  BUILTIN_TEXT_CLASS,
  builtinRules,
} from "./builtinClasses";
import { buttonDeclarations } from "./buttonDeclarations";
import { classMap, defaultClass, rule, sortedIds, walk } from "./cssRules";
import { overrideDeclarations } from "./overrideDeclarations";
import { panelDeclarations } from "./panelDeclarations";
import { sliderDeclarations } from "./sliderDeclarations";
import {
  STATE_STAGES,
  hasFocusRing,
  stateOf,
  stateSelector,
} from "./stateRules";
import type { StyleContext } from "./styleContext";
import { textContext } from "./textDeclarations";

/**
 * Builds the one stylesheet a theme renders with: host-generated class names
 * per style id, the host built-in fallback classes, the per-node inline
 * overrides of the active layout, and the state rules in precedence order.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" background="@brush/chrome-gloss">
 *   <State name="hover" background="@brush/chrome-gloss-hi" />
 * </ButtonStyle>
 * ```
 * @example
 * ```ts
 * const sheet = buildThemeStylesheet(ir, {
 *   formFactor: "desktop",
 *   images: (id) => loaded.get(id),
 * });
 * sheet.classes.button.transport; // "wmm-t-1x9f2a"
 * ```
 */
export function buildThemeStylesheet(
  ir: ThemeIR,
  options: BuildThemeStylesheetOptions
): ThemeStylesheet {
  const ctx: StyleContext = {
    ir,
    images: options.images,
    formFactor: options.formFactor,
  };

  const classes = {
    button: classMap(ir, "button", Object.keys(ir.buttonStyles)),
    panel: classMap(ir, "panel", Object.keys(ir.panelStyles)),
    slider: classMap(ir, "slider", Object.keys(ir.sliderStyles)),
    text: classMap(ir, "text", Object.keys(ir.textStyles)),
  };

  const defaults = {
    button: defaultClass(
      classes.button,
      ir.defaults.button,
      BUILTIN_BUTTON_CLASS
    ),
    panel: defaultClass(classes.panel, ir.defaults.panel, BUILTIN_PANEL_CLASS),
    text: defaultClass(classes.text, ir.defaults.text, BUILTIN_TEXT_CLASS),
  };

  const rules: string[] = [...builtinRules(options.formFactor)];

  for (const id of sortedIds(ir.textStyles)) {
    rules.push(
      rule(
        `.${classes.text[id]}`,
        serializeTextStyle(ir.textStyles[id], textContext(ir))
      )
    );
  }

  for (const id of sortedIds(ir.panelStyles)) {
    rules.push(
      rule(
        `.${classes.panel[id]}`,
        panelDeclarations(ir.panelStyles[id].base, ctx)
      )
    );
  }

  for (const id of sortedIds(ir.buttonStyles)) {
    rules.push(
      rule(
        `.${classes.button[id]}`,
        buttonDeclarations(ir.buttonStyles[id].base, ctx, true)
      )
    );
  }

  for (const id of sortedIds(ir.sliderStyles)) {
    rules.push(
      rule(
        `.${classes.slider[id]}`,
        sliderDeclarations(ir.sliderStyles[id].base, ctx)
      )
    );
  }

  const nodeClasses = new Map<IRNode, string>();
  const layout = ir.layouts[options.formFactor];
  if (layout !== undefined) {
    walk(layout, "0", (node, path) => {
      const declarations = overrideDeclarations(node.attributes, ctx);
      if (Object.keys(declarations).length === 0) return;
      const className = themeClassName(
        ir.themeId,
        ir.themeVersion,
        "node",
        path
      );
      nodeClasses.set(node, className);
      rules.push(rule(`.${className}`, declarations));
    });
  }

  for (const stage of STATE_STAGES) {
    if (stage === "hover" && options.formFactor !== "desktop") continue;
    for (const id of sortedIds(ir.buttonStyles)) {
      const style = ir.buttonStyles[id];
      const className = classes.button[id];
      const state = stateOf(style, stage);
      if (state !== undefined) {
        const selector = stateSelector(className, stage, state);
        if (selector !== undefined) {
          rules.push(
            rule(selector, buttonDeclarations(state.properties, ctx, false))
          );
        }
      }
      if (stage === "focused" && !hasFocusRing(style)) {
        rules.push(
          rule(`.${className}:where(:focus-visible)`, {
            outline: `2px solid var(${PALETTE_VARIABLES.ring[0]})`,
            "outline-offset": "2px",
          })
        );
      }
    }
    for (const id of sortedIds(ir.panelStyles)) {
      const style = ir.panelStyles[id];
      const state = stateOf(style, stage);
      if (state === undefined) continue;
      const selector = stateSelector(classes.panel[id], stage, state);
      if (selector !== undefined) {
        rules.push(rule(selector, panelDeclarations(state.properties, ctx)));
      }
    }
    for (const id of sortedIds(ir.sliderStyles)) {
      const style = ir.sliderStyles[id];
      const state = stateOf(style, stage);
      if (state === undefined) continue;
      const selector = stateSelector(classes.slider[id], stage, state);
      if (selector !== undefined) {
        rules.push(rule(selector, sliderDeclarations(state.properties, ctx)));
      }
    }
  }

  return { cssText: rules.join("\n"), classes, defaults, nodeClasses };
}
