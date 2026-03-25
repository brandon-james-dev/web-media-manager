"use client";

import { FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AutocompleteInput } from "../autocomplete-input";

type TextFieldRowProps = {
  name: string;
  label: string;
  value: any;
  onChange: (v: any) => void;
  dirty: boolean;
  onReset: () => void;
  uniqueValues: string[];
  placeholder?: string;
};

export function TextFieldRow(props: TextFieldRowProps) {
  const {
    name,
    label,
    value,
    onChange,
    dirty,
    onReset,
    uniqueValues,
    placeholder,
  } = props;
  
  return (
    <FormItem>
      <FormLabel className="flex items-center gap-2">
        {label}

        <button
          type="button"
          hidden={!dirty}
          onClick={onReset}
          className="text-xs text-blue-600 hover:underline"
        >
          Reset
        </button>
      </FormLabel>

      <AutocompleteInput
        value={value}
        onChange={onChange}
        uniqueValues={uniqueValues}
        className={
          dirty
            ? "focus-visible:border-blue-400 focus-visible:ring-blue-400/50 border-blue-500"
            : ""
        }
        placeholder={placeholder}
      />

      <FormMessage />
    </FormItem>
  );
}
