export interface IMusicBrainzArtistCredit {
  name: string;
  joinphrase?: string;
  artist?: {
    id: string;
    name?: string;
    "sort-name"?: string;
  };
}

export interface IMusicBrainzRecording {
  id: string;
  title: string;
  length?: number;
  "first-release-date"?: string;

  "artist-credit"?: IMusicBrainzArtistCredit[];

  isrcs?: string[];

  genres?: Array<{ name: string }>;
  tags?: Array<{ name: string; count?: number }>;

  releases?: Array<IMusicBrainzRelease>;
}

export interface IMusicBrainzTrack {
  id?: string;
  number?: string;
  title?: string;
  length?: number;
}

export interface IMusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  country?: string;
  status?: string;
  barcode?: string;

  "artist-credit"?: IMusicBrainzArtistCredit[];
  "release-group"?: {
    id?: string;
    "primary-type"?: string;
    "secondary-types"?: string[];
  };
  "label-info"?: Array<{
    "catalog-number"?: string;
    label?: { id?: string; name?: string };
  }>;

  media?: Array<{
    position?: number;
    format?: string;
    "track-count"?: number;
    track?: Array<IMusicBrainzTrack>;
    tracks?: Array<IMusicBrainzTrack>;
  }>;
}
