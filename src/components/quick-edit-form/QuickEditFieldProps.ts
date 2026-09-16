import type { Song } from "@/models";
import type { EditableField } from "./QuickEditFormProps";

interface QuickEditFieldProps {
  name?: string;
  field: EditableField;
  songs: Song[];
  value: string | number | undefined;
  onChange: (value: string) => void;
}

export type { QuickEditFieldProps };
