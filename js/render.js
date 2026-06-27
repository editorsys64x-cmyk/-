/* ============================================================
   Tournament Hub Main Renderer (FIXED v6 — Working Counts)
   ============================================================ */
(function () {
  'use strict';
  let initDone = false;

  async function loadSiteSettings() {
    if (window.TH) {
      try {
        const { data } = await window.TH.getSiteSettings();
        if (data) return { siteName: data.site_name || 'Tournament Hub', description: data.description || '', siteLogo: data.site_logo || '🏆', theme: data.theme || 'amber', accent: data.accent || 'amber' };
      } catch (e) { console.warn('Supabase settings failed'); }
    }
    const db = DB.getDB();
    return { siteName: db.settings?.siteName || 'Tournament Hub', description: db.settings?.description || '', siteLogo: db.settings?.siteLogo || '🏆', theme: db.settings?.theme || 'amber', accent: db.settings?.accent || 'amber' };
  }

  function applySettings(settings) {
    const logoEl = document.getElementById("siteLogoLink");
    if (logoEl) logoEl.textContent = (settings.siteLogo || "🏆") + " " + (settings.siteName || "Tournament Hub");
    const titleEl = document.querySelector('title[data-site-name]');
    if (titleEl) titleEl.textContent = settings.siteName || "Tournament Hub";
    const descEl = document.getElementById("site-description");
    if (descEl && settings.description) descEl.textContent = settings.description;
  }

  function escapeHTML(text) {
    if (!text) return "";
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  async function renderTournamentList(container) {
    if (!container) return;
    container.innerHTML = '<div class="spinner"></div>';
    try {
      let tournaments = [];

      if (window.TH) { 
        const { data, error } = await window.TH.getTournaments(); 
        if (error) {
          console.error('getTournaments error:', error);
          container.innerHTML = '<p style="color:var(--red);">Ошибка загрузки: ' + escapeHTML(error.message) + '</p>';
          return;
        }
        if (data) tournaments = data; 
      }
      else tournaments = DB.getDB().tournaments || [];

      if (tournaments.length === 0) { 
        container.innerHTML = '<p style="color:var(--text-3); text-align:center; padding:20px;">Нет активных турниров</p>'; 
        return; 
      }

      container.innerHTML = tournaments.map(t => {
        let statusText = 'Черновик', statusClass = 'tournament-badge';
        let statusStyle = 'background:var(--accent-glow);color:var(--accent);border:1px solid rgba(245,158,11,0.2);';
        if (t.status === 'active') { 
          statusText = 'Активен'; 
          statusStyle = 'background:rgba(52,211,153,0.15);color:var(--green);border:1px solid rgba(52,211,153,0.3);';
        }
        if (t.status === 'finished') { 
          statusText = 'Завершён'; 
          statusStyle = 'background:rgba(96,165,250,0.15);color:var(--blue);border:1px solid rgba(96,165,250,0.3);';
        }
        // ✅ FIX: Используем player_count который теперь правильно считается в getTournaments
        const participantCount = t.player_count || t.players_count || t.players?.length || 0;
        return `
          <div class="card tournament-card page-enter" onclick="window.location.href='bracket.html?id=${t.id}'">
            <div class="tournament-card-header" style="display:flex; justify-content:space-between; align-items:center;">
              <h3>🏆 ${escapeHTML(t.title || t.name)}</h3>
              <span style="display:inline-block;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;${statusStyle}">${statusText}</span>
            </div>
            <p style="color:var(--text-2); margin-top:8px; font-size:14px;">${escapeHTML(t.description || 'Без описания')}</p>
            <div class="tournament-card-meta" style="margin-top:12px; font-size:12px; color:var(--text-3);">
              <span>👥 Участников: ${participantCount}</span>
              <span style="margin-left:16px;">🎯 Раундов: ${t.total_rounds || 10}</span>
              <span style="margin-left:16px;">📊 Групп: ${t.groups_per_round || 1}</span>
            </div>
          </div>`;
      }).join('');
    } catch (e) { 
      console.error('renderTournamentList error:', e); 
      container.innerHTML = '<p style="color:var(--red);">Ошибка загрузки: ' + escapeHTML(e.message) + '</p>'; 
    }
  }

  function renderStats() {
    const el = document.getElementById("stats");
    if (!el) return;
    let statsPromise;
    if (window.TH && window.TH.getSiteStats) statsPromise = window.TH.getSiteStats().then(res => res.data);
    else {
      const db = DB.getDB();
      statsPromise = Promise.resolve({ tournaments: (db.tournaments || []).length, users: (db.users || []).length, matches: (db.matches || []).length });
    }
    statsPromise.then(stats => {
      if (!stats) return;
      el.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card"><strong>${stats.tournaments}</strong><span>Турниры</span></div>
          <div class="stat-card"><strong>${stats.users}</strong><span>Пользователи</span></div>
          <div class="stat-card"><strong>${stats.matches}</strong><span>Матчи</span></div>
        </div>`;
    }).catch(e => console.error('renderStats error:', e));
  }

  async function initRender() {
    if (initDone) return;
    initDone = true;
    let attempts = 0;
    while (!window.TH && attempts < 50) { await new Promise(r => setTimeout(r, 100)); attempts++; }
    const settings = await loadSiteSettings();
    applySettings(settings);
    renderStats();
    renderTournamentList(document.querySelector("#tournament-list"));
    if (window.Auth && window.Auth.renderNavUser) window.Auth.renderNavUser();
  }

  window.Render = { initRender, renderTournamentList, renderStats };

  if (document.readyState === 'loading') document.addEventListener("DOMContentLoaded", () => setTimeout(initRender, 200));
  else setTimeout(initRender, 200);
})();
