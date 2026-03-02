import CarlMascot from './CarlMascot.jsx';

export default function Header() {
  return (
    <header className="app-header">
      <CarlMascot size={36} glow />
      <div className="header-text">
        <div className="header-title">CarlBot</div>
        <div className="header-subtitle">Stock Portfolio Assistant</div>
      </div>
      <div className="header-status">
        <span className="status-dot" />
        <span className="status-text">Online</span>
      </div>
    </header>
  );
}
