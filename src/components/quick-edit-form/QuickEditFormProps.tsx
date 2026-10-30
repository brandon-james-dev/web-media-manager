import type { Song } from "@/models";
import type { quickEditFields } from "./quickEditFields";
import type { QuickEditDto } from "@/dto";

type EditableField = (typeof quickEditFields)[number];

interface QuickEditFormProps {
  formId?: string;
  songs: Song[];
  onApply: (updates: QuickEditDto) => void;
  onNavigate?: (direction: "prev" | "next") => void;
}

export type { EditableField, QuickEditFormProps };
