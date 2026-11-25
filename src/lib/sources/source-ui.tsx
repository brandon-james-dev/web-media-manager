/**
 * Per-source-kind presentation (icon + badge) — the UI face of a music
 * source kind. Kept separate from `IMusicSourceStrategy`/the strategy
 * classes so the strategies stay UI-free (and thus web-worker-safe:
 * `runBulkImport`/`runArtworkProcess` import them).
 */
import type { ReactNode } from "react";
import { Cpu, FolderOpen, HardDrive, Puzzle, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { i18n } from "@/i18n";
import type { MusicSourceKind } from "@/core/contracts";

const KIND_ICON: Record<MusicSourceKind, ReactNode> = {
  local: <FolderOpen className="h-8 w-8" />,
  subsonic: <Server className="h-8 w-8" />,
  server: <Cpu className="h-8 w-8" />,
  sync: <HardDrive className="h-8 w-8" />,
  plugin: <Puzzle className="h-8 w-8" />,
};

const KIND_BADGE: Record<MusicSourceKind, () => ReactNode> = {
  local: () => (
    <Badge variant="secondary">
      <FolderOpen />
      {i18n.t("source.kindLocal")}
    </Badge>
  ),
  subsonic: () => (
    <Badge variant="secondary">
      <Server />
      Subsonic
    </Badge>
  ),
  server: () => (
    <Badge variant="secondary">
      <Cpu />
      {i18n.t("source.kindServer")}
    </Badge>
  ),
  sync: () => (
    <Badge variant="secondary">
      <HardDrive />
      {i18n.t("source.kindSync")}
    </Badge>
  ),
  plugin: () => (
    <Badge variant="secondary">
      <Puzzle />
      {i18n.t("source.kindPlugin")}
    </Badge>
  ),
};

/** Icon shown on the source-type card in the add-source dialog. */
export function sourceKindIcon(kind: MusicSourceKind): ReactNode {
  return KIND_ICON[kind];
}

/** Badge element naming this source kind, e.g. for the Settings list. */
export function sourceKindBadge(kind: MusicSourceKind): ReactNode {
  return KIND_BADGE[kind]();
}
