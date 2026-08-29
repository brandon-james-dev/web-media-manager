import type { Song } from "@/models";
import type { quickEditFields } from "./quickEditFields";

type EditableField = (typeof quickEditFields)[number];

interface QuickEditFormProps {
  formId?: string;
  songs: Song[];
  onApply: (updates: Partial<Song>) => void;
  onNavigate?: (direction: "prev" | "next") => void;
}

export type { EditableField, QuickEditFormProps };
