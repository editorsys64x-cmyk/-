/* ============================================================
   Tournament Hub Authentication (FIXED v8)
   ============================================================ */
(function () {
  'use strict';
  const ADMIN_PASSWORD = "admin123";

  function inlineEscapeHTML(text) {
    if (!text) return "";
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  async function register(username, password, email) {
    if (!username?.trim()) return { success: false, error: "Введите корректный никнейм" };
    if (!password || password.length < 6) return { success: false, error: "Пароль минимум 6 символов" };
    if (!email?.includes('@')) return { success: false, error: "Введите валидный email" };
    try {
      const { data, error } = await window.TH.signUp(email, password, {
        username: username.trim(), display_name: username.trim(), role: 'user'
      });
      if (error) {
        if (error.message?.includes('already registered')) return { success: false, error: "Пользователь с таким email уже существует" };
        return { success: false, error: error.message };
      }
      if (data?.user) {
        const uObj = { id: data.user.id, email: email, username: username.trim(), displayName: username.trim(), role: 'user', fandomName: null, fandomVerified: false };
        await window.DB.setCurrentUser(uObj);
      }
      return { success: true, data };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async function login(email, password) {
    if (!email || !password) return { success: false, error: "Заполните все поля" };
    try {
      const { data, error } = await window.TH.signIn(email, password);
      if (error) return { success: false, error: error.message };
      if (data?.user) {
        const fullUser = await window.TH.getCurrentUser();
        await window.DB.setCurrentUser(fullUser);
        checkFandomAutoAdmin();
      }
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async function logout() {
    try { await window.TH.signOut(); } catch(e) { console.warn("Supabase signOut failed"); }
    await window.DB.setCurrentUser(null);
    localStorage.removeItem("th_admin");
    localStorage.removeItem("th_supabase_auth");
    location.reload();
  }

  function isAdminSync() {
    if (localStorage.getItem("th_admin") === "yes") return true;
    const raw = localStorage.getItem("tournament_hub_user");
    if (!raw) return false;
    try { const u = JSON.parse(raw); return u?.role === 'admin'; } catch(e) { return false; }
  }

  async function isAdmin() {
    const user = await window.TH.getCurrentUser();
    if (user?.role === 'admin') return true;
    return isAdminSync();
  }

  function adminLogin(password) {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("th_admin", "yes");
      window.DB.getCurrentUser().then(user => {
        if (user) { user.role = "admin"; window.DB.setCurrentUser(user); }
      });
      return true;
    }
    return false;
  }

  async function canUserVote(matchId) {
    const db = window.DB.getDB();
    const activeTourney = db.tournaments?.find(t => t.status === 'active') || db.tournaments?.[0];
    const user = await window.DB.getCurrentUser();
    if (activeTourney?.config && !user && !activeTourney.config.allowGuest) {
      return { can: false, reason: "Голосование гостям запрещено. Авторизуйтесь." };
    }
    const votedList = JSON.parse(localStorage.getItem("th_voted_matches") || "[]");
    if (votedList.includes(matchId)) return { can: false, reason: "Вы уже голосовали в этом матче!" };
    if (window.TH && user) {
      const votedServer = await window.TH.hasVoted(matchId);
      if (votedServer) { markVote(matchId); return { can: false, reason: "Голос уже учтён на сервере." }; }
    }
    return { can: true };
  }

  function markVote(matchId) {
    const votedList = JSON.parse(localStorage.getItem("th_voted_matches") || "[]");
    if (!votedList.includes(matchId)) { votedList.push(matchId); localStorage.setItem("th_voted_matches", JSON.stringify(votedList)); }
  }

  function renderNavUser() {
    const box = document.getElementById("navUser");
    if (!box) return;
    window.DB.getCurrentUser().then(user => {
      if (user) {
        const isAdminUser = user.role === 'admin' || localStorage.getItem("th_admin") === "yes";
        const navAdmin = document.getElementById("navAdmin");
        if (navAdmin) { if (isAdminUser) navAdmin.classList.remove("hidden"); else navAdmin.classList.add("hidden"); }
        const escapeFn = (window.DB && window.DB.escapeHTML) ? window.DB.escapeHTML : inlineEscapeHTML;
        const roleBadge = isAdminUser ? `<span class="badge-admin" style="background:var(--accent);color:var(--bg);font-size:11px;padding:2px 6px;border-radius:4px;font-weight:bold;margin-left:6px;">ADMIN</span>` : '';
        const fandomBadge = user.fandomVerified ? `<span title="Fandom аккаунт подтвержден" style="color:var(--blue);margin-left:4px;font-weight:bold;">✓</span>` : '';
        box.innerHTML = `
          <div class="user-nav-profile" style="display:flex;align-items:center;gap:12px;">
            <a href="profile.html" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--text);font-weight:500;">
              <div class="nav-avatar" style="width:28px;height:28px;border-radius:50%;background:var(--bg-3);border:1px solid var(--border-2);display:flex;align-items:center;justify-content:center;font-size:12px;overflow:hidden;">
                ${user.avatar ? `<img src="${escapeFn(user.avatar)}" style="width:100%;height:100%;object-fit:cover;">` : escapeFn(user.displayName || user.username || 'U')[0].toUpperCase()}
              </div>
              <span>${escapeFn(user.displayName || user.username)}</span>${fandomBadge}${roleBadge}
            </a>
            <button id="logoutBtn" class="btn-secondary" style="padding:4px 10px;font-size:12px;margin:0;">Выйти</button>
          </div>`;
        document.getElementById("logoutBtn")?.addEventListener("click", logout);
      } else {
        const navAdmin = document.getElementById("navAdmin");
        if (navAdmin) navAdmin.classList.add("hidden");
        box.innerHTML = `<a href="login.html" class="btn-primary" style="padding:6px 14px;font-size:13px;text-decoration:none;display:inline-block;">🔐 Войти</a>`;
      }
    }).catch(e => {
      console.error('Nav render error:', e);
      box.innerHTML = `<a href="login.html" style="color:var(--text-3);font-size:13px;">Войти</a>`;
    });
  }

  function checkFandomAutoAdmin() {
    window.DB.getCurrentUser().then(user => {
      if (!user?.fandomName || !user?.fandomVerified) return;
      window.TH.getSiteSettings().then(({ data }) => {
        if (data?.fandom_admins && Array.isArray(data.fandom_admins) && data.fandom_admins.includes(user.fandomName)) {
          localStorage.setItem("th_admin", "yes");
          if (user.role !== 'admin') {
            user.role = "admin";
            window.DB.setCurrentUser(user);
            window.TH.setUserRole(user.id, 'admin').catch(() => {});
          }
        }
      }).catch(() => {});
    }).catch(() => {});
  }

  async function unlinkFandom() {
    try {
      if (window.TH) await window.TH.updateProfile({ fandom_name: null, fandom_verified: false, fandom_verified_at: null });
      const user = await window.DB.getCurrentUser();
      if (user) { user.fandomName = null; user.fandomVerified = false; await window.DB.setCurrentUser(user); }
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  }

  window.Auth = {
    register, login, logout, isAdmin, isAdminSync, adminLogin,
    canUserVote, markVote, renderNavUser, checkFandomAutoAdmin, unlinkFandom
  };
})();
