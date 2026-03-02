import CarlMascot from './CarlMascot.jsx';

function formatRelativeTime(isoStr) {
  const d = new Date(isoStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPreview(messages) {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  if (last) return last.content.slice(0, 50) + (last.content.length > 50 ? '…' : '');
  const first = messages[0];
  if (first) return first.content.replace(/\*\*/g, '').slice(0, 50) + '…';
  return 'No messages yet';
}

export default function ConversationSidebar({
  conversations,
  currentId,
  onSwitch,
  onNew,
  onDelete,
  onClose,
}) {
  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <aside className="sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <CarlMascot size={28} glow />
            <span className="sidebar-brand-name">CarlBot</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <button className="sidebar-new-btn" onClick={() => { onNew(); onClose(); }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>

        <p className="sidebar-section-label">Recent</p>

        <div className="sidebar-list">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`sidebar-item ${conv.id === currentId ? 'active' : ''}`}
              onClick={() => { onSwitch(conv.id); onClose(); }}
            >
              <div className="sidebar-item-body">
                <div className="sidebar-item-title">{conv.title}</div>
                <div className="sidebar-item-preview">{getPreview(conv.messages)}</div>
              </div>
              <div className="sidebar-item-meta">
                <span className="sidebar-item-time">{formatRelativeTime(conv.updatedAt)}</span>
                <button
                  className="sidebar-delete-btn"
                  onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                  aria-label="Delete conversation"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
