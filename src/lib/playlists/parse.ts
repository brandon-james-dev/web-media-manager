/**
 * Parse M3U8/M3U text into a lightweight playlist result.
 *
 * Returns ordered entries: for each track line, the relative path and any
 * preceding `#EXTINF` title/duration (or undefined if absent).
 */
export interface M3uEntry {
  path: string;
  title?: string;
  duration?: number;
}

export interface ParseM3uResult {
  entries: M3uEntry[];
  format: "m3u8" | "m3u";
}

export function parseM3u(text: string): ParseM3uResult {
  const lines = text.split(/\r?\n/);
  const format: "m3u8" | "m3u" = text
    .slice(0, 200)
    .toLowerCase()
    .includes("#extm3u")
    ? "m3u8"
    : "m3u";

  const entries: M3uEntry[] = [];
  let pendingExtinf: { title?: string; duration?: number } | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      if (line.toLowerCase().startsWith("#extinf:")) {
        const rest = line.slice("#EXTINF:".length);
        const comma = rest.indexOf(",");
        if (comma > 0) {
          const durationRaw = rest.slice(0, comma).trim();
          const duration =
            durationRaw && durationRaw !== "-1"
              ? Number(durationRaw)
              : undefined;
          pendingExtinf = {
            duration: isNaN(duration as number) ? undefined : duration,
            title: rest.slice(comma + 1).trim() || undefined,
          };
        }
      }
      continue;
    }
    // Track line (relative path or URL).
    const path = line.replace(/\\/g, "/");
    entries.push({ path, ...pendingExtinf });
    pendingExtinf = undefined;
  }

  return { entries, format };
}
