import Markdown from 'react-markdown';
import CarlMascot from './CarlMascot.jsx';

export default function MessageBubble({ message }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isAssistant = message.role === 'assistant';

  return (
    <div className={`message-row ${message.role}`}>
      {/* Small mascot next to bot messages */}
      {isAssistant && <CarlMascot size={28} glow />}

      <div className={`message-bubble ${message.role}`}>
        {isAssistant ? (
          <Markdown>{message.content}</Markdown>
        ) : (
          <p>{message.content}</p>
        )}
        <div className="message-time">{time}</div>
      </div>
    </div>
  );
}
