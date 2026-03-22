import { useState, useCallback, useEffect, useRef } from 'react';
import { sendMessage as sendChatMessage } from '../services/chatService.js';
import { db } from '../firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'carlbot_conversations';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return `Good morning, Carl! ☀️ I'm **CarlBot**, your stock portfolio assistant. What can I help you with today?`;
  } else if (hour >= 12 && hour < 17) {
    return `Good afternoon, Carl! 📈 I'm **CarlBot**, your stock portfolio assistant. How can I help you today?`;
  } else if (hour >= 17 && hour < 21) {
    return `Good evening, Carl! 🌆 I'm **CarlBot**, your stock portfolio assistant. How are the markets treating you?`;
  } else {
    return `Hey Carl! 🌙 I'm **CarlBot**, your stock portfolio assistant. Burning the midnight oil? Let's talk stocks.`;
  }
}

function createNewConversation() {
  return {
    id: generateId(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return null;
}

function saveLocal(convs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  } catch {}
}

async function saveToFirestore(docRef, convs) {
  try {
    await setDoc(docRef, { conversations: convs });
  } catch (e) {
    console.warn('Firestore save failed:', e);
  }
}

export function useChat(userId) {
  const [conversations, setConversations] = useState(() => {
    const saved = loadLocal();
    const convs = saved && saved.length > 0 ? saved : [createNewConversation()];
    return convs;
  });
  const [currentId, setCurrentId] = useState(() => {
    const saved = loadLocal();
    const convs = saved && saved.length > 0 ? saved : null;
    return convs ? convs[0].id : conversations[0]?.id;
  });
  const [isLoading, setIsLoading] = useState(false);
  const loadedUserRef = useRef(null);

  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;

  const messagesRef = useRef([]);
  const messages = conversations.find((c) => c.id === currentId)?.messages ?? [];
  messagesRef.current = messages;

  // Load from Firestore when userId changes
  useEffect(() => {
    if (!userId || loadedUserRef.current === userId) return;
    loadedUserRef.current = userId;

    const docRef = doc(db, 'users', userId, 'data', 'conversations');
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data().conversations;
        if (Array.isArray(data) && data.length > 0) {
          setConversations(data);
          setCurrentId(data[0].id);
          saveLocal(data);
        }
      } else {
        // First time: push localStorage data up to Firestore
        const local = loadLocal();
        if (local && local.length > 0) saveToFirestore(docRef, local);
      }
    }).catch((e) => console.warn('Firestore load failed:', e));
  }, [userId]);

  // Persist whenever conversations change
  useEffect(() => {
    saveLocal(conversations);
    if (userId) {
      const docRef = doc(db, 'users', userId, 'data', 'conversations');
      saveToFirestore(docRef, conversations);
    }
  }, [conversations, userId]);

  // Auto-greet when switching to an empty conversation
  useEffect(() => {
    const current = conversations.find((c) => c.id === currentId);
    if (!current || current.messages.length > 0) return;

    const greeting = {
      role: 'assistant',
      content: getGreeting(),
      timestamp: new Date().toISOString(),
    };

    const timer = setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== currentId || c.messages.length > 0) return c;
          return { ...c, messages: [greeting], updatedAt: new Date().toISOString() };
        })
      );
    }, 380);

    return () => clearTimeout(timer);
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async (text, portfolio) => {
    const cid = currentIdRef.current;
    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const history = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== cid) return c;
        const newMsgs = [...c.messages, userMessage];
        const isFirstUser = !c.messages.some((m) => m.role === 'user');
        const title = isFirstUser
          ? text.slice(0, 42) + (text.length > 42 ? '…' : '')
          : c.title;
        return { ...c, messages: newMsgs, title, updatedAt: new Date().toISOString() };
      })
    );

    setIsLoading(true);

    const fullHistory = [...history, { role: 'user', content: text }];

    try {
      const reply = await sendChatMessage(text, portfolio, fullHistory.slice(-20));

      const assistantMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== cid) return c;
          return {
            ...c,
            messages: [...c.messages, assistantMessage],
            updatedAt: new Date().toISOString(),
          };
        })
      );
    } catch {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== cid) return c;
          return {
            ...c,
            messages: [
              ...c.messages,
              {
                role: 'assistant',
                content:
                  "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
                timestamp: new Date().toISOString(),
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    const newConv = createNewConversation();
    setConversations((prev) => [newConv, ...prev]);
    setCurrentId(newConv.id);
  }, []);

  const switchConversation = useCallback((id) => {
    setCurrentId(id);
  }, []);

  const deleteConversation = useCallback((id) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const newConv = createNewConversation();
        setCurrentId(newConv.id);
        return [newConv];
      }
      if (id === currentIdRef.current) {
        setCurrentId(filtered[0].id);
      }
      return filtered;
    });
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    conversations,
    currentId,
    startNewConversation,
    switchConversation,
    deleteConversation,
  };
}
