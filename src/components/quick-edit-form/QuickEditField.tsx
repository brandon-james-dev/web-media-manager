import { cn } from "@/lib/shadcn-utils/utils";
import type { QuickEditFieldProps } from "./QuickEditFieldProps";
import type { EditableField } from "./QuickEditFormProps";
import { AutocompleteInput } from "@/components/autocomplete-input";
import { useTranslation, type WmmResourceKey } from "@/i18n";

const FIELD_LABEL_KEYS = {
  title: "metadata.title",
  artist: "metadata.artist",
  album: "metadata.album",
  genre: "metadata.genre",
  year: "metadata.year",
  track: "metadata.track",
} as const satisfies Record<EditableField, WmmResourceKey>;

export function QuickEditField(props: QuickEditFieldProps) {
  const { name, field, songs, value, onChange, disabled } = props;
  const { t } = useTranslation();

  const unique = (() => {
    const set = new Set<string>();
    for (const s of songs) {
      const v = s[field];
      if (v !== undefined && v !== null && v !== "") {
        set.add(String(v));
      }
    }
    return Array.from(set);
  })();

  const placeholder =
    unique.length > 1
      ? t("metadata.multipleValues")
      : unique[0]
        ? unique[0]
        : t(FIELD_LABEL_KEYS[field]);

  const isDirty = value !== undefined && value !== "";

  return (
    <div className="flex flex-col gap-1 p-1">
      <label className="text-xs font-medium text-muted-foreground">
        {t(FIELD_LABEL_KEYS[field])}
      </label>

      <AutocompleteInput
        name={name}
        value={value ?? ""}
        onChange={onChange}
        suggestions={unique}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("transition-colors", isDirty && "border-primary")}
      />
    </div>
  );
}
