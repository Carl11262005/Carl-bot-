import { useState, useCallback, useEffect, useRef } from 'react';
import { sendMessage as sendChatMessage } from '../services/chatService.js';

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

function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return null;
}

function saveConversations(convs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  } catch {}
}

// Initialize state once — ensures conversations and currentId are in sync
const initRef = { current: null };
function getInitialState() {
  if (!initRef.current) {
    const saved = loadConversations();
    const conversations = saved && saved.length > 0 ? saved : [createNewConversation()];
    initRef.current = { conversations, currentId: conversations[0].id };
  }
  return initRef.current;
}

export function useChat() {
  const init = getInitialState();
  const [conversations, setConversations] = useState(init.conversations);
  const [currentId, setCurrentId] = useState(init.currentId);
  const [isLoading, setIsLoading] = useState(false);

  // Keep refs fresh for use inside async callbacks
  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;

  const messagesRef = useRef([]);
  const messages = conversations.find((c) => c.id === currentId)?.messages ?? [];
  messagesRef.current = messages;

  // Persist to localStorage whenever conversations change
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Auto-greet when switching to (or starting) an empty conversation
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
    // Reset the initRef so future calls to getInitialState don't reuse old state
    initRef.current = null;
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
        initRef.current = null;
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
