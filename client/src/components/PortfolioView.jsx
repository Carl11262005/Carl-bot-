import { useState } from 'react';
import StockCard from './StockCard.jsx';
import StockTicker from './StockTicker.jsx';
import { CryptoSection, MemeSection, MoonshotSection } from './CryptoSection.jsx';
import { CryptoHoldingsSection, MemeHoldingsSection } from './CryptoHoldings.jsx';
import AddStockModal from './AddStockModal.jsx';
import AddCoinModal from './AddCoinModal.jsx';
import ImportModal from './ImportModal.jsx';
import StockDetail from './StockDetail.jsx';
import CryptoDetail from './CryptoDetail.jsx';
import '../styles/Portfolio.css';

export default function PortfolioView({
  portfolio, addStock, removeStock,
  cryptoHoldings, memeHoldings, addHolding, removeHolding,
}) {
  const [showModal, setShowModal]   = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [addMenu, setAddMenu]       = useState(false);
  const [addCoinCfg, setAddCoinCfg] = useState(null); // { type, coin? }

  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedCoin,  setSelectedCoin]  = useState(null);

  function openAddCoin(type, coin = null) {
    setAddMenu(false);
    setAddCoinCfg({ type, coin });
  }

  return (
    <div className="portfolio-view">
      {/* Scrolling market ticker at the very top */}
      <StockTicker portfolio={portfolio} />

      {/* All scrollable content below the ticker */}
      <div className="portfolio-scroll">

        {/* ── Crypto Holdings ───────────────────────── */}
        <CryptoHoldingsSection
          holdings={cryptoHoldings}
          onTap={setSelectedCoin}
          onRemove={removeHolding}
          onAddNew={() => openAddCoin('crypto')}
        />

        {/* ── Meme Coin Holdings ────────────────────── */}
        <MemeHoldingsSection
          holdings={memeHoldings}
          onTap={setSelectedCoin}
          onRemove={removeHolding}
          onAddNew={() => openAddCoin('meme')}
        />

        {/* ── Your Stock Holdings ───────────────────── */}
        {portfolio.length === 0 ? (
          <div className="portfolio-empty">
            <div className="portfolio-empty-icon">📊</div>
            <h3>No stocks yet</h3>
            <p>Tap the + button to add a stock, or import your Robinhood portfolio.</p>
            <button
              onClick={() => setShowImport(true)}
              style={{
                marginTop: 16,
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-accent)',
                fontSize: 14,
                fontWeight: 600,
                border: '1px solid var(--border-accent)',
              }}
            >
              Import Portfolio
            </button>
          </div>
        ) : (
          <div className="portfolio-holdings">
            <div className="portfolio-summary">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="portfolio-summary-label">Your Holdings</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {portfolio.length} stock{portfolio.length !== 1 ? 's' : ''} tracked
                  </div>
                </div>
                <button
                  onClick={() => setShowImport(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-accent)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                  }}
                >
                  Import
                </button>
              </div>
            </div>
            <div className="portfolio-list">
              {portfolio.map((stock) => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  onRemove={removeStock}
                  onTap={() => setSelectedStock(stock)}
                />
              ))}
            </div>
          </div>
        )}

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

      {showModal  && <AddStockModal onAdd={addStock} onClose={() => setShowModal(false)} />}
      {showImport && <ImportModal onImport={addStock} onClose={() => setShowImport(false)} />}

      {addCoinCfg && (
        <AddCoinModal
          initialCoin={addCoinCfg.coin || null}
          initialType={addCoinCfg.type}
          onAdd={addHolding}
          onClose={() => setAddCoinCfg(null)}
        />
      )}

      {selectedStock && <StockDetail stock={selectedStock} onClose={() => setSelectedStock(null)} />}

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
