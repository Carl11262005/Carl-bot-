import { useState, useCallback, useEffect, useRef } from 'react';
import { db } from '../firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

async function saveToFirestore(docRef, portfolio) {
  try {
    await setDoc(docRef, { stocks: portfolio });
  } catch (e) {
    console.warn('Firestore save failed, using localStorage fallback:', e);
  }
}

export function usePortfolio(userId) {
  const [portfolio, setPortfolio] = useState(loadLocal);
  const loadedUserRef = useRef(null);

  // On userId change, load from Firestore
  useEffect(() => {
    if (!userId || loadedUserRef.current === userId) return;
    loadedUserRef.current = userId;

    const docRef = doc(db, 'users', userId, 'data', 'portfolio');
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data().stocks || [];
        setPortfolio(data);
        saveLocal(data);
      } else {
        // First time: push localStorage data up to Firestore
        const local = loadLocal();
        if (local.length > 0) saveToFirestore(docRef, local);
      }
    }).catch((e) => console.warn('Firestore load failed:', e));
  }, [userId]);

  const persist = useCallback((next) => {
    saveLocal(next);
    if (userId) {
      const docRef = doc(db, 'users', userId, 'data', 'portfolio');
      saveToFirestore(docRef, next);
    }
  }, [userId]);

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
