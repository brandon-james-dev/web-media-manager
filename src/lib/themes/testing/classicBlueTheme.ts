/**
 * Shared test fixture: the classic-blue `theme.xml` from
 * `docs/themes/08-example-classic-blue.md`.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0">
 *   <Palettes>...</Palettes>
 * </Theme>
 * ```
 * @example
 * ```ts
 * import { parseThemeXml } from "@/lib/themes/parser";
 * import { CLASSIC_BLUE_THEME_FILE, classicBlueTheme } from "@/lib/themes/testing/classicBlueTheme";
 *
 * const { root } = parseThemeXml(classicBlueTheme, {
 *   file: CLASSIC_BLUE_THEME_FILE,
 *   root: "Theme",
 *   spec: "1.0",
 * });
 * ```
 *
 * @module
 */

/**
 * Package path of the fixture theme.
 *
 * @example
 * ```ts
 * walkElements(root, CLASSIC_BLUE_THEME_FILE);
 * ```
 */
export const CLASSIC_BLUE_THEME_FILE = "theme.xml";

/**
 * Source text of the classic-blue `theme.xml`.
 *
 * @example
 * ```ts
 * const xml = classicBlueTheme.replace("<Defaults", "<Bogus");
 * ```
 */
export const classicBlueTheme = `<?xml version="1.0" encoding="UTF-8"?>
<Theme xmlns="urn:wmm:theme:1" spec="1.0">
  <Colors>
    <Color id="navy-950" value="#06122b" />
    <Color id="navy-900" value="#0b1a3a" />
    <Color id="navy-800" value="#12285a" />
    <Color id="navy-line" value="#2a4a8a" />
    <Color id="blue-600" value="#2f5fb8" />
    <Color id="blue-500" value="#3d7bea" />
    <Color id="blue-300" value="#9ec3ff" />
    <Color id="ice" value="#e8eefc" />
    <Color id="steel" value="#8aa0c8" />
  </Colors>

  <Palettes>
    <Palette scheme="dark">
      <Set slot="background" value="@color/navy-900" />
      <Set slot="foreground" value="@color/ice" />
      <Set slot="accent" value="@color/blue-500" />
      <Set slot="border" value="@color/navy-line" />
      <Set slot="card" value="@color/navy-800" />
      <Set slot="mutedForeground" value="@color/steel" />
      <Set slot="selection" value="#3d7bea55" />
      <Set slot="progressFill" value="@color/blue-300" />
    </Palette>
  </Palettes>

  <Metrics>
    <Length id="gap-sm" value="4" />
    <Length id="gap-md" value="8" />
    <Length id="radius" value="6" />
    <Length id="pane-width" value="200" />
    <Length id="title-height" value="36" />
    <Length id="transport-height" value="72" />
  </Metrics>

  <Fonts>
    <FontFamily id="ui" fallback="sansSerif">
      <Face src="assets/fonts/classic-sans-regular.woff2" weight="400" style="normal" />
      <Face src="assets/fonts/classic-sans-bold.woff2" weight="700" style="normal" />
    </FontFamily>
  </Fonts>

  <TextStyles>
    <TextStyle id="body" font="@font/ui" size="13" color="@slot/foreground" />
    <TextStyle id="caption" basedOn="@text/body" size="11" color="@slot/mutedForeground" />
    <TextStyle id="nav" basedOn="@text/body" weight="700" color="@color/blue-300" />
    <TextStyle id="pane-header" basedOn="@text/body" size="11" weight="700" transform="uppercase" letterSpacing="1" color="@color/steel" />
    <TextStyle id="logo" basedOn="@text/body" size="15" weight="700" letterSpacing="1" shadow="@shadow/glow" />
  </TextStyles>

  <Images>
    <Image id="chrome-frame" src="assets/images/frame.png" slice="12 12 12 12">
      <Variant scale="2" src="assets/images/frame@2x.png" />
    </Image>
    <Image id="logo" src="assets/images/logo.svg" />
    <Image id="play-orb" src="assets/images/play-orb.png">
      <Variant scale="2" src="assets/images/play-orb@2x.png" />
    </Image>
    <Image id="play-orb-hover" src="assets/images/play-orb-hover.png">
      <Variant scale="2" src="assets/images/play-orb-hover@2x.png" />
    </Image>
    <Image id="play-orb-down" src="assets/images/play-orb-down.png">
      <Variant scale="2" src="assets/images/play-orb-down@2x.png" />
    </Image>
    <Image id="pause-orb" src="assets/images/pause-orb.png">
      <Variant scale="2" src="assets/images/pause-orb@2x.png" />
    </Image>
    <Image id="task-pane" src="assets/images/task-pane.png" />
  </Images>

  <Brushes>
    <LinearGradient id="chrome-gloss" angle="180">
      <Stop offset="0" color="#5f8fe0" />
      <Stop offset="0.5" color="@color/blue-600" />
      <Stop offset="1" color="#1c3f94" />
    </LinearGradient>
    <LinearGradient id="chrome-gloss-hi" angle="180">
      <Stop offset="0" color="#7aa6f0" />
      <Stop offset="1" color="#2a55b0" />
    </LinearGradient>
    <LinearGradient id="chrome-gloss-down" angle="180">
      <Stop offset="0" color="#1c3f94" />
      <Stop offset="1" color="@color/blue-600" />
    </LinearGradient>
    <LinearGradient id="title-strip" angle="90">
      <Stop offset="0" color="@color/navy-950" />
      <Stop offset="1" color="@color/navy-800" />
    </LinearGradient>
    <ImageBrush id="frame" image="@image/chrome-frame" fit="nineSlice" />
    <ImageBrush id="task-pane" image="@image/task-pane" fit="stretch" />
  </Brushes>

  <Shadows>
    <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
    <Shadow id="inset" x="0" y="1" blur="3" spread="0" color="#00000080" inset="true" />
    <Shadow id="glow" x="0" y="0" blur="6" spread="0" color="#9ec3ff99" />
  </Shadows>

  <ButtonStyles>
    <ButtonStyle id="standard" background="transparent" foreground="@slot/foreground"
                 cornerRadius="@length/radius" padding="6" minWidth="28" minHeight="28"
                 iconSize="16" textStyle="@text/body">
      <State name="hover" background="#ffffff1a" />
      <State name="pressed" background="#00000033" />
      <State name="disabled" opacity="0.4" />
    </ButtonStyle>

    <ButtonStyle id="transport" background="@brush/chrome-gloss" foreground="#ffffff"
                 border="#0d2766" borderWidth="1" cornerRadius="16" padding="6"
                 minWidth="32" minHeight="32" iconSize="16" shadow="@shadow/raised">
      <State name="hover" background="@brush/chrome-gloss-hi" />
      <State name="pressed" background="@brush/chrome-gloss-down" shadow="@shadow/inset" />
      <State name="disabled" opacity="0.4" />
    </ButtonStyle>
    <ButtonStyle id="transport-touch" basedOn="@button/transport" minWidth="44" minHeight="44" iconSize="20" cornerRadius="22" />

    <ButtonStyle id="play-orb" image="@image/play-orb" minWidth="56" minHeight="56">
      <State name="hover" image="@image/play-orb-hover" />
      <State name="pressed" image="@image/play-orb-down" />
      <State name="active" image="@image/pause-orb" />
      <State name="disabled" opacity="0.4" />
    </ButtonStyle>

    <ButtonStyle id="nav" background="transparent" foreground="@color/blue-300"
                 cornerRadius="4" padding="6 10" minHeight="28" iconSize="16" textStyle="@text/nav">
      <State name="hover" background="#ffffff14" foreground="#ffffff" />
      <State name="selected" background="@brush/chrome-gloss" foreground="#ffffff" />
      <State name="pressed" background="@brush/chrome-gloss-down" foreground="#ffffff" />
    </ButtonStyle>
    <ButtonStyle id="nav-touch" basedOn="@button/nav" minWidth="44" minHeight="48" iconSize="20" padding="4" />
  </ButtonStyles>

  <PanelStyles>
    <PanelStyle id="chrome" background="@brush/frame" padding="10" />
    <PanelStyle id="title-strip" background="@brush/title-strip" padding="4 10" cornerRadius="6 6 0 0" />
    <PanelStyle id="task-pane" background="@brush/task-pane" padding="10 6" />
    <PanelStyle id="transport-bar" background="@brush/title-strip" border="@slot/border" borderWidth="1 0 0 0" padding="8 12" />
    <PanelStyle id="content" background="@slot/background" padding="@length/gap-md" />
    <PanelStyle id="inset" background="@slot/card" border="@slot/border" borderWidth="1"
                cornerRadius="4" padding="@length/gap-sm" shadow="@shadow/inset" />
  </PanelStyles>

  <Defaults button="@button/standard" panel="@panel/content" text="@text/body" />
</Theme>
`;
