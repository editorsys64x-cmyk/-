/* ============================================================
   Tournament Hub Core Engine (FIXED v6 — Swiss Only)
   УДАЛЕН старый плей-офф код. Теперь только швейцарская система.
   Вся логика в SwissEngine (swiss-engine.js).
   ============================================================ */
(function () {
  'use strict';

  // DEPRECATED: createBracket больше не используется для швейцарки
  // Оставлен для обратной совместимости со старыми турнирами
  function createBracket(players) {
    console.warn('createBracket() is deprecated. Use SwissEngine.generateSwissPairs()');
    return null;
  }

  function finalizeRound(tournament) {
    if (!tournament || !Array.isArray(tournament.rounds)) return { ok: false, err: "Неверная структура турнира" };
    const currIdx = tournament.currentRound || 0;
    const currentRound = tournament.rounds[currIdx];
    if (!currentRound) return { ok: false, err: "Текущий раунд не найден" };

    const unfinished = currentRound.matches.some(m => !m.finished);
    if (unfinished) {
      currentRound.matches.forEach(m => {
        if (!m.finished) {
          if ((m.votes1 || 0) >= (m.votes2 || 0)) m.winner_id = m.player1 ? m.player1.id : (m.player2 ? m.player2.id : null);
          else m.winner_id = m.player2 ? m.player2.id : (m.player1 ? m.player1.id : null);
          m.finished = true;
        }
      });
    }

    if (currIdx >= tournament.rounds.length - 1) {
      tournament.status = "finished";
      // Для швейцарки победитель определяется по standings, а не финальным матчем
      return { ok: true, finished: true };
    }

    tournament.currentRound = currIdx + 1;
    return { ok: true, finished: false };
  }

  window.TournamentEngine = {
    createBracket, finalizeRound
  };
  window.createBracket = createBracket;
  window.finalizeRound = finalizeRound;
})();
