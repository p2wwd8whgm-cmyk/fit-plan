// ============================================================
// STORAGE.JS
// ============================================================
export const Storage = {
  save(key, value) {
    try {
      localStorage.setItem('fp_' + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },
  
  load(key, fallback) {
    try {
      const v = localStorage.getItem('fp_' + key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  
  remove(key) {
    localStorage.removeItem('fp_' + key);
  }
};