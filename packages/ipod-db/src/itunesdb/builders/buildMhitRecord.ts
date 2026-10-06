import type { IpodTrack } from "../../models";
import { MhitRecord } from "../../models/records";

export function buildMhitRecord(track: IpodTrack): MhitRecord {
  return {
    tag: "mhit",
    headerLength: 156,
    totalLength: 156,
    trackId: track.id ?? 0,
    durationMs: track.durationMs,
    sizeBytes: track.sizeBytes,
    year: track.year,
  };
}
