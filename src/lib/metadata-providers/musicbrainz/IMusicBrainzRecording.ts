export interface IMusicBrainzRecording {
  id: string;
  title: string;

  "artist-credit"?: Array<{
    name: string;
    artist?: { id: string };
  }>;

  isrcs?: string[];

  genres?: Array<{ name: string }>;
  tags?: Array<{ name: string }>;

  releases?: Array<IMusicBrainzRelease>;
}

export interface IMusicBrainzRelease {
  id: string;
  title: string;
  date?: string;

  "artist-credit"?: Array<{
    name: string;
    artist?: { id: string };
  }>;
  "release-group"?: { id?: string };

  media?: Array<{
    position?: number; // disc number
    "track-count"?: number; // total tracks on the disc
    tracks?: Array<{
      number?: string; // track number
      title?: string;
    }>;
  }>;
}
