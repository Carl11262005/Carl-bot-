import CarlMascot from './CarlMascot.jsx';

export default function Header({ onMenuClick, theme, onToggleTheme, user, onSignOut }) {
  return (
    <header className="app-header">
      <button className="header-menu-btn" onClick={onMenuClick} aria-label="Open conversations">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <CarlMascot size={36} glow />
      <div className="header-text">
        <div className="header-title">CarlBot</div>
        <div className="header-subtitle">Stock Portfolio Assistant</div>
      </div>
      <div className="header-status">
        <span className="status-dot" />
        <span className="status-text">Online</span>
      </div>
      <button
        className="header-theme-btn"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      {user && (
        <button
          className="header-user-btn"
          onClick={onSignOut}
          title={`Signed in as ${user.displayName || user.email}\nClick to sign out`}
          aria-label="Sign out"
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="header-user-avatar" referrerPolicy="no-referrer" />
          ) : (
            <span className="header-user-initials">
              {(user.displayName || user.email || '?')[0].toUpperCase()}
            </span>
          )}
        </button>
      )}
    </header>
  );
}
