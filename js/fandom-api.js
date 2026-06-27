/* ============================================================
   Tournament Hub — Fandom Wiki Integration (v1)
   Подгрузка изображений и ссылок с Fandom
   ============================================================ */
(function () {
  'use strict';

  const FANDOM_WIKI_URL = 'https://chickengun-fanon.fandom.com/ru';

  /**
   * Получить URL изображения статьи через Fandom API
   * @param {string} pageName - название страницы (как в URL)
   * @returns {Promise<string|null>} URL изображения или null
   */
  async function fetchPageImage(pageName) {
    if (!pageName) return null;

    try {
      const url = `${FANDOM_WIKI_URL}/api.php?action=query&titles=${encodeURIComponent(pageName)}&prop=pageimages&pithumbsize=500&format=json&origin=*`;
      const res = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!res.ok) return null;

      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) return null;

      const page = Object.values(pages)[0];
      return page?.thumbnail?.source || null;
    } catch (e) {
      console.warn('Fandom image fetch failed:', e);
      return null;
    }
  }

  /**
   * Получить URL изображения по полному URL статьи
   * @param {string} articleUrl - полный URL типа https://.../wiki/Название
   * @returns {Promise<string|null>}
   */
  async function fetchImageFromUrl(articleUrl) {
    if (!articleUrl) return null;

    // Извлекаем название страницы из URL
    // URL вида: https://chickengun-fanon.fandom.com/ru/wiki/Название_статьи
    const match = articleUrl.match(/\/wiki\/(.+)$/);
    if (!match) return null;

    const pageName = decodeURIComponent(match[1]);
    return await fetchPageImage(pageName);
  }

  /**
   * Построить ссылку на статью по названию
   * @param {string} pageName - название страницы
   * @returns {string} полный URL
   */
  function buildArticleUrl(pageName) {
    if (!pageName) return '#';
    return `${FANDOM_WIKI_URL}/wiki/${encodeURIComponent(pageName.replace(/ /g, '_'))}`;
  }

  /**
   * Проверить, является ли URL ссылкой на Fandom
   * @param {string} url 
   * @returns {boolean}
   */
  function isFandomUrl(url) {
    return url && url.includes('fandom.com');
  }

  window.FandomAPI = {
    fetchPageImage,
    fetchImageFromUrl,
    buildArticleUrl,
    isFandomUrl,
    FANDOM_WIKI_URL
  };
})();
