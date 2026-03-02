import { useState, useRef } from 'react';
import { getQuote } from '../services/stockService.js';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/"/g, ''));

  // Find column indices by common names
  const symbolIdx = headers.findIndex((h) =>
    ['symbol', 'ticker', 'instrument'].includes(h)
  );
  const nameIdx = headers.findIndex((h) =>
    ['name', 'company', 'description', 'stock'].includes(h)
  );
  const sharesIdx = headers.findIndex((h) =>
    ['shares', 'quantity', 'qty', 'amount'].includes(h)
  );
  const priceIdx = headers.findIndex((h) =>
    [
      'average cost',
      'avg cost',
      'avg_cost',
      'average cost basis',
      'buy price',
      'cost basis',
      'price',
      'purchase price',
    ].includes(h)
  );

  if (symbolIdx === -1 || sharesIdx === -1) return [];

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, '').replace(/\$/g, ''));
    const symbol = cols[symbolIdx]?.toUpperCase();
    const shares = parseFloat(cols[sharesIdx]);

    if (!symbol || isNaN(shares) || shares <= 0) continue;

    results.push({
      symbol,
      name: nameIdx !== -1 ? cols[nameIdx] : symbol,
      shares,
      buyPrice: priceIdx !== -1 ? parseFloat(cols[priceIdx]) || 0 : 0,
    });
  }

  return results;
}

function parseSimpleText(text) {
  // Supports lines like: "AAPL 10" or "AAPL, 10" or "AAPL 10 150.00"
  const lines = text.trim().split('\n');
  const results = [];

  for (const line of lines) {
    const parts = line
      .replace(/,/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length < 2) continue;

    const symbol = parts[0].toUpperCase().replace(/\$/g, '');
    const shares = parseFloat(parts[1]);

    if (!symbol || isNaN(shares) || shares <= 0) continue;
    if (!/^[A-Z]{1,5}$/.test(symbol)) continue;

    results.push({
      symbol,
      name: symbol,
      shares,
      buyPrice: parts[2] ? parseFloat(parts[2]) || 0 : 0,
    });
  }

  return results;
}

export default function ImportModal({ onImport, onClose }) {
  const [mode, setMode] = useState('file'); // 'file' or 'paste'
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const stocks = parseCSV(text);
      if (stocks.length === 0) {
        setStatus('Could not parse any stocks from this CSV. Check the format.');
      } else {
        setParsed(stocks);
        setStatus(`Found ${stocks.length} stock${stocks.length !== 1 ? 's' : ''}`);
      }
    };
    reader.readAsText(file);
  }

  function handleParse() {
    const stocks = parseSimpleText(pasteText);
    if (stocks.length === 0) {
      setStatus('Could not parse any stocks. Use format: AAPL 10');
    } else {
      setParsed(stocks);
      setStatus(`Found ${stocks.length} stock${stocks.length !== 1 ? 's' : ''}`);
    }
  }

  async function handleImport() {
    setLoading(true);
    setStatus('Importing and fetching prices...');

    let imported = 0;
    for (const stock of parsed) {
      try {
        let price = stock.buyPrice;
        let name = stock.name;

        // Fetch current price if no buy price was provided
        if (!price || price === 0 || name === stock.symbol) {
          const quote = await getQuote(stock.symbol);
          if (!price || price === 0) price = quote.price;
          if (name === stock.symbol) name = quote.name || stock.symbol;
        }

        onImport({
          symbol: stock.symbol,
          name,
          shares: stock.shares,
          buyPrice: price || 0,
        });
        imported++;
      } catch {
        // skip stocks that fail to fetch
      }
    }

    setStatus(`Imported ${imported} stock${imported !== 1 ? 's' : ''}`);
    setLoading(false);
    setTimeout(onClose, 1000);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Import Portfolio</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { id: 'file', label: 'CSV File' },
            { id: 'paste', label: 'Quick Paste' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setMode(t.id); setParsed([]); setStatus(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontWeight: 600,
                background: mode === t.id ? 'var(--accent-primary)' : 'var(--bg-input)',
                color: mode === t.id ? 'white' : 'var(--text-secondary)',
                border: mode === t.id ? 'none' : '1px solid var(--border)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === 'file' ? (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              Upload a CSV from a Robinhood portfolio exporter Chrome extension.
              The CSV should have columns for Symbol, Shares, and optionally Average Cost.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 'var(--radius-sm)',
                border: '2px dashed var(--border-strong)',
                background: 'var(--bg-input)',
                color: 'var(--text-secondary)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Choose CSV File
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
              Paste your stocks, one per line. Format: <span style={{ color: 'var(--text-accent)' }}>SYMBOL SHARES</span>
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"AAPL 10\nTSLA 5\nMSFT 20\nGOOGL 3"}
              style={{
                width: '100%',
                height: 120,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 12,
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'monospace',
                resize: 'none',
                outline: 'none',
              }}
            />
            <button
              onClick={handleParse}
              disabled={!pasteText.trim()}
              style={{
                width: '100%',
                padding: 10,
                marginTop: 8,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 500,
                border: '1px solid var(--border)',
                opacity: pasteText.trim() ? 1 : 0.4,
                cursor: pasteText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Parse Stocks
            </button>
          </div>
        )}

        {/* Status */}
        {status && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-subtle)',
            fontSize: 13,
            color: 'var(--text-accent)',
          }}>
            {status}
          </div>
        )}

        {/* Preview */}
        {parsed.length > 0 && (
          <div style={{ marginTop: 12, maxHeight: 150, overflowY: 'auto' }}>
            {parsed.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>
                  {s.symbol}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {s.shares} shares
                  {s.buyPrice > 0 ? ` @ $${s.buyPrice.toFixed(2)}` : ' (price will be fetched)'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Import button */}
        {parsed.length > 0 && (
          <button
            onClick={handleImport}
            disabled={loading}
            className="modal-submit"
            style={{ marginTop: 16 }}
          >
            {loading ? 'Importing...' : `Import ${parsed.length} Stock${parsed.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}
