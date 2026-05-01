import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trophy } from 'lucide-react';

const WheelPage = ({ prizes, updatePrizes }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const checkUnlock = async () => {
      try {
        const response = await fetch('/api/data');
        const data = await response.json();
        console.log('Wheel unlock status from server:', data.wheelUnlocked);
        setIsUnlocked(data.wheelUnlocked || false);
      } catch (error) {
        console.error('Error checking unlock status:', error);
      }
    };

    checkUnlock();
    // Check every second for unlock status changes from server
    const interval = setInterval(checkUnlock, 1000);
    return () => clearInterval(interval);
  }, []);
  const wheelRef = useRef(null);

  // Expand prizes based on wheelCount to create multiple segments
  // NO shuffle - keep visual and internal arrays in sync
  const availablePrizes = prizes
    .filter(prize => (prize.isLosePrize || prize.quantity > 0) && prize.active !== false)
    .flatMap(prize => Array(prize.wheelCount || 1).fill(prize));

  const spinWheel = async () => {
    console.log('Spin button clicked. isSpinning:', isSpinning, 'availablePrizes:', availablePrizes.length, 'isUnlocked:', isUnlocked);
    if (isSpinning || availablePrizes.length === 0 || !isUnlocked) return;

    setIsSpinning(true);
    setIsLoading(true);
    setShowResult(false);
    setSelectedPrize(null);

    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 100));

    const spins = Math.floor(Math.random() * 5) + 5;
    const segmentAngle = 360 / availablePrizes.length;
    let randomIndex = 0;
    {
      const weights = availablePrizes.map(p => Math.max(1, p.probability || 1));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (let i = 0; i < weights.length; i++) {
        if (r < weights[i]) { randomIndex = i; break; }
        r -= weights[i];
      }
    }
    const selectedCenter = randomIndex * segmentAngle + segmentAngle / 2;
    const pointerAngle = 270;
    const delta = (pointerAngle - selectedCenter + 360) % 360;
    const finalRotation = rotation + (360 * spins) + delta;

    setRotation(finalRotation);

    setTimeout(async () => {
      const wonPrize = availablePrizes[randomIndex];

      // Immediately decrement stock (but not for lose prize)
      const updatedPrizes = prizes.map(prize => {
        if (prize.id === wonPrize.id && !prize.isLosePrize) {
          return { ...prize, quantity: Math.max(0, prize.quantity - 1) };
        }
        return prize;
      });
      updatePrizes(updatedPrizes);

      setSelectedPrize(wonPrize);
      setShowResult(true);
      setIsSpinning(false);
      setIsLoading(false);

      // Auto-lock after spin on server
      try {
        await fetch('/api/lock-wheel', { method: 'POST' });
        setIsUnlocked(false);
      } catch (error) {
        console.error('Error locking wheel:', error);
      }

      // Save as processed spin (not pending)
      const spinRecord = {
        id: Date.now(),
        prize: wonPrize,
        timestamp: new Date().toISOString(),
        status: 'processed'
      };

      // Fetch existing requests from server and save updated list
      (async () => {
        try {
          const response = await fetch('/api/data');
          const data = await response.json();
          const existingRequests = data.spinRequests || [];
          existingRequests.push(spinRecord);
          
          await fetch('/api/spin-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(existingRequests)
          });
        } catch (error) {
          console.error('Error saving spin request:', error);
        }
      })()
    }, 4000);
  };

  const getSegmentColor = (index) => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#facc15'
    ];
    return colors[index % colors.length];
  };

  const renderWheel = () => {
    if (availablePrizes.length === 0) {
      return (
        <div className="wheel wheel-empty">
          <div className="wheel-empty-state">
            <div className="empty-icon">🎯</div>
            <div className="empty-text">No prizes available</div>
            <div className="empty-subtext">Add prizes in admin panel</div>
          </div>
        </div>
      );
    }

    const segmentAngle = 360 / availablePrizes.length;
    const radius = 350;
    const centerX = radius;
    const centerY = radius;

    const createPath = (index) => {
      const startAngle = (index * segmentAngle * Math.PI) / 180;
      const endAngle = ((index + 1) * segmentAngle * Math.PI) / 180;
      
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      
      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
    };

    const getTextPosition = (index) => {
      // Calculate the middle angle of this segment
      const segmentMiddleAngle = index * segmentAngle + segmentAngle / 2;
      const angleInRadians = (segmentMiddleAngle * Math.PI) / 180;

      // Position text at 70% of radius from center
      const textRadius = radius * 0.70;
      const x = centerX + textRadius * Math.cos(angleInRadians);
      const y = centerY + textRadius * Math.sin(angleInRadians);

      // Text rotation: align radially (vertical within slice, pointing outward from center)
      let rotation = segmentMiddleAngle;

      // Flip text if it would be upside down (between 90 and 270 degrees)
      if (rotation > 90 && rotation < 270) {
        rotation += 180;
      }

      return { x, y, rotation };
    };

    return (
      <div
        className="wheel"
        style={{ transform: `rotate(${rotation}deg)` }}
        ref={wheelRef}
      >
        <svg width="100%" height="100%" viewBox="0 0 700 700" style={{ display: 'block' }}>
          {availablePrizes.map((prize, index) => (
            <g key={prize.id}>
              <path
                d={createPath(index)}
                fill={getSegmentColor(index)}
                stroke="white"
                strokeWidth="2"
              />
              {/* Background for better text visibility */}
              <path
                d={createPath(index)}
                fill="rgba(0,0,0,0.15)"
                stroke="none"
              />
              <text
                x={getTextPosition(index).x}
                y={getTextPosition(index).y}
                fill="white"
                fontSize="16"
                fontWeight="800"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${getTextPosition(index).rotation} ${getTextPosition(index).x} ${getTextPosition(index).y})`}
                style={{
                  textShadow: '1px 1px 3px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.8), 1px -1px 3px rgba(0,0,0,0.8), -1px 1px 3px rgba(0,0,0,0.8)',
                  pointerEvents: 'none',
                  paintOrder: 'stroke fill',
                  stroke: 'rgba(0,0,0,0.8)',
                  strokeWidth: '3px',
                  strokeLinejoin: 'round',
                  letterSpacing: '0.3px'
                }}
              >
                {prize.name.toUpperCase()}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="page-container">
      <h1 className="page-title">¡Gira la Rueda de la Fortuna!</h1>
      
      <div className="wheel-container">
        <div className="wheel-wrapper">
          <div className="wheel-pointer" role="img" aria-label="Wheel pointer"></div>
          {renderWheel()}
          <button 
            className="wheel-center" 
            onClick={spinWheel}
            disabled={isSpinning || availablePrizes.length === 0 || !isUnlocked}
            aria-label="Spin the wheel"
          >
            SPIN
          </button>
        </div>
      </div>

      <button
        className="spin-button"
        onClick={spinWheel}
        disabled={isSpinning || availablePrizes.length === 0 || !isUnlocked}
        aria-label={isSpinning ? 'Girando la rueda' : 'Girar la rueda'}
      >
        {isSpinning && <div className="loading-spinner" aria-hidden="true"></div>}
        {isSpinning ? 'Girando...' : !isUnlocked ? '🔒 Rueda Bloqueada' : '¡Girar la Rueda!'}
      </button>

      {/* Debug info */}
      {!isUnlocked && (
        <div style={{ textAlign: 'center', color: 'white', marginTop: '1rem', fontSize: '0.875rem' }}>
          La rueda está bloqueada. Espera a que el administrador la desbloquee.
        </div>
      )}

      {showResult && selectedPrize && (
        <div className="modal">
          <div className="modal-content">
            <div style={{ textAlign: 'center' }}>
              {selectedPrize.isLosePrize ? (
                <>
                  <div style={{ fontSize: '64px', margin: '0 auto 16px' }}>😔</div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
                    ¡Qué lástima!
                  </h2>
                  <p style={{ fontSize: '32px', fontWeight: '800', color: '#374151', marginBottom: '24px' }}>
                    {selectedPrize.name}
                  </p>
                  <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
                    No te desanimes, ¡la próxima será!
                  </p>
                </>
              ) : (
                <>
                  <Trophy style={{ width: '64px', height: '64px', color: '#f59e0b', margin: '0 auto 16px' }} />
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
                    ¡Felicitaciones!
                  </h2>
                  <p style={{ fontSize: '32px', fontWeight: '800', color: '#374151', marginBottom: '24px' }}>
                    {selectedPrize.name}
                  </p>
                </>
              )}
              <button 
                className="btn btn-primary"
                onClick={() => setShowResult(false)}
              >
                {selectedPrize.isLosePrize ? 'Entendido' : '¡Genial!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WheelPage;
