import { useState, useCallback, useEffect } from 'react';
import { db } from '../firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DOC_REF = doc(db, 'userData', 'portfolio');
const STORAGE_KEY = 'carlbot_portfolio';

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocal(portfolio) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}

async function saveToFirestore(portfolio) {
  try {
    await setDoc(DOC_REF, { stocks: portfolio });
  } catch (e) {
    console.warn('Firestore save failed, using localStorage fallback:', e);
  }
}

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState(loadLocal);

  // On mount, load from Firestore (overrides localStorage if available)
  useEffect(() => {
    getDoc(DOC_REF).then((snap) => {
      if (snap.exists()) {
        const data = snap.data().stocks || [];
        setPortfolio(data);
        saveLocal(data);
      } else {
        // First time: push localStorage data up to Firestore
        const local = loadLocal();
        if (local.length > 0) saveToFirestore(local);
      }
    }).catch((e) => console.warn('Firestore load failed:', e));
  }, []);

  const persist = useCallback((next) => {
    saveLocal(next);
    saveToFirestore(next);
  }, []);

  const addStock = useCallback((entry) => {
    setPortfolio((prev) => {
      const exists = prev.find((s) => s.symbol === entry.symbol);
      let next;
      if (exists) {
        next = prev.map((s) =>
          s.symbol === entry.symbol ? { ...s, ...entry } : s
        );
      } else {
        next = [...prev, { ...entry, addedAt: new Date().toISOString() }];
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const removeStock = useCallback((symbol) => {
    setPortfolio((prev) => {
      const next = prev.filter((s) => s.symbol !== symbol);
      persist(next);
      return next;
    });
  }, [persist]);

  const updateStock = useCallback((symbol, fields) => {
    setPortfolio((prev) => {
      const next = prev.map((s) => s.symbol === symbol ? { ...s, ...fields } : s);
      persist(next);
      return next;
    });
  }, [persist]);

  const clearPortfolio = useCallback(() => {
    setPortfolio([]);
    persist([]);
  }, [persist]);

  return { portfolio, addStock, removeStock, updateStock, clearPortfolio };
}
