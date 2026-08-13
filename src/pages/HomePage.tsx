import "./HomePage.css";
import React, { useEffect, useState } from "react";
import { isValidAudioFile } from "taglib-wasm";
import useFileSystemAccess from "use-fs-access";
import {
  type FileOrDirectoryInfo,
  isApiSupported,
  showDirectoryPicker,
} from "use-fs-access/core";
import { uuidv7 } from "uuidv7";
import type { Song } from "@/models/Song";
import { SongTable, Progress } from "@/components";
import {
  applySongEdits,
  getMetadataStore,
  readSongFile,
  setStoreRootDirectory,
} from "@/lib";
import { backgroundService, eventBus } from "@/lib/background-jobs";
import { TagLibMetadataReader } from "@/lib/taglib-metadata-utils";
import { useSongs } from "@/providers";

export function HomePage() {
  const { songs } = useSongs();
  const [status, setStatus] = useState<string>("");
  const [directoryHandle, setDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null);

  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set());

  const addedDebounce = new Map<string, number>();
  const deletedDebounce = new Map<string, number>();
  const modifiedDebounce = new Map<string, number>();

  function shouldProcess(
    map: Map<string, number>,
    key: string,
    windowMs = 300
  ) {
    const now = Date.now();
    const last = map.get(key);

    if (last && now - last < windowMs) {
      return false; // duplicate
    }

    map.set(key, now);
    return true;
  }

  async function handleAdded(entries: Map<string, FileOrDirectoryInfo>) {
    const store = getMetadataStore();

    for (const [name, info] of entries) {
      if (!shouldProcess(addedDebounce, name)) continue;

      if (info.handle.kind != "file") return;

      const handle = info.handle as FileSystemFileHandle;

      if (!(await isValidAudioFile(await handle.getFile()))) return;

      const processedSong = await readSongFile(
        handle,
        new TagLibMetadataReader()
      );

      if (!processedSong) return;

      await store.saveSong(name, processedSong);
    }
  }

  async function handleDeleted(entries: Map<string, FileOrDirectoryInfo>) {
    const store = getMetadataStore();
    for (const [name] of entries) {
      if (!shouldProcess(deletedDebounce, name)) continue;

      await store.deleteSong(name);
    }
  }

  function handleModified(entries: Map<string, FileOrDirectoryInfo>) {
    for (const [name, info] of entries) {
      if (!shouldProcess(modifiedDebounce, name)) continue;

      // Process modified file
      console.log("Modified:", name, info);
    }
  }

  const { openDirectory } = useFileSystemAccess({
    enableFileWatcher: true,
    fileWatcherOptions: {
      debug: false,
      pollInterval: 250,
    },
    onFilesAdded: handleAdded,
    onFilesDeleted: handleDeleted,
    onFilesModified: handleModified,
  });

  function handleToggleBatch(song: Song) {
    setSelectedBatch((prev) => {
      const next = new Set(prev);
      if (next.has(song.id)) {
        next.delete(song.id);
      } else {
        next.add(song.id);
      }
      return next;
    });
  }

  async function handleEditSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSong) return;

    const currentTarget = event.currentTarget;

    const formData = new FormData(currentTarget);

    const updates: Partial<Song> = {
      title: formData.get("title")?.toString() ?? "",
      artist: formData.get("artist")?.toString() ?? "",
      album: formData.get("album")?.toString() ?? "",
      track: Number(formData.get("track") ?? selectedSong.track),
      year: Number(formData.get("year") ?? selectedSong.year),
      genre: formData.get("genre")?.toString() ?? "",
    };

    // Album art file inputs
    const frontFile = formData.get("coverFront") as File | null;
    const backFile = formData.get("coverBack") as File | null;

    if (frontFile && frontFile.size > 0) {
      updates.coverFront = frontFile;
    }

    if (backFile && backFile.size > 0) {
      updates.coverBack = backFile;
    }

    try {
      await applySongEdits(selectedSong, updates, {
        onSongUpdated(updatedSong) {
          setSelectedSong(updatedSong);
          setStatus("Song updated.");
          currentTarget.reset();
        },
      });
    } catch (error) {
      const { message } = error as Error;
      setStatus(message);
    }
  }

  async function handleBatchSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const edits: Partial<Song> = {};

    const artist = formData.get("artist")?.toString();
    const album = formData.get("album")?.toString();
    const genre = formData.get("genre")?.toString();
    const year =
      Number(formData.get("year")) == 0 ? null : Number(formData.get("year"));

    if (artist) edits.artist = artist;
    if (album) edits.album = album;
    if (genre) edits.genre = genre;
    if (year) edits.year = year;

    // Album art file inputs
    const frontFile = formData.get("coverFront") as File | null;
    const backFile = formData.get("coverBack") as File | null;

    if (frontFile && frontFile.size > 0) {
      edits.coverFront = frontFile;
    }

    if (backFile && backFile.size > 0) {
      edits.coverBack = backFile;
    }

    backgroundService.enqueue({
      id: uuidv7(),
      type: "bulkEdit",
      state: "pending",
      payload: {
        directoryHandle,
        songIds: selectedBatch,
        edits,
      },
    });

    setStatus(`Batch updated ${selectedBatch.size} songs.`);
    event.currentTarget.reset();
  }

  async function handlePickDirectory() {
    if (!isApiSupported) {
      throw new Error("File System Access API not supported.");
    }

    const dirHandle = await showDirectoryPicker({
      mode: "readwrite",
    });

    if (!dirHandle) return;

    setDirectoryHandle(dirHandle);

    setStatus(`Directory selected: ${dirHandle.name}`);
  }

  async function handleSubmit(
    event: React.SubmitEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (!directoryHandle) return;

    setStatus("Starting import...");

    await openDirectory(directoryHandle);
    setStoreRootDirectory(directoryHandle);

    backgroundService.enqueue({
      id: uuidv7(),
      type: "bulkImport",
      state: "pending",
      payload: {
        directoryHandle,
      },
    });
  }

  useEffect(() => {
    const sub = eventBus.subscribe(async (event) => {
      if (event.jobType == "bulkImport") {
        if (event.type == "jobStarted") {
          setStatus("Started importing songs...");
        }

        if (event.type === "jobProgress") {
          const p = event.payload;
          setProgressIndex(p.index ?? 0);
          setProgressTotal(p.total ?? 0);
          setStatus(p.label ?? "");
        }

        if (event.type === "jobComplete") {
          const { songs } = event.payload;
          setStatus(`Finished importing ${songs.length} files.`);
        }
      }
    });

    return () => sub.unsubscribe();
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Media Import</h1>

      {selectedSong && (
        <form
          key={selectedSong.id}
          onSubmit={handleEditSubmit}
          className="edit-form"
        >
          <h2>Edit Song</h2>

          <div className="edit-grid">
            <div className="thumbnail-column">
              {selectedSong.coverFront && (
                <img
                  src={URL.createObjectURL(selectedSong.coverFront)}
                  alt="Front Cover"
                  className="thumbnail-image"
                />
              )}

              {selectedSong.coverBack && (
                <img
                  src={URL.createObjectURL(selectedSong.coverBack)}
                  alt="Back Cover"
                  className="thumbnail-image"
                />
              )}
            </div>

            <div className="fields-column">
              <div className="field">
                <label>Title</label>
                <input name="title" defaultValue={selectedSong.title} />
              </div>

              <div className="field">
                <label>Artist</label>
                <input name="artist" defaultValue={selectedSong.artist} />
              </div>

              <div className="field">
                <label>Album</label>
                <input name="album" defaultValue={selectedSong.album} />
              </div>

              <div className="field">
                <label>Track</label>
                <input
                  name="track"
                  type="number"
                  defaultValue={selectedSong.track}
                />
              </div>

              <div className="field">
                <label>Year</label>
                <input
                  name="year"
                  type="number"
                  defaultValue={selectedSong.year}
                />
              </div>

              <div className="field">
                <label>Genre</label>
                <input name="genre" defaultValue={selectedSong.genre} />
              </div>

              <div className="field">
                <label>Replace Front Cover</label>
                <input type="file" name="coverFront" accept="image/*" />
              </div>

              <div className="field">
                <label>Replace Back Cover</label>
                <input type="file" name="coverBack" accept="image/*" />
              </div>
            </div>
          </div>

          <button type="submit" className="save-button">
            Save Changes
          </button>
        </form>
      )}

      {selectedBatch.size > 0 && (
        <form
          key={selectedBatch.size}
          onSubmit={handleBatchSubmit}
          className="edit-form"
        >
          <h2>Batch Edit ({selectedBatch.size} songs)</h2>

          <div className="edit-grid">
            <div className="thumbnail-column">
              {(() => {
                const first = songs.find((s) => selectedBatch.has(s.id));

                if (first == null) return;

                for (const pic of first?.pictures ?? []) {
                  const blob = new Blob([pic.data.slice().buffer], {
                    type: pic.mimeType,
                  });

                  if (pic.type === "FrontCover") {
                    first.coverFront = blob;
                  } else if (pic.type === "BackCover") {
                    first.coverBack = blob;
                  }
                }

                if (!(first.coverFront || first.coverBack)) return <></>;

                return (
                  <>
                    {first.coverFront && (
                      <img
                        src={URL.createObjectURL(first.coverFront)}
                        alt="Front Cover"
                        className="thumbnail-image"
                      />
                    )}

                    {first.coverBack && (
                      <img
                        src={URL.createObjectURL(first.coverBack)}
                        alt="Back Cover"
                        className="thumbnail-image"
                      />
                    )}
                  </>
                );
              })()}
            </div>
            <div className="fields-column">
              <div className="field">
                <label>Artist</label>
                <input
                  name="artist"
                  placeholder="Leave blank to keep existing"
                />
              </div>

              <div className="field">
                <label>Album</label>
                <input
                  name="album"
                  placeholder="Leave blank to keep existing"
                />
              </div>

              <div className="field">
                <label>Genre</label>
                <input
                  name="genre"
                  placeholder="Leave blank to keep existing"
                />
              </div>

              <div className="field">
                <label>Year</label>
                <input
                  name="year"
                  type="number"
                  placeholder="Leave blank to keep existing"
                />
              </div>

              <div className="field">
                <label>Replace Front Cover</label>
                <input type="file" name="coverFront" accept="image/*" />
              </div>

              <div className="field">
                <label>Replace Back Cover</label>
                <input type="file" name="coverBack" accept="image/*" />
              </div>
            </div>
          </div>

          <button type="submit" className="save-button">
            Apply Batch Edits
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
        selectedBatch={selectedBatch}
        onSelectSong={setSelectedSong}
        onToggleBatch={handleToggleBatch}
      />
    </div>
  );
}

export default HomePage;
