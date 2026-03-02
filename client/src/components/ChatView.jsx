import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';
import ChatInput from './ChatInput.jsx';
import CarlMascot from './CarlMascot.jsx';
import '../styles/Chat.css';

export default function ChatView({ messages, onSend, isLoading }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Spinning mascot typing indicator */}
        {isLoading && (
          <div className="typing-indicator">
            <CarlMascot size={32} spinning glow />
            <span className="typing-label">CarlBot is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={onSend} disabled={isLoading} />
    </div>
  );
}
