import type { PluginProviderDescriptor } from "./PluginProvider";
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
 * Plugin kinds share one install/validate/store pipeline. `visualizer` is
 * executable and names a runtime plus an entry file; the other kinds are
 * declarative and describe what they contribute through `provider`.
 */
export type PluginKind =
  | "visualizer"
  | "theme"
  | "layout"
  | "lyrics"
  | "source"
  | "metadata";

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
      /**
       * Render as a password input and keep the value out of the settings row:
       * the host stores it in the platform secret store, keyed by plugin id.
       * A header template references it like any other setting.
       */
      secret?: boolean;
    });

export type PluginSettingValue = number | boolean | string;

export type PluginSettingsValues = Record<string, PluginSettingValue>;

export interface VisualizerPluginManifest {
  /** Stable, URL-safe identifier; also the Dexie primary key. */
  id: string;
  name: string;
  version: string;
  /** Executable plugins only: the runtime that mounts `entry`. */
  runtime?: VisualizerRuntime;
  /** Executable plugins only: archive-relative path of the file to execute. */
  entry?: string;
  /** Archive-relative path of a preview image. */
  thumbnail?: string;
  /** Optional vertex shader for `webgl-shader` plugins. */
  vertex?: string;
  author?: string;
  description?: string;
  homepage?: string;
  license?: string;
  kind?: PluginKind;
  /** Declarative plugins only: what the plugin contributes to the host. */
  provider?: PluginProviderDescriptor;
  settings?: PluginSettingDescriptor[];
}
