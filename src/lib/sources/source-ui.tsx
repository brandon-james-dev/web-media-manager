/**
 * Per-source-kind presentation (icon + badge) — the UI face of a music
 * source kind. Kept separate from `IMusicSourceStrategy`/the strategy
 * classes so the strategies stay UI-free (and thus web-worker-safe:
 * `runBulkImport`/`runArtworkProcess` import them).
 */
import type { ReactNode } from "react";
import { Cpu, FolderOpen, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MusicSourceKind } from "@/core/contracts";

const KIND_ICON: Record<MusicSourceKind, ReactNode> = {
  local: <FolderOpen className="h-8 w-8" />,
  subsonic: <Server className="h-8 w-8" />,
  server: <Cpu className="h-8 w-8" />,
};

const KIND_BADGE: Record<MusicSourceKind, ReactNode> = {
  local: (
    <Badge variant="secondary">
      <FolderOpen />
      On device
    </Badge>
  ),
  subsonic: (
    <Badge variant="secondary">
      <Server />
      Subsonic
    </Badge>
  ),
  server: (
    <Badge variant="secondary">
      <Cpu />
      Server
    </Badge>
  ),
};

/** Icon shown on the source-type card in the add-source dialog. */
export function sourceKindIcon(kind: MusicSourceKind): ReactNode {
  return KIND_ICON[kind];
}

/** Badge element naming this source kind, e.g. for the Settings list. */
export function sourceKindBadge(kind: MusicSourceKind): ReactNode {
  return KIND_BADGE[kind];
}
