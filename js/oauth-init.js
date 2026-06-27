/* ============================================================
   OAuth Init — Supabase Config (FIXED v9 — persistent auth)
   ============================================================ */
(function() {
  'use strict';
  const SUPABASE_URL = 'https://fpabooteqfahhzobcpnh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwYWJvb3RlcWZhaGh6b2JjcG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjgwOTIsImV4cCI6MjA5NzkwNDA5Mn0.cc1oG5-73US61LI9uDaPwuQsOjLkIAPxDcfGQvVY9Ac';
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase library not loaded!');
    return;
  }
  window._supabaseConfig = {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
    basePath: '',
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'th_supabase_auth',
        storage: localStorage
      },
      realtime: { params: { eventsPerSecond: 10 } }
    }
  };
  console.log('✅ Supabase config ready');
})();
