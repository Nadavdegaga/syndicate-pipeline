// Token-overlap match scoring (SPEC §16).

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
}

export function matchScore(
  wishlist: { requested_offer: string; vertical: string | null },
  offer: { name: string; vertical: string | null },
): number {
  let score = 0;
  if (
    wishlist.vertical &&
    offer.vertical &&
    wishlist.vertical.toLowerCase() === offer.vertical.toLowerCase()
  ) {
    score += 50;
  } else if (wishlist.vertical && offer.vertical) {
    const wv = wishlist.vertical.toLowerCase();
    const ov = offer.vertical.toLowerCase();
    if (wv.includes(ov) || ov.includes(wv)) score += 25;
  }
  const wTokens = tokens(wishlist.requested_offer);
  const oTokens = tokens(offer.name);
  const overlap = wTokens.filter((t) => oTokens.includes(t)).length;
  score += overlap * 10;
  return score;
}

/** A label for the badge */
export function scoreTier(score: number): "strong" | "good" | "weak" | "none" {
  if (score >= 50) return "strong";
  if (score >= 30) return "good";
  if (score >= 20) return "weak";
  return "none";
}
