export interface IMusicBrainzRecording {
  id: string;
  title: string;

  "artist-credit": Array<{
    name: string;
    artist?: { id: string };
  }>;

  isrcs?: string[];

  releases?: Array<IMusicBrainzRelease>;
}

export interface IMusicBrainzRelease {
  id: string;
  title: string;
  date?: string;

  media?: Array<{
    position?: number; // disc number
    tracks?: Array<{
      number?: string; // track number
      title?: string;
    }>;
  }>;
}
