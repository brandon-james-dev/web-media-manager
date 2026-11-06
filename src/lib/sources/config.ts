import type { MusicSource } from "@/models";
import type { RemoteSourceConfig } from "@/core/contracts";
import { musicSourceStrategies } from ".";
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
    config: "config" in source ? source.config : undefined,
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
  kind: MusicSource["kind"]
): IMusicSourceStrategy | null {
  return musicSourceStrategies.find((s) => s.kind === kind) ?? null;
}
