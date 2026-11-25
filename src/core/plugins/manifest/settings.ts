import type {
  PluginSettingDescriptor,
  PluginSettingsValues,
} from "../contracts/PluginManifest";

/** Settings declared by a manifest, with their defaults applied. */
export function getDefaultSettings(
  descriptors: readonly PluginSettingDescriptor[] | undefined
): PluginSettingsValues {
  const values: PluginSettingsValues = {};

  for (const descriptor of descriptors ?? []) {
    values[descriptor.key] = descriptor.default;
  }

  return values;
}

/**
 * Keep only values the manifest declares, coerced to the declared type.
 * Unknown keys are dropped so a stale stored blob can never inject settings a
 * plugin does not understand.
 */
export function coerceSettingsValues(
  descriptors: readonly PluginSettingDescriptor[] | undefined,
  values: PluginSettingsValues | undefined
): PluginSettingsValues {
  const coerced = getDefaultSettings(descriptors);
  if (!values) {
    return coerced;
  }

  for (const descriptor of descriptors ?? []) {
    const value = values[descriptor.key];
    if (value === undefined) {
      continue;
    }

    switch (descriptor.type) {
      case "number": {
        if (typeof value === "number" && Number.isFinite(value)) {
          const min = descriptor.min ?? Number.NEGATIVE_INFINITY;
          const max = descriptor.max ?? Number.POSITIVE_INFINITY;
          coerced[descriptor.key] = Math.min(max, Math.max(min, value));
        }
        break;
      }
      case "boolean": {
        if (typeof value === "boolean") {
          coerced[descriptor.key] = value;
        }
        break;
      }
      case "select": {
        if (
          typeof value === "string" &&
          descriptor.options.some((option) => option.value === value)
        ) {
          coerced[descriptor.key] = value;
        }
        break;
      }
      case "color": {
        if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) {
          coerced[descriptor.key] = value;
        }
        break;
      }
      case "string": {
        if (typeof value === "string") {
          coerced[descriptor.key] = descriptor.maxLength
            ? value.slice(0, descriptor.maxLength)
            : value;
        }
        break;
      }
    }
  }

  return coerced;
}
