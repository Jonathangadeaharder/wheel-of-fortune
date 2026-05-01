import React, { useEffect, useState } from 'react';

const GrantSpinPage = () => {
  const [credits, setCredits] = useState(0);
  const [amount, setAmount] = useState(1);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem('spinCredits') || '0', 10);
    setCredits(Number.isNaN(saved) ? 0 : saved);
  }, []);

  const persist = (val) => {
    setCredits(val);
    localStorage.setItem('spinCredits', String(val));
  };

  const grant = (n) => {
    const toAdd = Math.max(0, Math.floor(n || 0));
    if (toAdd <= 0) return;
    persist(credits + toAdd);
  };

  const consume = (n) => {
    const toRemove = Math.max(0, Math.floor(n || 0));
    if (toRemove <= 0) return;
    persist(Math.max(0, credits - toRemove));
  };

  const reset = () => persist(0);

  return (
    <div className="page-container">
      <h1 className="page-title">Grant Spin</h1>

      <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ color: '#6b7280', fontWeight: 600, marginBottom: 8 }}>Available Credits</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#111827' }}>{credits}</div>
        </div>

        <div className="form-group">
          <label className="form-label">Amount</label>
          <input
            type="number"
            className="form-input"
            value={amount}
            min={1}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value || '1', 10)))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          <button className="btn btn-success" onClick={() => grant(amount)}>Grant +{amount}</button>
          <button className="btn btn-danger" onClick={() => consume(amount)}>Remove -{amount}</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {[1, 2, 5, 10].map(v => (
            <button key={v} className="btn btn-secondary" onClick={() => grant(v)}>+{v}</button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => persist(credits)} disabled>Saved</button>
          <button className="btn btn-danger" onClick={reset}>Reset</button>
        </div>

        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 16 }}>
          Players can use credits on the Spin Wheel page. Each spin consumes 1 credit and then awaits admin approval.
        </p>
      </div>
    </div>
  );
};

export default GrantSpinPage;
