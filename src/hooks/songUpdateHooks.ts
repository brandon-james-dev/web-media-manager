import { mediaDb } from "@/data";

async function clearDb() {
  await mediaDb.songs.clear();
  await mediaDb.pendingImports.clear();
  await mediaDb.pendingWrites.clear();
  await mediaDb.thumbnails.clear();
  await mediaDb.pendingArt.clear();
}

export { clearDb };
