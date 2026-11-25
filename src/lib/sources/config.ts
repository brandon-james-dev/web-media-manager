import type { MusicSource } from "@/models";
import type { RemoteSourceConfig } from "@/core/contracts";
import type { PluginSourceProviderDescriptor } from "@/core/plugins";
import { allMusicSourceStrategies, musicSourceStrategies } from ".";
import { getPluginSourceProvider } from "./plugin/pluginSourceRegistry";
import { PluginSourceStrategy } from "./plugin/PluginSourceStrategy";
import type { IMusicSourceStrategy } from "./IMusicSourceStrategy";

/**
 * Generic config for an in-flight music-source import (bulk import /
 * thumbnail generation job payloads). Carries the source's own config plus
 * any transient auth secret, resolved on the main thread because web
 * workers can't read localStorage secrets.
 *
 * This is deliberately source-agnostic: a future source kind contributes its
 * config and (if it has one) a secret here, and the collectors/workers read
 * what they need generically instead of taking a subsonic-specific param.
 */
export interface MusicSourceImportConfig {
  sourceId: string;
  config: RemoteSourceConfig | undefined;
  secret?: string;
  /**
   * A plugin source's descriptor. The worker has no plugin store, so the
   * enqueueing strategy carries the descriptor it already holds into the job
   * payload and the worker builds the strategy from it.
   */
  sourceProvider?: PluginSourceProviderDescriptor;
}

/**
 * Resolve the generic import config for a music source. Reads the source's
 * own config and any per-kind auth secret (e.g. Subsonic's password in
 * localStorage). Called on the main thread so the secret is available;
 * pass the result to worker jobs that need it.
 */
export async function getMusicSourceImportConfig(
  source: MusicSource
): Promise<MusicSourceImportConfig> {
  return {
    sourceId: source.id,
    config:
      source.kind === "subsonic" || source.kind === "server"
        ? source.config
        : undefined,
    secret: await getSecretForSource(source),
  };
}

/** Resolve a source kind's auth secret via its strategy (main thread). */
async function getSecretForSource(
  source: MusicSource
): Promise<string | undefined> {
  return (await getStrategy(source.kind)?.getSecret?.(source)) ?? undefined;
}

/** Find the strategy for a source kind, or null when unsupported. */
export function getStrategy(
  kind: MusicSource["kind"],
  sourceProvider?: PluginSourceProviderDescriptor
): IMusicSourceStrategy | null {
  if (kind === "plugin") {
    return sourceProvider
      ? new PluginSourceStrategy(sourceProvider, "")
      : null;
  }
  return musicSourceStrategies.find((s) => s.kind === kind) ?? null;
}

/**
 * Find the strategy that serves one configured source.
 *
 * Plugin sources resolve through the installed-provider registry, so playback
 * and resync reach a plugin's strategy the same way they reach a built-in one.
 */
export function getStrategyForSource(
  source: MusicSource
): IMusicSourceStrategy | null {
  if (source.kind === "plugin") {
    const entry = getPluginSourceProvider(source.providerId);
    return entry
      ? new PluginSourceStrategy(entry.descriptor, entry.pluginId)
      : null;
  }
  return allMusicSourceStrategies.find((s) => s.kind === source.kind) ?? null;
}
