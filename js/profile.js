/* ============================================================
   Tournament Hub — User Profile (FIXED v6)
   ============================================================ */
(function () {
  'use strict';

  function displayProfileData(user) {
    const nameEl = document.getElementById("profileUsername");
    const mailEl = document.getElementById("profileEmail");
    const dispEl = document.getElementById("inputDisplayName");
    const avatEl = document.getElementById("inputAvatarUrl");
    const fStatus = document.getElementById("fandomStatusBlock");
    if (nameEl) nameEl.textContent = user.username || "User";
    if (mailEl) mailEl.textContent = user.email || "—";
    if (dispEl) dispEl.value = user.displayName || "";
    if (avatEl) avatEl.value = user.avatar || "";
    if (fStatus) {
      if (user.fandomVerified && user.fandomName) {
        fStatus.innerHTML = `
          <div style="background:rgba(0,200,100,0.1); border:1px solid #00c864; padding:12px; border-radius:6px; margin-top:8px;">
            <p style="color:#00c864; margin:0; font-weight:bold;">✓ Аккаунт Fandom привязан</p>
            <p style="margin:4px 0 0 0; font-size:13px;">Никнейм: <strong>${window.DB.escapeHTML(user.fandomName)}</strong></p>
            <button id="btnUnlinkFandom" class="btn-secondary" style="margin-top:10px; padding:4px 12px; font-size:12px;">Отвязать</button>
          </div>`;
        document.getElementById("btnUnlinkFandom")?.addEventListener("click", executeFandomUnlink);
      } else {
        fStatus.innerHTML = `
          <div style="background:var(--bg-2); border:1px solid var(--border); padding:16px; border-radius:6px; margin-top:8px;">
            <p style="margin:0 0 10px 0; font-size:13px; color:var(--text-2);">Свяжите профиль с Fandom для получения прав модератора.</p>
            <div style="display:flex; gap:8px;"><input type="text" id="inputFandomName" placeholder="Ваш ник на Fandom" style="flex:1; margin:0;"><button id="btnLinkFandom" class="btn-primary" style="margin:0; padding:8px 16px;">Привязать</button></div>
          </div>`;
        document.getElementById("btnLinkFandom")?.addEventListener("click", executeFandomLink);
      }
    }
  }

  async function saveProfileChanges() {
    const btn = document.getElementById("btnSaveProfile");
    const dispVal = document.getElementById("inputDisplayName")?.value.trim();
    const avatVal = document.getElementById("inputAvatarUrl")?.value.trim();
    if (!dispVal) { alert("Отображаемое имя не может быть пустым."); return; }
    if (btn) btn.disabled = true;
    try {
      const updated = await window.TH.updateProfile({ display_name: dispVal, avatar: avatVal });
      const user = await window.DB.getCurrentUser();
      if (user) { user.displayName = updated.display_name; user.avatar = updated.avatar; await window.DB.setCurrentUser(user); }
      alert("Профиль обновлён!");
      if (window.Auth && window.Auth.renderNavUser) window.Auth.renderNavUser();
      window.location.reload();
    } catch (e) { alert("Ошибка: " + e.message); }
    finally { if (btn) btn.disabled = false; }
  }

  async function executeFandomLink() {
    const input = document.getElementById("inputFandomName");
    const fName = input ? input.value.trim() : "";
    if (!fName) { alert("Укажите никнейм Fandom."); return; }
    // ⚠️ Требуется реальная верификация через wiki!
    // Используйте FandomAuth.startFandomLink() и проверку правок
    alert("Для привязки Fandom используйте страницу профиля с верификацией через правку на вики.");
    return;
    /* ОТКЛЮЧЕНО — требуется реальная верификация
    try {
      const updated = await window.TH.updateProfile({ fandom_name: fName, fandom_verified: true, fandom_verified_at: new Date().toISOString() });
      const user = await window.DB.getCurrentUser();
      if (user) { user.fandomName = updated.fandom_name; user.fandomVerified = updated.fandom_verified; await window.DB.setCurrentUser(user); }
      alert(`Fandom (${fName}) верифицирован!`);
      if (window.Auth && window.Auth.checkFandomAutoAdmin) await window.Auth.checkFandomAutoAdmin();
      window.location.reload();
    } catch (e) { alert("Не удалось привязать Fandom: " + e.message); }
    */ 
  }

  async function executeFandomUnlink() {
    if (!confirm("Отвязать Fandom-аккаунт? Вы можете потерять права администратора.")) return;
    const res = await window.Auth.unlinkFandom();
    if (res.success) { alert("Fandom отвязан."); window.location.reload(); }
    else { alert("Ошибка: " + res.error); }
  }

  function initProfilePage() {
    window.DB.getCurrentUser().then(user => {
      if (!user) { alert("Авторизуйтесь для просмотра профиля."); window.location.href = "login.html?redirect=profile.html"; return; }
      displayProfileData(user);
      document.getElementById("btnSaveProfile")?.addEventListener("click", saveProfileChanges);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    let checkAttempts = 0;
    const profileInit = setInterval(() => {
      if (window.TH && window.DB && window.Auth) { clearInterval(profileInit); initProfilePage(); }
      checkAttempts++;
      if (checkAttempts > 40) clearInterval(profileInit);
    }, 50);
  });
})();
