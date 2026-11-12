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
  const { isFavorite, originOf, toggleFavorite } = useFavorites();
  const origin = originOf(songId);
  const local = isFavorite(songId);
  const favorite = origin !== undefined;
  const label = local ? "Remove from Favorites" : "Add to Favorites";
  const title =
    origin === "both"
      ? "Favorite on this device and the server"
      : origin === "server"
        ? "Favorite on the server"
        : label;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-opacity",
        "hover:bg-accent/15 hover:text-foreground",
        origin === "server" && "text-white",
        origin === "both" && "text-white",
        local && origin === "local" && "text-accent",
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
      title={title}
      aria-label={label}
      aria-pressed={local}
    >
      <Heart
        size={iconSize}
        className={cn(
          favorite && "fill-current",
          origin === "both" && "fill-accent"
        )}
      />
    </button>
  );
}
