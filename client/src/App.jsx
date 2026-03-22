import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import ChatView from './components/ChatView.jsx';
import PortfolioView from './components/PortfolioView.jsx';
import ConversationSidebar from './components/ConversationSidebar.jsx';
import SignIn from './components/SignIn.jsx';
import { useChat } from './hooks/useChat.js';
import { usePortfolio } from './hooks/usePortfolio.js';
import { useCoinPortfolio } from './hooks/useCoinPortfolio.js';
import { useAuth } from './hooks/useAuth.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem('carlbot-theme') || 'dark'
  );

  const { user, signInWithGoogle, signOut } = useAuth();

  // Apply theme to <html> element whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('carlbot-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  const userId = user?.uid ?? null;

  const {
    messages,
    sendMessage,
    isLoading,
    conversations,
    currentId,
    startNewConversation,
    switchConversation,
    deleteConversation,
  } = useChat(userId);

  const { portfolio, addStock, removeStock, updateStock } = usePortfolio(userId);
  const { cryptoHoldings, memeHoldings, addHolding, removeHolding, updateHolding } = useCoinPortfolio(userId);

  function handleSend(text) {
    sendMessage(text, portfolio);
  }

  // Still loading auth state
  if (user === undefined) {
    return <div className="auth-loading">Loading…</div>;
  }

  // Not signed in
  if (!user) {
    return <SignIn onSignIn={signInWithGoogle} />;
  }

  return (
    <>
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={user}
        onSignOut={signOut}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'chat' ? (
          <ChatView messages={messages} onSend={handleSend} isLoading={isLoading} />
        ) : (
          <PortfolioView
            portfolio={portfolio}
            addStock={addStock}
            removeStock={removeStock}
            updateStock={updateStock}
            cryptoHoldings={cryptoHoldings}
            memeHoldings={memeHoldings}
            addHolding={addHolding}
            removeHolding={removeHolding}
            updateHolding={updateHolding}
          />
        )}
      </div>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {sidebarOpen && (
        <ConversationSidebar
          conversations={conversations}
          currentId={currentId}
          onSwitch={switchConversation}
          onNew={startNewConversation}
          onDelete={deleteConversation}
          onClose={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
