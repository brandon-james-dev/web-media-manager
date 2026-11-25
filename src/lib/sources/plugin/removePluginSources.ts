import { getSourcesStore, getStore } from "@/core/ports";
import { deleteHiddenTracksForSource } from "@/lib/hidden-songs";
import { deletePluginSourceSecret } from "./PluginSourceStrategy";

/**
 * Delete every music source a plugin contributed, with its songs.
 *
 * Removing a source plugin leaves its sources pointing at a provider that no
 * longer exists: nothing can stream, sync or edit them, and the settings row
 * keeps rendering a source whose actions all fail. The sources go with the
 * plugin, in the same order the source-removal job uses — songs, hidden
 * entries, secret, then the source record — so a failure part-way leaves a
 * source with fewer songs rather than an orphaned library.
 *
 * @example
 * ```ts
 * const removed = await removeSourcesForPlugin("webdav-source");
 * ```
 */
export async function removeSourcesForPlugin(
  pluginId: string
): Promise<number> {
  const sources = (await getSourcesStore().getSources()).filter(
    (source) => source.kind === "plugin" && source.pluginId === pluginId
  );

  for (const source of sources) {
    const songs = await getStore().filter({
      filter: (song) => song.sourceId === source.id,
    });
    const ids = (songs.data ?? []).map((song) => song.id);

    if (ids.length > 0) {
      await getStore().batchDelete(ids);
    }

    await deleteHiddenTracksForSource(source.id);
    await deletePluginSourceSecret(source.id);
    await getSourcesStore().deleteSource(source.id);
  }

  return sources.length;
}
