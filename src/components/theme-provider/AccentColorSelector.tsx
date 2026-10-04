import { Button } from "../ui/button";

const ACCENT_SWATCHES = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export function AccentColorSelector({
  value,
  accentSwatches,
  onChange,
}: {
  value: string;
  accentSwatches?: string[];
  onChange?: (color: string) => void;
}) {
  const swatches = accentSwatches || ACCENT_SWATCHES;

  return (
    <div className="flex gap-3 flex-wrap">
      {swatches.map((color) => (
        <Button
          key={color}
          onClick={() => onChange?.(color)}
          className={`
              w-10 h-10 rounded-full border-2 transition
              ${value === color ? "border-white scale-110" : "border-transparent"}
            `}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
