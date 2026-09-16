type AutocompleteInputProps = {
  name?: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
};

export type { AutocompleteInputProps };
