import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import pt from './pt.json';
import en from './en.json';
import es from './es.json';

const translations = { pt, en, es };
const STORAGE_KEY = 'rw_lang';

function detectLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && translations[saved]) return saved;
  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return 'pt';
}

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : path), obj);
}

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  const setLang = useCallback((l) => {
    if (translations[l]) {
      setLangState(l);
      localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const dict = translations[lang];
  const t = useCallback((key) => get(dict, key), [dict]);

  const value = useMemo(() => ({ lang, setLang, t, langs: ['pt', 'en', 'es'] }), [lang, setLang, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
