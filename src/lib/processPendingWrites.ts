import { mediaDb } from "@/data";
import { get } from "idb-keyval";
import { ID3Writer } from 'browser-id3-writer';

async function ensureDirPermission(dir: any) {
    const opts = { mode: "readwrite" };

    const q = await dir.queryPermission(opts);
    if (q === "granted") return true;

    const r = await dir.requestPermission(opts);
    if (r === "granted") return true;

    throw new Error("Directory permission denied");
}

function stripExistingId3v2Tag(arrayBuffer: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(arrayBuffer);

  // Check for "ID3" header
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const size =
      (bytes[6] << 21) |
      (bytes[7] << 14) |
      (bytes[8] << 7) |
      bytes[9];

    const startOfAudio = 10 + size;
    return arrayBuffer.slice(startOfAudio);
  }

  return arrayBuffer; // no tag found
}

export async function processPendingWrites() {
    const jobs = await mediaDb.pendingWrites.orderBy("createdAt").toArray();

    for (const job of jobs) {
        const song = await mediaDb.songs.get(job.songId);
        
        if (!song) continue;

        const updatedTags = job.tags;

        if (!updatedTags) continue;

        try {
            const directoryHandle = await get<FileSystemDirectoryHandle>('root-directory');

            if (!directoryHandle) return;

            await ensureDirPermission(directoryHandle);

            //#region Update backing file
            const fileHandle = await directoryHandle.getFileHandle(job.songId);
            
            const file = await fileHandle.getFile();
            const originalBuffer = await file.arrayBuffer();
            const audioOnlyBuffer = stripExistingId3v2Tag(originalBuffer);
            const writer = new ID3Writer(audioOnlyBuffer);

            if (updatedTags.title) writer.setFrame("TIT2", updatedTags.title);
            if (updatedTags.artist) writer.setFrame("TPE1", [updatedTags.artist]);
            if (updatedTags.album) writer.setFrame("TALB", updatedTags.album);
            if (updatedTags.albumArtist) writer.setFrame("TPE2", updatedTags.albumArtist);
            if (updatedTags.track) writer.setFrame("TRCK", updatedTags.track);
            if (updatedTags.disc) writer.setFrame("TPOS", updatedTags.disc);
            if (updatedTags.year) writer.setFrame("TYER", updatedTags.year);
            if (updatedTags.genre) writer.setFrame("TCON", [updatedTags.genre]);
            if (updatedTags.comment) {
                writer.setFrame("COMM", {
                    description: "",
                    text: updatedTags.comment
                });
            }
            if (updatedTags.composer) writer.setFrame("TCOM", [updatedTags.composer]);
            if (updatedTags.bpm) writer.setFrame("TBPM", updatedTags.bpm);
            if (updatedTags.lyrics) {
                writer.setFrame("USLT", {
                    description: "",
                    lyrics: updatedTags.lyrics
                });
            }
            if (updatedTags.copyright) writer.setFrame("TCOP", updatedTags.copyright);
            // if (updatedTags.encoder) writer.setFrame("TENC", updatedTags.encoder);

            writer.addTag();

            const updatedBlob = writer.getBlob();

            const writable = await fileHandle.createWritable();
            await writable.write(updatedBlob);
            await writable.close();
            //#endregion
            //#region Update database
            await mediaDb.songs.update(song.id, { tags: job.tags });
            //#endregion
        } catch (err) {
            console.error("Failed to write tags:", err);
        }

        await mediaDb.pendingWrites.delete(job.id!);
    }
}
