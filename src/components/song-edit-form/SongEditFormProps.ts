import type { Song } from "@/models";

import type { SongEditDto } from "@/dto";

interface SongEditFormProps {
  song: Song;
  onFormSubmit: (updates: SongEditDto) => void;
  formId?: string;
  /** Called when the user navigates to the previous song (advanced edit). */
  onNavigatePrev?: () => void;
  /** Called when the user navigates to the next song (advanced edit). */
  onNavigateNext?: () => void;
  /** Disable the previous button (at the first song). */
  isPrevDisabled?: boolean;
  /** Disable the next button (at the last song). */
  isNextDisabled?: boolean;
  /** Close the advanced edit form (e.g. close the drawer it's shown in). */
  onClose?: () => void;
}

export type { SongEditFormProps };
