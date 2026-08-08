import React, { useState } from "react";
import type { Song } from "@/models/Song";
import { SongTable, Progress } from "@/components";
import {
  TagLibMetadataReader,
  TagLibMetadataWriter,
} from "@/lib/taglib-metadata-utils";
import { applySongEdits } from "@/lib/applySongEdits";
import { readSongFiles } from "@/lib/readSongFiles";
import { importSongs } from "@/lib/importSongs";

import "./HomePage.css";

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [status, setStatus] = useState<string>("");
  const [directoryHandle, setDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null);

  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set());

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

    const formData = new FormData(event.currentTarget);

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

    const writer = new TagLibMetadataWriter();

    await applySongEdits(selectedSong, updates, writer, {
      onSongUpdated(updatedSong) {
        setSongs((prev) =>
          prev.map((s) => (s.id === updatedSong.id ? updatedSong : s))
        );
        setSelectedSong(updatedSong);
        setStatus("Song updated.");
        event.currentTarget.reset();
      },
    });
  }

  async function handleBatchSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const updates: Partial<Song> = {};

    const title = formData.get("title")?.toString();
    const artist = formData.get("artist")?.toString();
    const album = formData.get("album")?.toString();
    const genre = formData.get("genre")?.toString();

    if (title) updates.title = title;
    if (artist) updates.artist = artist;
    if (album) updates.album = album;
    if (genre) updates.genre = genre;

    // Album art file inputs
    const frontFile = formData.get("coverFront") as File | null;
    const backFile = formData.get("coverBack") as File | null;

    if (frontFile && frontFile.size > 0) {
      updates.coverFront = frontFile;
    }

    if (backFile && backFile.size > 0) {
      updates.coverBack = backFile;
    }

    const writer = new TagLibMetadataWriter();

    const songsToEdit = songs.filter((s) => selectedBatch.has(s.id));

    for (const song of songsToEdit) {
      await applySongEdits(song, updates, writer, {
        onSongUpdated(updatedSong) {
          setSongs((prev) =>
            prev.map((s) => (s.id === updatedSong.id ? updatedSong : s))
          );
        },
      });
    }

    setStatus(`Batch updated ${songsToEdit.length} songs.`);
    event.currentTarget.reset();
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!directoryHandle) {
      setStatus("No directory selected.");
      return;
    }

    const reader = new TagLibMetadataReader();

    // Collect file handles
    const handles: FileSystemFileHandle[] = [];
    for await (const fileHandle of walkDirectory(directoryHandle)) {
      handles.push(fileHandle);
    }

    setProgressIndex(0);
    setProgressTotal(handles.length);
    setStatus("Starting import…");

    // Build the async stream
    const songStream = readSongFiles(handles, reader);

    // Consume the stream
    const imported = await importSongs(songStream, (index) => {
      setProgressIndex(index);
      setProgressTotal(handles.length);
    });

    // Store in React state
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
              <label>Title</label>
              <input name="title" defaultValue={selectedSong.title} />

              <label>Artist</label>
              <input name="artist" defaultValue={selectedSong.artist} />

              <label>Album</label>
              <input name="album" defaultValue={selectedSong.album} />

              <label>Track</label>
              <input
                name="track"
                type="number"
                defaultValue={selectedSong.track}
              />

              <label>Year</label>
              <input
                name="year"
                type="number"
                defaultValue={selectedSong.year}
              />

              <label>Genre</label>
              <input name="genre" defaultValue={selectedSong.genre} />

              <label>Replace Front Cover</label>
              <input type="file" name="coverFront" accept="image/*" />

              <label>Replace Back Cover</label>
              <input type="file" name="coverBack" accept="image/*" />
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
              <label>Title</label>
              <input name="title" placeholder="Leave blank to keep existing" />

              <label>Artist</label>
              <input name="artist" placeholder="Leave blank to keep existing" />

              <label>Album</label>
              <input name="album" placeholder="Leave blank to keep existing" />

              <label>Genre</label>
              <input name="genre" placeholder="Leave blank to keep existing" />

              <label>Replace Front Cover</label>
              <input type="file" name="coverFront" accept="image/*" />

              <label>Replace Back Cover</label>
              <input type="file" name="coverBack" accept="image/*" />
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
