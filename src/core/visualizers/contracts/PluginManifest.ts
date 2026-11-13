import type { VisualizerRuntime } from "./VisualizerRuntime";

/**
 * `manifest.json` — the single source of truth for an installed plugin.
 *
 * Everything the app needs to list, validate, load and configure a plugin is
 * declared here, so the host never guesses from file names. Unknown fields are
 * ignored, which keeps older app versions able to install newer manifests.
 */
export const PLUGIN_MANIFEST_FILE = "manifest.json";

/**
 * Plugin kinds share one install/validate/store pipeline. Only `visualizer`
 * is rendered today; `theme` and `layout` are declared so those plugins can be
 * installed by the same manager once their hosts exist.
 */
export type PluginKind = "visualizer" | "theme" | "layout";

export interface PluginSettingOption {
  value: string;
  label: string;
}

interface PluginSettingBase {
  key: string;
  label: string;
  description?: string;
}

export type PluginSettingDescriptor =
  | (PluginSettingBase & {
      type: "number";
      default: number;
      min?: number;
      max?: number;
      step?: number;
    })
  | (PluginSettingBase & { type: "boolean"; default: boolean })
  | (PluginSettingBase & {
      type: "select";
      default: string;
      options: PluginSettingOption[];
    })
  | (PluginSettingBase & { type: "color"; default: string })
  | (PluginSettingBase & {
      type: "string";
      default: string;
      maxLength?: number;
    });

export type PluginSettingValue = number | boolean | string;

export type PluginSettingsValues = Record<string, PluginSettingValue>;

export interface VisualizerPluginManifest {
  /** Stable, URL-safe identifier; also the Dexie primary key. */
  id: string;
  name: string;
  version: string;
  runtime: VisualizerRuntime;
  /** Archive-relative path of the file the runtime executes. */
  entry: string;
  /** Archive-relative path of a preview image. */
  thumbnail?: string;
  /** Optional vertex shader for `webgl-shader` plugins. */
  vertex?: string;
  author?: string;
  description?: string;
  homepage?: string;
  license?: string;
  kind?: PluginKind;
  settings?: PluginSettingDescriptor[];
}
