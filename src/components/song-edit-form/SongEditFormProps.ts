import type { Song } from "@/models";

interface SongEditFormProps {
  song: Song;
  onFormSubmit: (updates: Partial<Song>) => void;
  formId?: string;
}

export type { SongEditFormProps };
