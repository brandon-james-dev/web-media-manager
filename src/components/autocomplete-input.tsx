"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AutocompleteInputProps = {
  value: string | string[] | number | undefined;
  onChange: (value: string) => void;
  uniqueValues: string[];
  label?: string;
  className?: string;
  placeholder?: string;
};

export function AutocompleteInput({
  value,
  onChange,
  uniqueValues,
  label,
  className,
  placeholder,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);

  const filteredValues =
    uniqueValues.length > 1
      ? uniqueValues.filter((v) =>
          String(v)
            .toLowerCase()
            .includes(String(value ?? "").toLowerCase()),
        )
      : [];

  return (
    <div className="relative">
      <Input
        value={value ?? ""}
        placeholder={placeholder}
        onFocus={() => {
          if (uniqueValues.length > 1) setOpen(true);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          if (uniqueValues.length > 1) setOpen(true);
        }}
        className={cn(
          "pointer-events-auto w-full border rounded px-2 py-1",
          className,
        )}
      />

      {uniqueValues.length > 1 && (
        <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
            aria-hidden="true"
            tabIndex={-1}
          />
        </PopoverTrigger>

        {uniqueValues.length > 1 && (
          <PopoverContent className="p-0 w-(--radix-popover-trigger-width)">
            <Command>
              <CommandList>
                <CommandGroup>
                  {filteredValues.length === 0 && (
                    <CommandEmpty>No matches</CommandEmpty>
                  )}

                  {filteredValues.map((v) => (
                    <CommandItem
                      key={v}
                      value={v}
                      onSelect={() => {
                        onChange(v);
                        setOpen(false);
                      }}
                    >
                      {v}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
