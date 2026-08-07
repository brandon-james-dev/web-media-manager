import { useState } from "react";
import type { Song } from "@/models/Song";
import { SongTable, Progress } from "@/components";
import { importFiles } from "@/lib/importFiles";
import { TagLibMetadataReader } from "@/lib/taglib-metadata-utils/TagLibMetadataReader";
import { TagLibMetadataWriter } from "@/lib/taglib-metadata-utils";
import { applySongEdits } from "@/lib/applySongEdits";

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [status, setStatus] = useState<string>("");
  const [directoryHandle, setDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  async function handleEditSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSong) return;

    const formData = new FormData(event.currentTarget);

    const updates: Partial<Song> = {
      title: formData.get("title")?.toString() ?? "",
      artist: formData.get("artist")?.toString() ?? "",
      album: formData.get("album")?.toString() ?? "",
      track: Number(formData.get("track") ?? selectedSong.track),
      year: Number(formData.get("year") ?? selectedSong.year),
      genre: formData.get("genre")?.toString() ?? "",
    };

    const writer = new TagLibMetadataWriter();

    await applySongEdits(selectedSong, updates, writer, {
      onSongUpdated(updatedSong) {
        setSongs((prev) =>
          prev.map((s) => (s.id === updatedSong.id ? updatedSong : s))
        );
        setSelectedSong(updatedSong);
        setStatus("Song updated.");
      },
    });
  }

  async function handlePickDirectory() {
    if (!window.showDirectoryPicker) {
      throw new Error("File System Access API not supported.");
    }

    const dirHandle = await window.showDirectoryPicker({
      mode: "readwrite",
    });

    setDirectoryHandle(dirHandle);
    setStatus(`Directory selected: ${dirHandle.name}`);
  }

  async function* walkDirectory(
    dir: FileSystemDirectoryHandle
  ): AsyncGenerator<FileSystemFileHandle> {
    for await (const entry of dir.values()) {
      if (entry.kind === "file") {
        yield entry;
      } else if (entry.kind === "directory") {
        yield* walkDirectory(entry);
      }
    }
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const reader = new TagLibMetadataReader();

    if (!directoryHandle) {
      setStatus("No directory selected.");
      return;
    }

    setStatus("Scanning directory…");

    const handles: FileSystemFileHandle[] = [];
    for await (const fileHandle of walkDirectory(directoryHandle)) {
      handles.push(fileHandle);
    }

    setProgressIndex(0);
    setProgressTotal(handles.length);
    setStatus("Starting import…");

    const imported = await importFiles(handles, reader, 10, {
      onFileComplete(fileIndex, totalFiles) {
        setProgressIndex(fileIndex);
        setProgressTotal(totalFiles);
      },
    });

    setSongs((prev) => [...prev, ...imported]);
    setStatus(`Finished importing ${imported.length} files.`);
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Media Import</h1>

      {selectedSong && (
        <form
          key={selectedSong.id}
          onSubmit={handleEditSubmit}
          style={{ marginBottom: "1rem" }}
        >
          <h2>Edit Song</h2>

          <div>
            <label>Title</label>
            <input name="title" defaultValue={selectedSong.title} />
          </div>

          <div>
            <label>Artist</label>
            <input name="artist" defaultValue={selectedSong.artist} />
          </div>

          <div>
            <label>Album</label>
            <input name="album" defaultValue={selectedSong.album} />
          </div>

          <div>
            <label>Track</label>
            <input
              name="track"
              type="number"
              defaultValue={selectedSong.track}
            />
          </div>

          <div>
            <label>Year</label>
            <input name="year" type="number" defaultValue={selectedSong.year} />
          </div>

          <div>
            <label>Genre</label>
            <input name="genre" defaultValue={selectedSong.genre} />
          </div>

          <button type="submit" style={{ marginTop: "0.5rem" }}>
            Save Changes
          </button>
        </form>
      )}

      <Progress fileIndex={progressIndex} totalFiles={progressTotal} />

      <button type="button" onClick={handlePickDirectory}>
        Select Directory
      </button>

      <form onSubmit={handleSubmit}>
        <button type="submit">Import</button>
      </form>

      <div style={{ marginTop: "0.5rem" }}>{status}</div>
      <SongTable
        songs={songs}
        selectedSong={selectedSong}
        onSelectSong={setSelectedSong}
      />
    </div>
  );
}

export default HomePage;
