import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSeed, SEED_VERSION } from '../data/seed';
import policy from './policy';

const STORE_KEY = '@smartrent/demo/v3';
const Context = createContext(null);
// 저장된 데이터가 예전 seed로 만들어졌으면 새 seed로 바꾼다. 로그인한 계정은 그대로 둔다.
const fresh = session => { const next = createSeed(); if (session && next.users.some(u => u.id === session)) next.session = session; return next; };
const upgrade = saved => (saved && saved.seedVersion === SEED_VERSION ? saved : fresh(saved?.session));
export const useApp = () => useContext(Context);
export function AppProvider({ children }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { let alive = true; AsyncStorage.getItem(STORE_KEY).then(raw => { if (alive) setState(raw ? upgrade(JSON.parse(raw)) : createSeed()); }).catch(() => { if (alive) setState(createSeed()); }); return () => { alive = false; }; }, []);
  useEffect(() => { if (state && state.seedVersion !== SEED_VERSION) setState(fresh(state.session)); });
  useEffect(() => { if (state) AsyncStorage.setItem(STORE_KEY, JSON.stringify(state)).catch(() => setError('기기 저장에 실패했습니다.')); }, [state]);
  useEffect(() => { const t = setInterval(() => setState(s => s ? policy.reconcile(s) : s), 5000); return () => clearInterval(t); }, []);
  const run = useCallback((fn) => { setState(previous => { try { const result = fn(previous); setError(''); return result; } catch (e) { setError(e.message || '처리하지 못했습니다.'); return previous; } }); }, []);
  const clearError = useCallback(() => setError(''), []);
  const reset = useCallback(() => { setState(createSeed()); setError(''); }, []);
  const value = useMemo(() => ({ state, error, clearError, run, reset, policy, currentUser: state?.users.find(u => u.id === state.session) }), [state, error, run, reset]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
