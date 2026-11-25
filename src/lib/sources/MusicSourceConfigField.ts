/**
 * One input field a config-requiring source strategy declares. The caller
 * renders a standard config form from `MusicSourceConfigField[]`, so every
 * source that needs configuration shares the same form UI + validation.
 */
import type { WmmResourceKey } from "@/i18n";

export interface MusicSourceConfigField<TOptions = Record<string, unknown>> {
  /** Field key in the resulting config object. */
  name: string;
  /** Label shown next to the input. */
  label: string;
  /** Resource key of the label, so the form renders it translated. Absent for
   *  a plugin-declared field, whose label comes from its manifest. */
  labelKey?: WmmResourceKey;
  /** Native input type ("text" | "password" | "number"...). Use "folder"
   *  for a folder-picker button (e.g. the on-device source). Default "text". */
  type?: string;
  /** Placeholder shown in the input. */
  placeholder?: string;
  /** Resource key of the placeholder, when it is a word rather than an
   *  example value. */
  placeholderKey?: WmmResourceKey;
  /** HTML input attributes tweaks (e.g. autocomplete). */
  options?: TOptions;
  /** Redirect the field's input to a different config key than `name`. */
  path?: string;
  /** Whether the field must be filled in. Default true-ish for required. */
  required?: boolean;
  /** Extra per-field validation; return the resource key of an error message
   *  or null/undefined. */
  validate?(
    value: string,
    values: Record<string, string>
  ): WmmResourceKey | null | undefined | void;
}
