import type { Song } from "@/models/Song";
import SongTable from "@/components/SongTable/SongTable";
import { importFiles } from "@/lib/importFiles";
import { useState } from "react";
import { TagLibMetadataReader } from "@/lib/TagLibMetadataReader";
const reader = new TagLibMetadataReader();

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [status, setStatus] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setStatus(files.length ? `${files.length} files selected.` : "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFiles.length) {
      setStatus("No files selected.");
      return;
    }

    setStatus("Validating and importing…");

    const imported = await importFiles(selectedFiles, reader);

    setSongs((prev) => [...prev, ...imported]);
    setStatus(`${imported.length} files imported.`);
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Media Import</h1>

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
