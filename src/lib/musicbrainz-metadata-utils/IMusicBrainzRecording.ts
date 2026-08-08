export interface IMusicBrainzRecording {
  id: string;
  title: string;
  "artist-credit": Array<{ name: string; artist?: { id: string } }>;
  releases?: Array<{
    id: string;
    title: string;
    date?: string;
  }>;
}
