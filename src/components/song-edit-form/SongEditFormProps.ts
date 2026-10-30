import type { Song } from "@/models";

import type { SongEditDto } from "@/dto";

interface SongEditFormProps {
  song: Song;
  onFormSubmit: (updates: SongEditDto) => void;
  formId?: string;
}

export type { SongEditFormProps };
