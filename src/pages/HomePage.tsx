import { useState } from "react";
import type { Song } from "@/models/Song";
import { SongTable, Progress } from "@/components";
import { importFiles } from "@/lib/importFiles";
import { TagLibMetadataReader } from "@/lib/taglib-metadata-utils/TagLibMetadataReader";

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [status, setStatus] = useState<string>("");
  const [directoryHandle, setDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<
    FileSystemDirectoryHandle[]
  >([]);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

      <Progress fileIndex={progressIndex} totalFiles={progressTotal} />

      <button type="button" onClick={handlePickDirectory}>
        Select Directory
      </button>

      <form onSubmit={handleSubmit}>
        <button type="submit">Import</button>
      </form>

      <div style={{ marginTop: "0.5rem" }}>{status}</div>

      <SongTable songs={songs} />
    </div>
  );
}

export default HomePage;
