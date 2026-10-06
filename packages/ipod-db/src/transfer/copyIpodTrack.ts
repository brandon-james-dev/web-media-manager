import { parseITunesDb } from "../itunesdb";

export async function copyIpodTrack(
  rootHandle: FileSystemDirectoryHandle,
  sourceFile: File
) {
  const folder = await getMusicFolder(rootHandle);
  const extension = getExtension(sourceFile.name);
  const target = await folder.getFileHandle(`TEST${extension}`, {
    create: true,
  });

  const writable = await target.createWritable();
  await writable.write(await sourceFile.arrayBuffer());
  await writable.close();

  const db = await parseITunesDb(rootHandle);

  const nextTrack = {
    id: Math.max(...db.tracks.map((track) => track.id ?? 0)) + 1,

    title: "TEST",
    artist: "TEST",
    album: "TEST",

    durationMs: 0,
    sizeBytes: sourceFile.size,

    dbPath: ":iPod_Control:Music:F00:TEST.mp3",

    filePath: "iPod_Control/Music/F00/TEST.mp3",
  };

  db.tracks.push(nextTrack);

  console.log(JSON.stringify(db, null, 2));
}

async function getMusicFolder(rootHandle: FileSystemDirectoryHandle) {
  const ipodControl = await rootHandle.getDirectoryHandle("iPod_Control");
  const music = await ipodControl.getDirectoryHandle("Music");
  return music.getDirectoryHandle("F00");
}

function getExtension(filename: string) {
  const index = filename.lastIndexOf(".");

  return index >= 0 ? filename.slice(index) : "";
}

// function createIpodTrack(
//   song: {
//     title: string;
//     artist: string;
//     album: string;
//     genre: string;
//     year: number;
//     length: number;
//   },
//   file: File,
//   destinationPath: string,
//   nextTrackId: number
// ): IpodTrack {
//   return {
//     id: nextTrackId,

//     title: song.title,
//     artist: song.artist,
//     album: song.album,
//     genre: song.genre,

//     year: song.year,

//     durationMs: song.length,
//     sizeBytes: file.size,

//     fileType: file.name.split(".").pop(),

//     dbPath: destinationPath,
//     filePath: destinationPath,
//   };
// }
