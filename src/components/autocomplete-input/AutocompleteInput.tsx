import { useState, useMemo } from "react";
import { cn } from "@/lib/shadcn-utils/utils";
import type { AutocompleteInputProps } from "./AutocompleteInputProps";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../ui/command";
import { ChevronsUpDown } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";

export function AutocompleteInput(props: AutocompleteInputProps) {
  const { value, onChange, suggestions, className, placeholder } = props;

  const [active, setActive] = useState(false);

  const filtered = useMemo(() => {
    if (!active || suggestions.length === 1) return [];
    const v = String(value ?? "").toLowerCase();
    if (!v) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(v));
  }, [active, value, suggestions]);

  return (
    <div className="relative w-full">
      {active && filtered.length > 1 && (
        <div className="absolute bottom-full mb-1 min-w-full text-nowrap rounded border bg-popover text-popover-foreground shadow z-10">
          <Command>
            <CommandList>
              <CommandGroup>
                {filtered.length === 0 && (
                  <CommandEmpty>No matches</CommandEmpty>
                )}

                {filtered.map((s) => (
                  <CommandItem
                    key={s}
                    value={s}
                    onMouseDown={() => {
                      onChange(s);
                    }}
                  >
                    {s}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}

      <InputGroup>
        <InputGroupInput
          value={value ?? ""}
          placeholder={placeholder}
          onFocus={() => setActive(true)}
          onBlur={() => {
            setTimeout(() => setActive(false), 100);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(true);
          }}
          className={cn("w-full pr-6", className)}
        />
        {suggestions.length > 1 && (
          <InputGroupAddon align="inline-end">
            <ChevronsUpDown />
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}
