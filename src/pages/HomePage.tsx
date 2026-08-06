import { useState } from "react";
import type { Song } from "@/models/Song";
import { SongTable, Progress } from "@/components";
import { importFiles } from "@/lib/importFiles";
import { TagLibMetadataReader } from "@/lib/taglib-metadata-utils/TagLibMetadataReader";

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [status, setStatus] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setStatus(files.length ? `${files.length} files selected.` : "");
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const reader = new TagLibMetadataReader();

    if (!selectedFiles.length) {
      setStatus("No files selected.");
      return;
    }

    setProgressIndex(0);
    setProgressTotal(selectedFiles.length);
    setStatus("Starting import…");

    const imported = await importFiles(selectedFiles, reader, 10, {
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

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          directory="true"
          webkitdirectory="true"
          onChange={handleFileChange}
          style={{ marginRight: "0.5rem" }}
        />
        <button type="submit">Import</button>
      </form>

      <div style={{ marginTop: "0.5rem" }}>{status}</div>

      <SongTable songs={songs} />
    </div>
  );
}

export default HomePage;
