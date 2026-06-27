/* ============================================================
   Tournament Hub — Swiss Engine with Groups (v2.0)
   Групповая швейцарская система с корзинами
   ============================================================ */
(function () {
  'use strict';

  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      try { return crypto.randomUUID(); } catch (e) {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ========== УТИЛИТЫ ==========
  
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getPlayerPoints(p) {
    return (p.score?.points ?? p.score_points ?? 0);
  }

  function getPlayerBuchholz(p) {
    return (p.score?.buchholz ?? p.score_buchholz ?? 0);
  }

  function getPlayerWins(p) {
    return (p.score?.wins ?? p.score_wins ?? 0);
  }

  // ========== РАУНД 1: РАНДОМНОЕ РАЗБИЕНИЕ НА ГРУППЫ ==========
  
  /**
   * Раунд 1: случайное разбиение на группы
   * @param {Array} players - все участники
   * @param {Object} config - { groups_per_round, players_per_group }
   * @returns {Array} массив групп [ [player1, player2, ...], ... ]
   */
  function createRound1Groups(players, config) {
    const groupsPerRound = config.groups_per_round || 1;
    const playersPerGroup = config.players_per_group || players.length;
    
    // Перемешиваем всех участников
    const shuffled = shuffleArray(players);
    
    const groups = [];
    let idx = 0;
    
    for (let g = 0; g < groupsPerRound; g++) {
      const group = [];
      for (let i = 0; i < playersPerGroup && idx < shuffled.length; i++) {
        group.push(shuffled[idx++]);
      }
      if (group.length > 0) groups.push(group);
    }
    
    // Если остались нераспределённые (не должно при правильных параметрах)
    while (idx < shuffled.length) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup) lastGroup.push(shuffled[idx++]);
    }
    
    return groups;
  }

  /**
   * Создание пар внутри группы (рандом)
   * @param {Array} groupPlayers - участники группы
   * @returns {Array} пары [ [p1, p2], [p3, p4], ... ]
   */
  function createPairsInGroup(groupPlayers) {
    const shuffled = shuffleArray(groupPlayers);
    const pairs = [];
    
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        pairs.push([shuffled[i], shuffled[i + 1]]);
      } else {
        // Нечётное количество — BYE
        pairs.push([shuffled[i], null]);
      }
    }
    
    return pairs;
  }

  // ========== РАУНДЫ 2+: КОРЗИНЫ (ШВЕЙЦАРСКАЯ СИСТЕМА) ==========
  
  /**
   * Алгоритм корзин из PDF "Швейц тур"
   * ШАГ 1: Сортируем по очкам (убывание)
   * ШАГ 2: Делим на корзины (количество = groups_per_round)
   * ШАГ 3: Из каждой корзины 1 случайный → группа А
   * ШАГ 4: Повторяем → группа Б, В...
   * 
   * @param {Array} players - все участники с очками
   * @param {Object} config - { groups_per_round, players_per_group }
   * @param {Array} previousMatches - история матчей (для избежания рематчей)
   * @returns {Array} массив групп
   */
  function createBasketGroups(players, config, previousMatches) {
    const groupsPerRound = config.groups_per_round || 1;
    const playersPerGroup = config.players_per_group || 8;
    
    // ШАГ 1: Сортируем по очкам (убывание) → Buchholz → победы
    const sorted = [...players].sort((a, b) => {
      const ptsDiff = getPlayerPoints(b) - getPlayerPoints(a);
      if (ptsDiff !== 0) return ptsDiff;
      const buchDiff = getPlayerBuchholz(b) - getPlayerBuchholz(a);
      if (buchDiff !== 0) return buchDiff;
      return getPlayerWins(b) - getPlayerWins(a);
    });

    // История встреч
    const playedWith = {};
    (previousMatches || []).forEach(m => {
      if (m.player1_id && m.player2_id) {
        playedWith[m.player1_id] = playedWith[m.player1_id] || new Set();
        playedWith[m.player2_id] = playedWith[m.player2_id] || new Set();
        playedWith[m.player1_id].add(m.player2_id);
        playedWith[m.player2_id].add(m.player1_id);
      }
    });

    // ШАГ 2: Делим на корзины
    // Корзина 1: места 1-8 (сильнейшие)
    // Корзина 2: места 9-16
    // ...
    const baskets = [];
    const basketSize = playersPerGroup; // размер корзины = размер группы
    
    for (let i = 0; i < sorted.length; i += basketSize) {
      baskets.push(sorted.slice(i, i + basketSize));
    }

    // ШАГ 3-4: Формируем группы
    // Из каждой корзины берём 1 случайного → группа А, потом группа Б...
    const groups = [];
    const usedPlayers = new Set();
    
    // Сколько групп нужно сформировать
    const totalGroupsNeeded = Math.ceil(sorted.length / playersPerGroup);
    
    for (let g = 0; g < totalGroupsNeeded; g++) {
      const group = [];
      
      for (let b = 0; b < baskets.length; b++) {
        const basket = baskets[b];
        // Берём неиспользованных из корзины
        const available = basket.filter(p => p && !usedPlayers.has(p.id));
        
        if (available.length > 0) {
          // Пытаемся найти того, с кем ещё не играл (если возможно)
          let candidates = available.filter(p => {
            // Проверяем, не играл ли уже с кем-то из текущей группы
            for (const existing of group) {
              if (playedWith[p.id]?.has(existing.id)) return false;
            }
            return true;
          });
          
          // Если нет кандидатов без рематча — берём любого
          if (candidates.length === 0) candidates = available;
          
          // Случайный из кандидатов
          const randomIdx = Math.floor(Math.random() * candidates.length);
          const chosen = candidates[randomIdx];
          
          group.push(chosen);
          usedPlayers.add(chosen.id);
        }
      }
      
      if (group.length > 0) groups.push(group);
    }

    return groups;
  }

  /**
   * Создание пар внутри группы (корзинный раунд)
   * Пары формируются случайно внутри группы
   * @param {Array} groupPlayers - участники группы
   * @returns {Array} пары
   */
  function createPairsInBasketGroup(groupPlayers) {
    // Перемешиваем внутри группы
    const shuffled = shuffleArray(groupPlayers);
    const pairs = [];
    
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        pairs.push([shuffled[i], shuffled[i + 1]]);
      } else {
        pairs.push([shuffled[i], null]); // BYE
      }
    }
    
    return pairs;
  }

  // ========== УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ ГРУПП ==========
  
  /**
   * Генерация групп для любого раунда
   * @param {number} roundNumber - номер раунда (0-based)
   * @param {Array} players - все участники
   * @param {Object} config - настройки турнира
   * @param {Array} previousMatches - история матчей
   * @returns {Object} { groups: [...], pairsByGroup: [...] }
   */
  function generateGroups(roundNumber, players, config, previousMatches) {
    const isRound1 = roundNumber === 0;
    
    let groups;
    if (isRound1) {
      // Раунд 1: рандом
      groups = createRound1Groups(players, config);
    } else {
      // Раунды 2+: корзины
      groups = createBasketGroups(players, config, previousMatches);
    }
    
    // Создаём пары внутри каждой группы
    const pairsByGroup = groups.map(group => {
      if (isRound1) {
        return createPairsInGroup(group);
      } else {
        return createPairsInBasketGroup(group);
      }
    });
    
    return { groups, pairsByGroup };
  }

  // ========== РАСЧЁТ СТЕНДИНГОВ (с Buchholz) ==========
  
  function calculateStandings(allPlayers, allMatches) {
    const scores = {};
    for (const p of allPlayers) {
      scores[p.id] = { wins: 0, losses: 0, draws: 0, points: 0, buchholz: 0 };
    }

    for (const m of allMatches) {
      if (!m.finished) continue;
      const v1 = m.votes1 || 0;
      const v2 = m.votes2 || 0;

      if (v1 > v2) {
        if (m.player1_id) { scores[m.player1_id].wins++; scores[m.player1_id].points += 1; }
        if (m.player2_id) { scores[m.player2_id].losses++; }
      } else if (v2 > v1) {
        if (m.player2_id) { scores[m.player2_id].wins++; scores[m.player2_id].points += 1; }
        if (m.player1_id) { scores[m.player1_id].losses++; }
      } else if (v1 === v2 && v1 > 0) {
        if (m.player1_id) { scores[m.player1_id].draws++; scores[m.player1_id].points += 0.5; }
        if (m.player2_id) { scores[m.player2_id].draws++; scores[m.player2_id].points += 0.5; }
      }
    }

    // Buchholz
    for (const p of allPlayers) {
      let buchholz = 0;
      for (const m of allMatches) {
        if (!m.finished) continue;
        let opponentId = null;
        if (m.player1_id === p.id) opponentId = m.player2_id;
        else if (m.player2_id === p.id) opponentId = m.player1_id;
        if (opponentId) buchholz += scores[opponentId]?.points || 0;
      }
      scores[p.id].buchholz = buchholz;
    }

    return scores;
  }

  function sortPlayersByStandings(players, standings) {
    return [...players].sort((a, b) => {
      const sa = standings[a.id] || { points: 0, buchholz: 0, wins: 0 };
      const sb = standings[b.id] || { points: 0, buchholz: 0, wins: 0 };
      if (sb.points !== sa.points) return sb.points - sa.points;
      if (sb.buchholz !== sa.buchholz) return sb.buchholz - sa.buchholz;
      return sb.wins - sa.wins;
    });
  }

  // ========== BYE ==========
  
  function applyByeResults(pairs) {
    const byeMatches = [];
    for (const groupPairs of pairs) {
      for (const [p1, p2] of groupPairs) {
        if (!p2 && p1) {
          byeMatches.push({
            id: generateId(),
            player1_id: p1.id,
            player2_id: null,
            votes1: 1,
            votes2: 0,
            finished: true,
            winner_id: p1.id,
            status: 'done',
            isBye: true
          });
        }
      }
    }
    return byeMatches;
  }

  // ========== ТОП-N ОТБОР ==========
  
  /**
   * Отбор топ-N участников для финала
   * @param {Array} players - все участники
   * @param {Object} standings - очки
   * @param {number} topN - сколько отбирать (top_cut)
   * @returns {Array} топ-N игроков
   */
  function getTopPlayers(players, standings, topN) {
    const sorted = sortPlayersByStandings(players, standings);
    return sorted.slice(0, topN);
  }

  // ========== ЭКСПОРТ ==========
  
  window.SwissEngine = {
    // Группы
    createRound1Groups,
    createPairsInGroup,
    createBasketGroups,
    createPairsInBasketGroup,
    generateGroups,
    
    // Standings
    calculateStandings,
    sortPlayersByStandings,
    applyByeResults,
    getTopPlayers,
    
    // Утилиты
    generateId,
    shuffleArray
  };
})();
