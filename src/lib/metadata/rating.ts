import type { Metadata, MetadataRating } from "./Metadata";

const FIVE_STAR_THRESHOLD = 0.99;
const FIVE_STARS = 1;
const UNRATED = 0;

/** Whether any of the file's embedded ratings is the top (five star) rating. */
export function isFiveStarRated(metadata: Pick<Metadata, "ratings">): boolean {
  return (
    metadata.ratings?.some((r) => r.rating >= FIVE_STAR_THRESHOLD) ?? false
  );
}

/**
 * The ratings a file should carry once it is (or stops being) a favorite.
 * Favoriting sets every rating to five stars, or adds one when the file has
 * none. Un-favoriting clears five-star ratings and keeps any lower rating.
 */
export function ratingsForFavorite(
  ratings: MetadataRating[] | undefined,
  favorite: boolean
): MetadataRating[] {
  const current = ratings ?? [];
  if (favorite) {
    return current.length
      ? current.map((r) => ({ ...r, rating: FIVE_STARS }))
      : [{ rating: FIVE_STARS }];
  }
  return current.map((r) =>
    r.rating >= FIVE_STAR_THRESHOLD ? { ...r, rating: UNRATED } : r
  );
}
