import { useState } from 'react';
import StockCard from './StockCard.jsx';
import AddStockModal from './AddStockModal.jsx';
import ImportModal from './ImportModal.jsx';
import StockDetail from './StockDetail.jsx';
import '../styles/Portfolio.css';

export default function PortfolioView({ portfolio, addStock, removeStock }) {
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  return (
    <div className="portfolio-view">
      {portfolio.length === 0 ? (
        <div className="portfolio-empty">
          <div className="portfolio-empty-icon">📊</div>
          <h3>No stocks yet</h3>
          <p>
            Tap the + button to add a stock, or import your Robinhood portfolio.
          </p>
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
        <>
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
        </>
      )}

      <button
        className="portfolio-add-btn"
        onClick={() => setShowModal(true)}
        aria-label="Add stock"
      >
        +
      </button>

      {showModal && (
        <AddStockModal
          onAdd={addStock}
          onClose={() => setShowModal(false)}
        />
      )}

      {showImport && (
        <ImportModal
          onImport={addStock}
          onClose={() => setShowImport(false)}
        />
      )}

      {selectedStock && (
        <StockDetail
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}
