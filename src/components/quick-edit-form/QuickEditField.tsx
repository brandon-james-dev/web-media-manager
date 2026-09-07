import { cn } from "@/lib/shadcn-utils/utils";
import type { QuickEditFieldProps } from "./QuickEditFieldProps";
import { AutocompleteInput } from "@/components/autocomplete-input";

export function QuickEditField(props: QuickEditFieldProps) {
  const { field, songs, value, onChange } = props;

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
      ? `(Multiple Values…)`
      : unique[0]
        ? unique[0]
        : capitalize(field);

  const isDirty = value !== undefined && value !== "";

  return (
    <div className="flex flex-col gap-1 p-1">
      <label className="text-xs font-medium text-muted-foreground">
        {capitalize(field)}
      </label>

      <AutocompleteInput
        value={value ?? ""}
        onChange={onChange}
        suggestions={unique}
        placeholder={placeholder}
        className={cn("transition-colors", isDirty && "border-primary")}
      />
    </div>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
