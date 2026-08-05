import { useState, type ChangeEvent, type SubmitEvent } from "react";
import {
  readProperties,
  readTags,
  type AudioProperties,
  type ExtendedTag,
} from "taglib-wasm/simple";
import type { Song } from "../models/Song";
import SongTable from "../components/SongTable/SongTable";

function HomePage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [songData, setSongData] = useState<Song[]>([]);
  const [folderSelectStatus, setFolderSelectStatus] = useState("");

  async function processInBatches<T>(
    items: T[],
    batchSize: number,
    fn: (item: T) => Promise<Song>
  ): Promise<Song[]> {
    const result: Song[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(fn));
      result.push(...batchResults);
    }

    return result;
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(event.target.files ?? []);
    setSelectedFiles(fileList);

    const songs = await processInBatches(fileList, 5, async (file) => {
      let tags: ExtendedTag | null = null;
      let props: AudioProperties | null = null;

      try {
        tags = await readTags(file);
        props = await readProperties(file);
      } catch (err) {
        console.error("TagLib error for:", file.name, err);
      }

      return {
        id: file.name,
        path: file.name,
        title: tags?.title?.at(0) ?? file.name,
        artist: tags?.artist?.at(0),
        album: tags?.album?.at(0),
        albumArtist: tags?.albumArtist?.at(0),
        genre: tags?.genre?.at(0),
        comment: tags?.comment?.at(0),
        composer: tags?.composer?.at(0),
        year: tags?.year,
        track: tags?.track,
        disc: tags?.discNumber,
        lyrics: tags?.lyrics?.at(0),
        copyright: tags?.copyright?.at(0),
        encodedBy: tags?.encodedBy?.at(0),
        bpm: tags?.bpm,
        isrc: tags?.isrc?.at(0),
        mbTrackId: tags?.musicbrainzTrackId?.at(0),
        mbArtistId: tags?.musicbrainzArtistId?.at(0),
        mbReleaseGroupId: tags?.musicbrainzReleaseGroupId?.at(0),
        length: props?.duration,
        bitrate: props?.bitrate,
        sampleRate: props?.sampleRate,
        channels: props?.channels,
        fileSizeBytes: file.size,
      } as Song;
    });

    setSongData((prev) => [...prev, ...songs]);
    setFolderSelectStatus(`${fileList.length} files in the selected folder.`);
  };

  const handleFormSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setFolderSelectStatus("Please select files first.");
      return;
    }

    setFolderSelectStatus(
      `Found ${selectedFiles.length} files in the selected folder`
    );
  };

  return (
    <div className="home-page-container">
      <h1 className="page-title">Web Media Manager</h1>

      <form onSubmit={handleFormSubmit}>
        <label htmlFor="file-input">
          <button
            type="button"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            Import Folder
          </button>
        </label>

        <input
          id="file-input"
          type="file"
          webkitdirectory="true"
          directory="true"
          onChange={handleFileChange}
          hidden
        />

        <div className="file-list">
          <h3>Selected Items ({songData.length}):</h3>

          <SongTable songs={songData} />
        </div>
      </form>

      <p className="status">{folderSelectStatus}</p>
    </div>
  );
}

export default HomePage;
