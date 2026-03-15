import { mediaDb } from "@/data";

async function clearDb() {
  await mediaDb.songs.clear();
  await mediaDb.pendingImports.clear();
  await mediaDb.pendingWrites.clear();
}

export { clearDb };
