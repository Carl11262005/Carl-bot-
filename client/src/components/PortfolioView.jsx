import { useState } from 'react';
import StockCard from './StockCard.jsx';
import StockTicker from './StockTicker.jsx';
import { CryptoSection, MemeSection, MoonshotSection } from './CryptoSection.jsx';
import { CryptoHoldingsSection, MemeHoldingsSection } from './CryptoHoldings.jsx';
import AddStockModal from './AddStockModal.jsx';
import AddCoinModal from './AddCoinModal.jsx';
import EditHoldingModal from './EditHoldingModal.jsx';
import StockSearch from './StockSearch.jsx';
import StockDetail from './StockDetail.jsx';
import CryptoDetail from './CryptoDetail.jsx';
import PortfolioInsights from './PortfolioInsights.jsx';
import '../styles/Portfolio.css';

export default function PortfolioView({
  portfolio, addStock, removeStock, updateStock,
  cryptoHoldings, memeHoldings, addHolding, removeHolding, updateHolding,
}) {
  const [showModal, setShowModal]   = useState(false);
  const [addStockInit, setAddStockInit] = useState(null); // { symbol, name } pre-fill
  const [addMenu, setAddMenu]       = useState(false);
  const [addCoinCfg, setAddCoinCfg] = useState(null); // { type, coin? }

  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedCoin,  setSelectedCoin]  = useState(null);

  // Edit modals
  const [editStock, setEditStock] = useState(null); // stock object
  const [editCoin,  setEditCoin]  = useState(null); // coin holding object

  function openAddCoin(type, coin = null) {
    setAddMenu(false);
    setAddCoinCfg({ type, coin });
  }

  return (
    <div className="portfolio-view">
      {/* Scrolling market ticker at the very top */}
      <StockTicker portfolio={portfolio} />

      {/* Portfolio insights / overview card */}
      <PortfolioInsights
        portfolio={portfolio}
        cryptoHoldings={cryptoHoldings}
        memeHoldings={memeHoldings}
      />

      {/* All scrollable content below the ticker */}
      <div className="portfolio-scroll">

        {/* ── Crypto Holdings ───────────────────────── */}
        <CryptoHoldingsSection
          holdings={cryptoHoldings}
          onTap={setSelectedCoin}
          onRemove={removeHolding}
          onEdit={setEditCoin}
          onAddNew={() => openAddCoin('crypto')}
        />

        {/* ── Meme Coin Holdings ────────────────────── */}
        <MemeHoldingsSection
          holdings={memeHoldings}
          onTap={setSelectedCoin}
          onRemove={removeHolding}
          onEdit={setEditCoin}
          onAddNew={() => openAddCoin('meme')}
        />

        {/* ── Your Stock Holdings ───────────────────── */}
        <div className="portfolio-holdings">
          {/* Summary header — overflow:hidden for glow, no search inside */}
          <div className="portfolio-summary">
            <div className="portfolio-summary-label">Your Holdings</div>
            {portfolio.length > 0 && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                {portfolio.length} stock{portfolio.length !== 1 ? 's' : ''} tracked
              </div>
            )}
          </div>

          {/* Search bar lives OUTSIDE the overflow:hidden summary */}
          <div className="stock-search-bar-wrapper">
            <StockSearch onSelect={(item) => {
              const owned = portfolio.find((s) => s.symbol === item.symbol);
              setSelectedStock(owned ?? item);
            }} />
          </div>

          {portfolio.length === 0 ? (
            <div className="portfolio-empty-inline">
              <div className="portfolio-empty-icon" style={{ fontSize: 36 }}>📊</div>
              <p>No stocks yet — tap <strong>+</strong> to add one or search above.</p>
            </div>
          ) : (
            <div className="portfolio-list">
              {portfolio.map((stock) => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  onRemove={removeStock}
                  onTap={() => setSelectedStock(stock)}
                  onEdit={setEditStock}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Crypto ───────────────────────────── */}
        <CryptoSection onTap={setSelectedCoin} />

        {/* ── Meme Coins (+ Moonshot live) ──────── */}
        <MemeSection onTap={setSelectedCoin} />

        {/* ── Trending on Moonshot ─────────────── */}
        <MoonshotSection onTap={setSelectedCoin} />

        {/* Bottom padding so FAB doesn't overlap last card */}
        <div style={{ height: 88 }} />
      </div>

      {/* Floating add button */}
      <button
        className="portfolio-add-btn"
        onClick={() => setAddMenu((v) => !v)}
        aria-label="Add"
      >
        {addMenu ? '×' : '+'}
      </button>

      {/* Add menu */}
      {addMenu && (
        <>
          <div className="add-menu-overlay" onClick={() => setAddMenu(false)} />
          <div className="add-menu">
            <button className="add-menu-item" onClick={() => { setAddMenu(false); setShowModal(true); }}>
              📈 Add Stock
            </button>
            <button className="add-menu-item" onClick={() => openAddCoin('crypto')}>
              ₿ Add Crypto
            </button>
            <button className="add-menu-item" onClick={() => openAddCoin('meme')}>
              🐸 Add Meme Coin
            </button>
          </div>
        </>
      )}

      {showModal && (
        <AddStockModal
          initialSymbol={addStockInit}
          onAdd={addStock}
          onClose={() => { setShowModal(false); setAddStockInit(null); }}
        />
      )}

      {addCoinCfg && (
        <AddCoinModal
          initialCoin={addCoinCfg.coin || null}
          initialType={addCoinCfg.type}
          onAdd={addHolding}
          onClose={() => setAddCoinCfg(null)}
        />
      )}

      {/* Edit modals */}
      {editStock && (
        <EditHoldingModal
          holding={editStock}
          type="stock"
          onSave={(fields) => updateStock(editStock.symbol, fields)}
          onClose={() => setEditStock(null)}
        />
      )}

      {editCoin && (
        <EditHoldingModal
          holding={editCoin}
          type="coin"
          onSave={(fields) => updateHolding(editCoin.id, fields)}
          onClose={() => setEditCoin(null)}
        />
      )}

      {selectedStock && (
        <StockDetail
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
          onAdd={(stockInfo) => {
            setSelectedStock(null);
            setAddStockInit(stockInfo);
            setShowModal(true);
          }}
        />
      )}

      {selectedCoin && (
        <CryptoDetail
          coin={selectedCoin}
          onClose={() => setSelectedCoin(null)}
          onAddToPortfolio={(coin) => {
            const type = coin.address ? 'meme' : 'crypto';
            openAddCoin(type, coin);
            setSelectedCoin(null);
          }}
        />
      )}
    </div>
  );
}
