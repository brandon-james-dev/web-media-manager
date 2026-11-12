import { describe, expect, it } from "vitest";
import { isFiveStarRated, ratingsForFavorite } from "./rating";

describe("ratingsForFavorite", () => {
  it("adds a five star rating to an unrated file", () => {
    const ratings = ratingsForFavorite(undefined, true);
    expect(ratings).toEqual([{ rating: 1 }]);
    expect(isFiveStarRated({ ratings })).toBe(true);
  });

  it("raises existing ratings and keeps their identity", () => {
    expect(
      ratingsForFavorite([{ rating: 0.4, email: "a@b", counter: 3 }], true)
    ).toEqual([{ rating: 1, email: "a@b", counter: 3 }]);
  });

  it("clears five star ratings when un-favoriting", () => {
    const ratings = ratingsForFavorite([{ rating: 1, email: "a@b" }], false);
    expect(ratings).toEqual([{ rating: 0, email: "a@b" }]);
    expect(isFiveStarRated({ ratings })).toBe(false);
  });

  it("keeps lower ratings when un-favoriting", () => {
    expect(ratingsForFavorite([{ rating: 0.6 }], false)).toEqual([
      { rating: 0.6 },
    ]);
  });
});
