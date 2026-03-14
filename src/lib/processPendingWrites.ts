import { mediaDb } from "@/data";
import { get } from "idb-keyval";
import { ALL_FORMATS, BlobSource, FilePathSource, Input, Mp3OutputFormat, Output, StreamTarget } from "mediabunny";

async function ensureDirPermission(dir: any) {
    const opts = { mode: "readwrite" };

    const q = await dir.queryPermission(opts);
    if (q === "granted") return true;

    const r = await dir.requestPermission(opts);
    if (r === "granted") return true;

    throw new Error("Directory permission denied");
}

export async function fileHandleToMediaStreamTrack(
  fileHandle: FileSystemFileHandle
): Promise<MediaStreamAudioTrack> {
  const file = await fileHandle.getFile();
  const arrayBuffer = await file.arrayBuffer();

  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const dest = ctx.createMediaStreamDestination();
  const source = ctx.createBufferSource();

  source.buffer = audioBuffer;
  source.connect(dest);
  source.start();
  
  return dest.stream.getAudioTracks()[0];
}

export async function processPendingWrites() {
    const jobs = await mediaDb.pendingWrites.orderBy("createdAt").toArray();

    for (const job of jobs) {
        const song = await mediaDb.songs.get(job.songId);
        if (!song) continue;

        try {
            const directoryHandle = await get<FileSystemDirectoryHandle>('root-directory');

            if (!directoryHandle) return;

            await ensureDirPermission(directoryHandle);

            const fileHandle = await directoryHandle.getFileHandle(job.songId);
            const blob = await fileHandle.getFile();
            
            const input = new Input({
                formats: ALL_FORMATS,
                source: new BlobSource(blob)
            });

            const inputAudioTrack = await input.getPrimaryAudioTrack();
            const format = await input.getFormat();
            
            if (inputAudioTrack == null) return;

            const track = await fileHandleToMediaStreamTrack(fileHandle);

            const writableStream = await fileHandle.createWritable();

            const updated = new Output({
                format: new Mp3OutputFormat(),
                target: new StreamTarget(writableStream)
            });

            let fileSource = new FilePathSource("blob");
            if (fileSource == null) return;

            // updated.addAudioTrack(fileSource);
            // updated.setMetadataTags(job.tags);
            await updated.start();
            await updated.finalize();
            
            await mediaDb.songs.update(song.id, { tags: job.tags });
        } catch (err) {
            console.error("Failed to write tags:", err);
        }

        await mediaDb.pendingWrites.delete(job.id!);
    }
}
