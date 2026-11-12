import type { FavoriteOrigin } from "@/models";

export function hasLocalFavorite(origin: FavoriteOrigin | undefined): boolean {
  return origin !== "server";
}

export function mergeOrigin(
  current: FavoriteOrigin | undefined,
  added: "local" | "server"
): FavoriteOrigin {
  const existing = current ?? "local";
  return existing === added ? existing : "both";
}
