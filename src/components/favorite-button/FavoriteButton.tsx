import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks";
import { cn } from "cn";

interface FavoriteButtonProps {
  songId: string;
  className?: string;
  iconSize?: number;
  alwaysVisible?: boolean;
}

export function FavoriteButton({
  songId,
  className,
  iconSize = 14,
  alwaysVisible = true,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(songId);
  const label = favorite ? "Remove from Favorites" : "Add to Favorites";

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-opacity",
        "hover:bg-accent/15 hover:text-foreground",
        favorite && "text-accent",
        !alwaysVisible &&
          !favorite &&
          "opacity-0 group-hover/track:opacity-100 [@media(hover:none)]:opacity-100",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        void toggleFavorite(songId);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      title={label}
      aria-label={label}
      aria-pressed={favorite}
    >
      <Heart size={iconSize} className={cn(favorite && "fill-current")} />
    </button>
  );
}
