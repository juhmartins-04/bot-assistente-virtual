import React, { createContext, useContext, useEffect, useState } from 'react';
const CHAVE = 'pronto-tema';
const TemaContext = createContext(null);
export function lerPreferencia() {
  try {
    const valor = window.localStorage.getItem(CHAVE);
    return valor === 'light' || valor === 'dark' ? valor : null;
  } catch { return null; }
}
export function TemaProvider({ children }) {
  const [preferencia, setPreferencia] = useState(lerPreferencia);
  const [sistema, setSistema] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const tema = preferencia || sistema;
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const mudarSistema = e => setSistema(e.matches ? 'dark' : 'light');
    const sincronizar = e => { if (e.key === CHAVE || e.key === null) setPreferencia(lerPreferencia()); };
    media.addEventListener('change', mudarSistema);
    window.addEventListener('storage', sincronizar);
    return () => {
      media.removeEventListener('change', mudarSistema);
      window.removeEventListener('storage', sincronizar);
    };
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = tema; }, [tema]);
  function alternar() {
    const novo = tema === 'dark' ? 'light' : 'dark';
    setPreferencia(novo);
    document.documentElement.dataset.theme = novo;
    try { window.localStorage.setItem(CHAVE, novo); } catch { /* Funciona mesmo sem armazenamento. */ }
  }
  return React.createElement(TemaContext.Provider, { value: { tema, alternar } }, children);
}
export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error('useTema precisa de TemaProvider');
  return contexto;
}
