import type { Song } from "@/models";
import type { EditableField } from "./QuickEditFormProps";

interface QuickEditFieldProps {
  field: EditableField;
  songs: Song[];
  value: string | number | undefined;
  onChange: (value: string) => void;
}

export type { QuickEditFieldProps };
