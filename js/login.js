/* ============================================================
   Tournament Hub — Login Page Controller (FIXED v5)
   ============================================================ */
(function () {
  'use strict';
  let isRegisterMode = false;

  function showError(msg) {
    const el = document.getElementById("loginError");
    if (el) { el.textContent = msg; el.style.display = msg ? "block" : "none"; }
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? "⏳ Подождите..." : btn.dataset.originalText;
  }

  function redirectAfterLogin() {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("redirect") || "index.html";
    window.location.href = target;
  }

  async function handleFormSubmit() {
    showError("");
    const emailEl = document.getElementById("loginEmail");
    const passEl = document.getElementById("loginPassword");
    const userEl = document.getElementById("loginUsername");
    const btn = document.getElementById("loginBtn");
    const email = emailEl ? emailEl.value.trim() : "";
    const password = passEl ? passEl.value : "";
    const username = userEl ? userEl.value.trim() : "";
    if (!email || !password) { showError("Заполните все поля"); return; }
    setLoading(btn, true);
    if (isRegisterMode) {
      if (!username) { showError("Укажите никнейм"); setLoading(btn, false); return; }
      const res = await window.Auth.register(username, password, email);
      if (!res.success) { showError(res.error || "Ошибка регистрации."); setLoading(btn, false); }
      else { alert("Регистрация завершена! Проверьте почту."); toggleFormMode(); setLoading(btn, false); }
    } else {
      const res = await window.Auth.login(email, password);
      if (!res.success) { showError(res.error || "Неверный логин или пароль."); setLoading(btn, false); }
      else { redirectAfterLogin(); }
    }
  }

  async function handleGoogleOAuth() {
    showError("");
    const btn = document.getElementById("googleBtn");
    setLoading(btn, true);
    try {
      const { error } = await window.TH.signInWithProvider('google');
      if (error) throw error;
    } catch (e) { showError("Ошибка Google OAuth: " + e.message); setLoading(btn, false); }
  }

  function toggleFormMode() {
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById("loginTitle");
    const btn = document.getElementById("loginBtn");
    const toggle = document.getElementById("toggleBtn");
    const usernameContainer = document.getElementById("usernameContainer");
    const usernameLabel = document.getElementById("usernameLabel");
    const usernameInput = document.getElementById("loginUsername");
    if (title) title.textContent = isRegisterMode ? "📝 Регистрация" : "🔐 Вход";
    if (btn) btn.textContent = isRegisterMode ? "🚀 Зарегистрироваться" : "🔐 Войти";
    if (toggle) toggle.textContent = isRegisterMode ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Создать";
    if (usernameContainer) usernameContainer.style.display = isRegisterMode ? "block" : "none";
    showError("");
  }

  function handleOAuthCallback() {
    if (window.location.hash.includes('access_token') || window.location.hash.includes('id_token')) {
      showError("Синхронизация профиля...");
      let ticks = 0;
      const oauthCheck = setInterval(async () => {
        const user = await window.TH.getCurrentUser();
        if (user) { clearInterval(oauthCheck); await window.DB.setCurrentUser(user); redirectAfterLogin(); }
        ticks++;
        if (ticks > 60) { clearInterval(oauthCheck); showError("Превышено время ожидания. Попробуйте ещё раз."); }
      }, 150);
    }
  }

  function bindEvents() {
    document.getElementById("loginBtn")?.addEventListener("click", handleFormSubmit);
    document.getElementById("toggleBtn")?.addEventListener("click", toggleFormMode);
    document.getElementById("googleBtn")?.addEventListener("click", handleGoogleOAuth);
    document.getElementById("clearCacheBtn")?.addEventListener("click", function() {
      if (confirm("Очистить кэш авторизации?")) { window.DB.clearAllLocalData(); window.location.reload(); }
    });
    ["loginEmail", "loginPassword", "loginUsername"].forEach(id => {
      document.getElementById(id)?.addEventListener("keydown", (e) => { if (e.key === "Enter") handleFormSubmit(); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    let readyAttempts = 0;
    const checkFormInit = setInterval(() => {
      if (window.TH && window.DB && window.Auth) {
        clearInterval(checkFormInit);
        handleOAuthCallback();
        bindEvents();
        if (!window.location.hash.includes('access_token')) {
          window.DB.getCurrentUser().then(user => { if (user) redirectAfterLogin(); });
        }
      }
      readyAttempts++;
      if (readyAttempts > 40) { clearInterval(checkFormInit); console.error("Modules failed to load"); }
    }, 50);
  });
})();
