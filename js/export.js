/* Tournament Hub Export / backup system */
(function () {
  function getBackupData() { const db = DB.getDB(); return { version: 1, exportedAt: new Date().toISOString(), data: db }; }
  function downloadBackup() {
    const backup = getBackupData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "tournament-hub-backup-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function importBackup(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = function () { try { const backup = JSON.parse(reader.result); if (!backup || !backup.data) { resolve(false); return; } DB.saveDB(backup.data); resolve(true); } catch (e) { console.error("Import error", e); resolve(false); } };
      reader.readAsText(file);
    });
  }
  function exportAllData() { downloadBackup(); }
  function importAllData(jsonText) { try { const backup = JSON.parse(jsonText); if (!backup || !backup.data) return { ok: false, err: "Неверный формат" }; DB.saveDB(backup.data); return { ok: true }; } catch (e) { return { ok: false, err: "Ошибка: " + e.message }; } }
  window.Export = { getBackupData, downloadBackup, importBackup };
  window.getBackupData = getBackupData; window.downloadBackup = downloadBackup; window.importBackup = importBackup;
  window.exportAllData = exportAllData; window.importAllData = importAllData;
})();
