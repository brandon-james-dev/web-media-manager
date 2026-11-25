import { MetadataProvider } from "./MetadataProvider";

/**
 * Build the query string a provider's service expects.
 *
 * iTunes takes a plain full-text phrase. MusicBrainz and every plugin provider
 * take the structured `title|artist|album` shape and split it themselves, so
 * an empty field keeps its slot.
 *
 * @example
 * ```ts
 * buildMetadataSearchQuery("itunes", { title: "Amarillo", artist: "Strait" });
 * // "Amarillo Strait"
 * ```
 */
export function buildMetadataSearchQuery(
  provider: string,
  fields: { title?: string; artist?: string; album?: string }
): string {
  const parts = [fields.title, fields.artist, fields.album];

  if (provider === MetadataProvider.iTunes) {
    return parts.filter(Boolean).join(" ");
  }

  return parts.map((part) => part ?? "").join("|");
}
