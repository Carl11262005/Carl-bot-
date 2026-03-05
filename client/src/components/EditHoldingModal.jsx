import { useState } from 'react';

/**
 * Shared edit modal for both stock and coin holdings.
 *
 * Props:
 *   holding  – the stock ({ symbol, name, shares, buyPrice }) or coin ({ id, symbol, name, amount, buyPrice })
 *   type     – 'stock' | 'coin'
 *   onSave   – called with updated fields: { shares, buyPrice } for stocks, { amount, buyPrice } for coins
 *   onClose  – close handler
 */
export default function EditHoldingModal({ holding, type, onSave, onClose }) {
  const isStock = type === 'stock';

  const [quantity, setQuantity] = useState(
    String(isStock ? holding.shares : holding.amount)
  );
  const [buyPrice, setBuyPrice] = useState(String(holding.buyPrice));

  function handleSubmit(e) {
    e.preventDefault();
    const q = parseFloat(quantity);
    const p = parseFloat(buyPrice);
    if (!q || q <= 0 || !p || p <= 0) return;
    onSave(isStock ? { shares: q, buyPrice: p } : { amount: q, buyPrice: p });
    onClose();
  }

  const canSubmit = parseFloat(quantity) > 0 && parseFloat(buyPrice) > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit {holding.symbol}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label>{isStock ? 'Number of Shares' : 'Amount / Units'}</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0"
              step="any"
              autoFocus
            />
          </div>

          <div className="modal-field">
            <label>Avg Buy Price per {isStock ? 'Share' : 'Unit'} ($)</label>
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              min="0"
              step="any"
            />
          </div>

          <button type="submit" className="modal-submit" disabled={!canSubmit}>
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
