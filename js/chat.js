/* ============================================================
   Tournament Hub Comments (FIXED v5 — safe subscribe, no leaks)
   ============================================================ */
(function () {
  'use strict';
  const subscribedTournaments = new Set();
  const activeChannels = new Map();

  function escapeHTML(text) {
    if (!text) return "";
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  async function getComments(tournamentId) {
    if (window.TH) {
      try { const { data } = await window.TH.getComments(tournamentId); if (data) return data; }
      catch (e) { console.warn('Supabase comments failed'); }
    }
    const db = DB.getDB();
    return (db.comments || []).filter(c => c.tournamentId === tournamentId).sort((a, b) => b.createdAt - a.createdAt);
  }

  async function addComment(tournamentId, text) {
    const user = await DB.getCurrentUser();
    if (!user) return { error: new Error('Требуется авторизация') };
    const clean = String(text || "").trim();
    if (!clean) return { error: new Error('Пустой комментарий') };
    if (window.TH) {
      try { const { data, error } = await window.TH.addComment(tournamentId, clean); if (error) return { error }; return { data }; }
      catch (e) { console.warn('Supabase addComment failed'); }
    }
    const db = DB.getDB();
    const newComment = { id: 'comm-' + Math.random().toString(36).substr(2, 9), tournamentId, userId: user.id, username: user.username || user.display_name, text: clean, createdAt: Date.now() };
    db.comments = db.comments || []; db.comments.push(newComment); DB.saveDB(db);
    return { data: newComment };
  }

  async function deleteComment(commentId) {
    if (window.TH) {
      try { const { error } = await window.TH.deleteComment(commentId); if (error) return { error }; return { success: true }; }
      catch (e) { return { error: e }; }
    }
    const db = DB.getDB();
    db.comments = (db.comments || []).filter(c => c.id !== commentId); DB.saveDB(db);
    return { success: true };
  }

  async function renderComments(tournamentId, container) {
    if (!container) return;
    const comments = await getComments(tournamentId);
    const currentUser = await DB.getCurrentUser();
    const isAdmin = window.Auth && window.Auth.isAdminSync && window.Auth.isAdminSync();
    if (comments.length === 0) { container.innerHTML = '<p style="color:var(--text-3); text-align:center; padding:20px;">Нет комментариев. Будьте первым!</p>'; return; }
    container.innerHTML = comments.map(c => {
      const dateStr = new Date(c.createdAt || c.created_at).toLocaleString("ru-RU");
      const canDelete = isAdmin || (currentUser && (currentUser.id === c.userId || currentUser.id === c.user_id));
      return `<div class="comment-card chat-message" id="comment-${c.id}"><div class="comment-meta" style="display:flex; align-items:center; gap:10px; margin-bottom:8px;"><strong>${escapeHTML(c.username || c.user_name || c.author_name || "Аноним")}</strong><span style="color:var(--text-3); font-size:12px;">${dateStr}</span>${canDelete ? `<button class="btn-text" style="color:var(--red); margin-left:auto; font-size:12px; cursor:pointer; background:none; border:none;" onclick="Comments.handleDelete('${c.id}', '${tournamentId}')">❌</button>` : ''}</div><div class="comment-text">${escapeHTML(c.text || c.content)}</div></div>`;
    }).join('');
  }

  window.Comments = window.Comments || {};
  window.Comments.handleDelete = async function(commentId, tournamentId) {
    if (!confirm("Удалить этот комментарий?")) return;
    const result = await deleteComment(commentId);
    if (result.error) alert("Ошибка: " + (result.error.message || result.error));
    else { const container = document.getElementById("comments-list"); if (container) renderComments(tournamentId, container); }
  };

  function subscribeToComments(tournamentId, container) {
    if (!window.TH || subscribedTournaments.has(tournamentId)) return;
    if (activeChannels.has(tournamentId)) { try { const oldChannel = activeChannels.get(tournamentId); window.TH.getClient().removeChannel(oldChannel); } catch (e) {} }
    subscribedTournaments.add(tournamentId);
    const channel = window.TH.getClient().channel('comments-' + tournamentId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: 'tournament_id=eq.' + tournamentId }, () => { renderComments(tournamentId, container); }).subscribe();
    activeChannels.set(tournamentId, channel);
  }

  function unsubscribeFromComments(tournamentId) {
    if (activeChannels.has(tournamentId)) { try { const channel = activeChannels.get(tournamentId); window.TH.getClient().removeChannel(channel); } catch (e) {} activeChannels.delete(tournamentId); subscribedTournaments.delete(tournamentId); }
  }

  window.Comments = { ...window.Comments, getComments, addComment, deleteComment, renderComments, subscribeToComments, unsubscribeFromComments };
})();