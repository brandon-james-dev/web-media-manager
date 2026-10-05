import { parseMhip, parseMhlp, parseMhod, parseMhyp } from "..";
import {
  type IpodTrack,
  type IpodPlaylist,
  getPlaylistType,
} from "../../../models/entities";
import type {
  MhsdRecord,
  StringMhodRecord,
  PlaylistColumnMhodRecord,
} from "../../../models/records";
import type { BinaryReader } from "../../../readers";

export function parsePlaylistsSection(
  reader: BinaryReader,
  sections: MhsdRecord[],
  tracks: IpodTrack[]
): IpodPlaylist[] {
  const playlists: IpodPlaylist[] = [];

  for (const section of sections) {
    if (section.childTag !== "mhlp") {
      continue;
    }

    const mhlpOffset = section.offset + section.headerLength;
    const mhlp = parseMhlp(reader, mhlpOffset);
    const mhypOffset = mhlpOffset + mhlp.headerLength;
    const mhyp = parseMhyp(reader, mhypOffset);
    const mhypEnd = mhypOffset + mhyp.totalLength;

    let childOffset = mhypOffset + mhyp.headerLength;

    const playlist: IpodPlaylist = {
      id: mhyp.playlistId,
      type: getPlaylistType(section.type),
      tracks: [],
      columns: [],
    };

    while (childOffset < mhypEnd) {
      reader.seek(childOffset);

      const tag = reader.readString(4);

      if (tag === "mhod") {
        const mhod = parseMhod(reader, childOffset);

        if (mhod.type === 1 && !playlist.name) {
          playlist.name = (mhod as StringMhodRecord).value;
        }

        if (mhod.type === 53) {
          const columnMhod = mhod as PlaylistColumnMhodRecord;
          playlist.columns.push({
            fieldId: columnMhod.fieldId,
            value: columnMhod.value,
          });
        }

        childOffset += mhod.totalLength;

        continue;
      }

      if (tag === "mhip") {
        const mhip = parseMhip(reader, childOffset);
        const track = resolveTrack(tracks, mhip.trackIndex);

        if (track) {
          playlist.tracks.push(track);
        }

        childOffset += mhip.totalLength;

        continue;
      }

      break;
    }

    if (playlist.name) {
      playlists.push(playlist);
    }
  }

  return playlists;
}

function resolveTrack(
  tracks: IpodTrack[],
  index: number
): IpodTrack | undefined {
  return tracks[index - 1];
}
