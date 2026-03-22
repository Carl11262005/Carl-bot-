import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const LS_KEY = 'carlbot_coin_holdings';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

function saveLocal(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

async function saveToFirestore(docRef, list) {
  try {
    await setDoc(docRef, { holdings: list });
  } catch (e) {
    console.warn('Firestore save failed:', e);
  }
}

export function useCoinPortfolio(userId) {
  const [holdings, setHoldings] = useState(loadLocal);
  const loadedUserRef = useRef(null);

  useEffect(() => {
    if (!userId || loadedUserRef.current === userId) return;
    loadedUserRef.current = userId;

    const docRef = doc(db, 'users', userId, 'data', 'coinPortfolio');
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data().holdings || [];
        setHoldings(data);
        saveLocal(data);
      } else {
        const local = loadLocal();
        if (local.length > 0) saveToFirestore(docRef, local);
      }
    }).catch((e) => console.warn('Firestore load failed:', e));
  }, [userId]);

  const persist = useCallback((list) => {
    saveLocal(list);
    if (userId) {
      const docRef = doc(db, 'users', userId, 'data', 'coinPortfolio');
      saveToFirestore(docRef, list);
    }
  }, [userId]);

  function addHolding(coin) {
    const next = [...holdings, { ...coin, id: Date.now() }];
    setHoldings(next);
    persist(next);
  }

  function removeHolding(id) {
    const next = holdings.filter((h) => h.id !== id);
    setHoldings(next);
    persist(next);
  }

  function updateHolding(id, fields) {
    const next = holdings.map((h) => h.id === id ? { ...h, ...fields } : h);
    setHoldings(next);
    persist(next);
  }

  const cryptoHoldings = holdings.filter((h) => h.type === 'crypto');
  const memeHoldings   = holdings.filter((h) => h.type === 'meme');

  return { holdings, cryptoHoldings, memeHoldings, addHolding, removeHolding, updateHolding };
}
