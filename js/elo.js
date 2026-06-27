/* Tournament Hub ELO rating system */
(function () {
  const DEFAULT_RATING = 1000;
  const K_FACTOR = 32;
  function getRating(entity) { if (!entity) return DEFAULT_RATING; return Number(entity.elo) || DEFAULT_RATING; }
  function expected(ratingA, ratingB) { return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400)); }
  function calculate(winner, loser) {
    const winnerRating = getRating(winner);
    const loserRating = getRating(loser);
    const expectedWinner = expected(winnerRating, loserRating);
    const expectedLoser = expected(loserRating, winnerRating);
    return { winner: Math.round(winnerRating + K_FACTOR * (1 - expectedWinner)), loser: Math.round(loserRating + K_FACTOR * (0 - expectedLoser)) };
  }
  function applyResult(winner, loser) { const result = calculate(winner, loser); winner.elo = result.winner; loser.elo = result.loser; return result; }
  function compare(a, b) { return getRating(b) - getRating(a); }
  window.ELO = { DEFAULT_RATING, getRating, expected, calculate, applyResult, compare };
})();
