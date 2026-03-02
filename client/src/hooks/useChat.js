import { useState, useCallback } from 'react';
import { sendMessage as sendChatMessage } from '../services/chatService.js';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hey Carl! I'm **CarlBot**, your stock portfolio assistant. I can help you analyze stocks, track your portfolio, and stay on top of market trends.\n\nTry asking me things like:\n- \"How's my portfolio doing?\"\n- \"What do you think about $AAPL?\"\n- \"Should I diversify more?\"\n\nHead over to the **Portfolio** tab to add your stocks, and I'll have full context when we chat!",
  timestamp: new Date().toISOString(),
};

export function useChat() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text, portfolio) => {
    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history = [];
      setMessages((prev) => {
        // Build history from current messages (excluding welcome)
        for (const msg of prev) {
          history.push({ role: msg.role, content: msg.content });
        }
        return prev;
      });

      const reply = await sendChatMessage(text, portfolio, history.slice(-20));

      const assistantMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  return { messages, sendMessage, isLoading, clearChat };
}
