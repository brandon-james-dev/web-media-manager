import { Input } from "@/components/ui/input";
import { cn } from "@/lib/shadcn-utils/utils";
import type { EditableField } from "./QuickEditFormProps";
import type { Song } from "@/models";

interface QuickEditFieldProps {
  field: EditableField;
  songs: Song[];
  value: string | number | undefined;
  onChange: (value: string) => void;
}

export function QuickEditField({
  field,
  songs,
  value,
  onChange,
}: QuickEditFieldProps) {
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
      ? `${capitalize(field)} (Multiple Values…)`
      : unique[0]
        ? capitalize(unique[0])
        : capitalize(field);

  const isDirty = value !== undefined && value !== "";

  return (
    <div className="flex flex-col gap-1 p-1">
      <label className="text-xs font-medium text-muted-foreground">
        {capitalize(field)}
      </label>

      <Input
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={cn("w-full transition-colors", isDirty && "border-primary")}
      />

      {unique.length > 1 && (
        <select
          className="text-xs bg-transparent border rounded px-1 py-0.5 w-full"
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose Existing…</option>
          {unique.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
