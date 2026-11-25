import { createEncryptedSecretStore } from "./encryptedSecretStore";

/**
 * Secret values a plugin's settings declare with `secret: true`.
 *
 * Kept apart from the `pluginSettings` row so an API key never lands in
 * plaintext storage, and namespaced separately from music source secrets so a
 * plugin id can never collide with a source id. The key is `pluginId:setting`.
 */
const pluginSettingSecrets = createEncryptedSecretStore("plugin-settings");

function secretKey(pluginId: string, settingKey: string): string {
  return `${pluginId}:${settingKey}`;
}

/** Store one secret setting value, encrypted at rest. */
export async function setPluginSettingSecret(
  pluginId: string,
  settingKey: string,
  value: string
): Promise<void> {
  await pluginSettingSecrets.setSecret(secretKey(pluginId, settingKey), value);
}

/** Read one secret setting value, or null when unset. */
export async function getPluginSettingSecret(
  pluginId: string,
  settingKey: string
): Promise<string | null> {
  return await pluginSettingSecrets.getSecret(secretKey(pluginId, settingKey));
}

/** Drop one secret setting value. */
export async function deletePluginSettingSecret(
  pluginId: string,
  settingKey: string
): Promise<void> {
  await pluginSettingSecrets.deleteSecret(secretKey(pluginId, settingKey));
}

/** Drop every secret setting a plugin stored, for removal or a reset. */
export async function clearPluginSettingSecrets(
  pluginId: string,
  settingKeys: readonly string[]
): Promise<void> {
  for (const settingKey of settingKeys) {
    await pluginSettingSecrets.deleteSecret(secretKey(pluginId, settingKey));
  }
}
