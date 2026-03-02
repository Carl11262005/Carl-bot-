import { useState } from 'react';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import ChatView from './components/ChatView.jsx';
import PortfolioView from './components/PortfolioView.jsx';
import { useChat } from './hooks/useChat.js';
import { usePortfolio } from './hooks/usePortfolio.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const { messages, sendMessage, isLoading } = useChat();
  const { portfolio, addStock, removeStock } = usePortfolio();

  function handleSend(text) {
    sendMessage(text, portfolio);
  }

  return (
    <>
      <Header />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'chat' ? (
          <ChatView messages={messages} onSend={handleSend} isLoading={isLoading} />
        ) : (
          <PortfolioView
            portfolio={portfolio}
            addStock={addStock}
            removeStock={removeStock}
          />
        )}
      </div>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}
