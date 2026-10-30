/**
 * MusicSource — the persisted entity for "where music comes from".
 *
 * Canonical shape lives in core/contracts/sources.ts; this re-export keeps
 * the model layer as the single import point for persistence/UI. The
 * directories table in the wmm store is migrated to sources (one table,
 * one repository), with `kind` discriminating local / subsonic / server
 * instances as they come online.
 */
export type {
  MusicSource,
  MusicSourceKind,
  LocalMusicSource,
  SubsonicMusicSource,
  WmmServerMusicSource,
  MusicSourceCapabilities,
  RemoteSourceConfig,
  MusicSourceBase,
} from "@/core/contracts/sources";
