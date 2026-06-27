/* ============================================================
   Tournament Hub — Data Bridge Layer (FIXED v12 — Clean Bridge)
   ============================================================ */
(function () {
  'use strict';
  const STORAGE_KEY = "tournament_hub_data";
  const USER_KEY = "tournament_hub_user";

  let defaultDB = {
    tournaments: [],
    players: [],
    settings: { siteName: "Tournament Hub", allowGuestVotes: true, theme: "dark" }
  };

  function escapeHTML(text) {
    if (!text) return "";
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function getDB() {
    try { const data = localStorage.getItem(STORAGE_KEY); return data ? JSON.parse(data) : defaultDB; }
    catch (e) { return defaultDB; }
  }

  function saveDB(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { console.error("DB save error:", e); }
  }

  function updateDB(fn) { const db = getDB(); fn(db); saveDB(db); }

  async function getCurrentUser() {
    if (window.TH && window.TH.getCurrentUser) {
      try { const user = await window.TH.getCurrentUser(); if (user) return user; } catch (e) {}
    }
    try { const localUser = localStorage.getItem(USER_KEY); return localUser ? JSON.parse(localUser) : null; }
    catch (e) { return null; }
  }

  async function setCurrentUser(userObj) {
    try {
      if (userObj) {
        localStorage.setItem(USER_KEY, JSON.stringify(userObj));
        localStorage.setItem("th_user", JSON.stringify({ role: userObj.role || 'user' }));
      } else {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem("th_user");
      }
    } catch (e) { console.error("User save error:", e); }
  }

  function clearAllLocalData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("th_admin");
    localStorage.removeItem("th_voted_matches");
    localStorage.removeItem("th_supabase_auth");
  }

  async function syncWithSupabase() {
    if (!window.TH || typeof window.TH.getClient !== 'function') return;
    try {
      const serverUser = await window.TH.getCurrentUser();
      if (serverUser) await setCurrentUser(serverUser);
      else await setCurrentUser(null);
    } catch (e) { console.warn("Supabase sync unavailable:", e); }
  }

  window.toast = function(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 300); }, 3000);
  };

  document.addEventListener("DOMContentLoaded", function () {
    let checkTicks = 0;
    const bridgeInit = setInterval(async () => {
      if (window.TH && typeof window.TH.onAuthStateChange === 'function') {
        clearInterval(bridgeInit);
        window.TH.onAuthStateChange(async (event, session) => {
          if (session?.user) { const freshUser = await window.TH.getCurrentUser(); await setCurrentUser(freshUser); }
          else await setCurrentUser(null);
          if (window.Auth && typeof window.Auth.renderNavUser === 'function') window.Auth.renderNavUser();
        });
        await syncWithSupabase();
        if (window.Auth && typeof window.Auth.renderNavUser === 'function') window.Auth.renderNavUser();
      }
      checkTicks++;
      if (checkTicks > 40) clearInterval(bridgeInit);
    }, 50);
  });

  window.DB = { getDB, saveDB, updateDB, getCurrentUser, setCurrentUser, clearAllLocalData, syncWithSupabase, escapeHTML };
})();
