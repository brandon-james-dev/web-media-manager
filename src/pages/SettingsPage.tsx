import { useEffect, useState } from "react";
import { getMetadataStore } from "@/lib";
import type { Directory } from "@/models";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";

function SettingsPage() {
  const [directories, setDirectories] = useState<Directory[]>([]);

  useEffect(() => {
    const store = getMetadataStore() as CombinedMetadataStore;
    store.getDirectories().then(setDirectories);

    const unsubDirDeleted = store.onDirectoryDeleted(refresh);
    const unsubDirCleared = store.onDirectoriesCleared(refresh);

    return () => {
      unsubDirDeleted();
      unsubDirCleared();
    };
  }, []);

  async function refresh(dir?: Directory) {
    const store = getMetadataStore() as CombinedMetadataStore;
    const directories = await store.getDirectories();
    if (dir) {
      setDirectories(directories.filter((d) => d.id != dir?.id));
    } else {
      setDirectories(directories);
    }
  }

  async function handleClearDb(e: React.SubmitEvent) {
    e.preventDefault();

    const store = getMetadataStore();
    await store.clearStore();
    await refresh();

    alert("Database cleared.");
  }

  async function handleRemoveDirectory(id: string) {
    const store = getMetadataStore() as CombinedMetadataStore;
    await store.deleteDirectory(id);
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1 className="page-title">Settings</h1>

      <form onSubmit={handleClearDb} style={{ marginTop: "2rem" }}>
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Clear Song Database
        </button>
      </form>

      <h2 style={{ marginTop: "2rem" }}>Music Directories</h2>

      {directories.length === 0 && <p>No directories added.</p>}

      <ul style={{ marginTop: "1rem", paddingLeft: "1rem" }}>
        {directories.map((dir) => (
          <li key={dir.directoryName} style={{ marginBottom: "0.5rem" }}>
            <strong>{dir.directoryName}</strong>

            <button
              onClick={() => handleRemoveDirectory(dir.id)}
              style={{
                marginLeft: "1rem",
                padding: "0.25rem 0.5rem",
                background: "#c62828",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SettingsPage;
