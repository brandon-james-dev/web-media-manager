export async function runBulkEdit(
  payload: any,
  reportProgress: (p: any) => void
) {
  const { songIds, edits } = payload;

  let processed = 0;

  for (const id of songIds) {
    // Load the song metadata (Dexie or file-based)
    const metadata = await loadSongMetadata(id);

    // Apply edits
    const updated = { ...metadata, ...edits };

    // Save back
    await saveSongMetadata(id, updated);

    processed++;

    reportProgress({
      processed,
      total: songIds.length,
      id,
    });
  }

  return { processed };
}

function loadSongMetadata(id: any): any {
  throw new Error("Function not implemented.");
}

function saveSongMetadata(id: any, updated: any): any {
  throw new Error("Function not implemented.");
}
