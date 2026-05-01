import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Unlock, Lock, Minus, Eye, EyeOff, ChevronUp, ChevronDown, Plus } from 'lucide-react';

const AdminPage = ({ prizes, updatePrizes }) => {
  const [spinRequests, setSpinRequests] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrize, setEditingPrize] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    probability: 10,
    image_url: ''
  });
  const [wheelUnlocked, setWheelUnlocked] = useState(false);

  useEffect(() => {
    // Load data from server
    const loadData = async () => {
      try {
        const response = await fetch('/api/data');
        const data = await response.json();
        console.log('Admin: Loaded data from server:', data.wheelUnlocked);
        setWheelUnlocked(data.wheelUnlocked || false);
        setSpinRequests(data.spinRequests || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();

    // Poll every 2 seconds to stay in sync
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleWheelLock = async () => {
    const newState = !wheelUnlocked;
    console.log('Admin: Toggling wheel lock to:', newState);
    setWheelUnlocked(newState);

    // Save to server
    try {
      const endpoint = newState ? '/api/unlock-wheel' : '/api/lock-wheel';
      const response = await fetch(endpoint, { method: 'POST' });
      console.log('Admin: Lock toggle response:', response.status);

      // Verify the change was saved
      const verifyResponse = await fetch('/api/data');
      const verifyData = await verifyResponse.json();
      console.log('Admin: Verified state after toggle:', verifyData.wheelUnlocked);
    } catch (error) {
      console.error('Error toggling wheel lock:', error);
    }
  };

  const handleUndoLastSpin = (requestId) => {
    const request = spinRequests.find(r => r.id === requestId);
    if (!request) return;

    // Restore stock
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === request.prize.id) {
        return { ...prize, quantity: prize.quantity + 1 };
      }
      return prize;
    });

    updatePrizes(updatedPrizes);

    // Mark as undone
    const updatedRequests = spinRequests.map(r => {
      if (r.id === requestId) {
        return { ...r, status: 'undone' };
      }
      return r;
    });

    setSpinRequests(updatedRequests);
    
    // Save to server
    (async () => {
      try {
        await fetch('/api/spin-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedRequests)
        });
      } catch (error) {
        console.error('Error saving spin requests:', error);
      }
    })();
  };

  const handleAddPrize = () => {
    if (!formData.name || formData.quantity <= 0 || formData.probability <= 0) {
      return;
    }

    const newPrize = {
      id: Date.now(),
      ...formData
    };

    updatePrizes([...prizes, newPrize]);
    setFormData({ name: '', quantity: 1, probability: 10, image_url: '🎁' });
    setShowAddForm(false);
  };

  const handleEditPrize = (prize) => {
    setEditingPrize(prize);
    setFormData({
      name: prize.name,
      quantity: prize.quantity,
      probability: prize.probability,
      image_url: prize.image_url
    });
    setShowAddForm(true);
  };

  const handleUpdatePrize = () => {
    if (!formData.name || formData.quantity <= 0 || formData.probability <= 0) {
      return;
    }

    const updatedPrizes = prizes.map(prize => {
      if (prize.id === editingPrize.id) {
        return { ...prize, ...formData };
      }
      return prize;
    });

    updatePrizes(updatedPrizes);
    setEditingPrize(null);
    setFormData({ name: '', quantity: 1, probability: 10, image_url: '' });
  };

  const handleDeletePrize = (prizeId) => {
    const updatedPrizes = prizes.filter(prize => prize.id !== prizeId);
    updatePrizes(updatedPrizes);
  };

  const handleIncrementStock = (prizeId) => {
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === prizeId) {
        return { ...prize, quantity: prize.quantity + 1 };
      }
      return prize;
    });
    updatePrizes(updatedPrizes);
  };

  const handleDecrementStock = (prizeId) => {
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === prizeId && prize.quantity > 0) {
        return { ...prize, quantity: prize.quantity - 1 };
      }
      return prize;
    });
    updatePrizes(updatedPrizes);
  };

  const handleToggleActive = (prizeId) => {
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === prizeId) {
        return { ...prize, active: !prize.active };
      }
      return prize;
    });
    updatePrizes(updatedPrizes);
  };

  const handleIncreaseWheelCount = (prizeId) => {
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === prizeId) {
        return { ...prize, wheelCount: (prize.wheelCount || 1) + 1 };
      }
      return prize;
    });
    updatePrizes(updatedPrizes);
  };

  const handleDecreaseWheelCount = (prizeId) => {
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === prizeId && (prize.wheelCount || 1) > 1) {
        return { ...prize, wheelCount: (prize.wheelCount || 1) - 1 };
      }
      return prize;
    });
    updatePrizes(updatedPrizes);
  };

  const sortedPrizes = [...prizes].sort((a, b) => a.name.localeCompare(b.name));

  const processedRequests = spinRequests.filter(r => r.status === 'processed');
  const lastProcessedSpin = processedRequests.length > 0 ? processedRequests[processedRequests.length - 1] : null;
  const historyRequests = spinRequests.filter(r => r.status !== 'processed');

  return (
    <div className="page-container">
      <h1 className="page-title">Panel de Administración</h1>

      {/* Top Section: Control de Rueda + Historial de Giros */}
      <div className="admin-top-section">
        {/* Unlock Control */}
        <div className="control-section">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>Control de Rueda</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {wheelUnlocked ? (
                <Unlock size={32} style={{ color: '#10b981' }} />
              ) : (
                <Lock size={32} style={{ color: '#ef4444' }} />
              )}
              <div>
                <div style={{ fontWeight: '600', fontSize: '1rem', color: '#1f2937' }}>
                  {wheelUnlocked ? 'Rueda Desbloqueada' : 'Rueda Bloqueada'}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {wheelUnlocked ? 'Los usuarios pueden girar ahora' : 'Los usuarios no pueden girar'}
                </div>
              </div>
            </div>
            <button
              className={wheelUnlocked ? 'btn btn-danger' : 'btn btn-success'}
              onClick={toggleWheelLock}
              style={{ minWidth: '7.5rem' }}
            >
              {wheelUnlocked ? 'Bloquear' : 'Desbloquear'}
            </button>
          </div>
        </div>

        {/* Historial de Giros */}
        <div className="spin-requests-section">
          <h2 className="section-title">
            Historial de Giros
          </h2>

          <div className="spin-history-scroll">
            {lastProcessedSpin ? (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
                  Último Giro
                </h3>
                <div className="spin-request-item" style={{ background: '#d1fae5', borderColor: '#10b981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '1.125rem' }}>
                        {lastProcessedSpin.prize.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {new Date(lastProcessedSpin.timestamp).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem', fontWeight: '600' }}>
                        ✓ PROCESADO - Stock decrementado
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleUndoLastSpin(lastProcessedSpin.id)}
                    style={{ marginLeft: '0.75rem' }}
                  >
                    Deshacer
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                No hay giros procesados.
              </div>
            )}

            {historyRequests.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
                  Historial Anterior ({historyRequests.length})
                </h3>
                {historyRequests.map(request => (
                  <div
                    key={request.id}
                    className="prize-item"
                    style={{
                      background: request.status === 'undone' ? '#fee2e2' : '#f3f4f6',
                      borderColor: request.status === 'undone' ? '#ef4444' : '#d1d5db'
                    }}
                  >
                    <div className="prize-info">
                      <div className="prize-details">
                        <div className="prize-name">{request.prize.name}</div>
                        <div className="prize-quantity">
                          {new Date(request.timestamp).toLocaleString()} -
                          <span style={{
                            fontWeight: '600',
                            color: request.status === 'undone' ? '#dc2626' : '#6b7280',
                            marginLeft: '0.5rem'
                          }}>
                            {request.status === 'undone' ? 'DESHECHO' : request.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gestión de Inventario - Full Width Below */}
      <div className="admin-grid">
        <div className="inventory-section">
          <h2 className="section-title">
            Gestión de Inventario
          </h2>
          
          {showAddForm && (
            <div className="add-prize-form">
              <div className="form-group">
                <label className="form-label">Nombre del Producto</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ingrese el nombre"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cantidad</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Peso de Probabilidad</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Emoji (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="🎁"
                />
              </div>
              <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-success" onClick={editingPrize ? handleUpdatePrize : handleAddPrize}>
                  {editingPrize ? 'Actualizar' : 'Agregar'} Producto
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingPrize(null);
                    setFormData({ name: '', quantity: 1, probability: 10, image_url: '' });
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!showAddForm && !editingPrize && (
            <button
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
              style={{ marginBottom: '0.75rem' }}
            >
              Agregar Producto
            </button>
          )}

          <div className="prize-list">
            {prizes.length === 0 ? (
              <div className="empty-state">
                No hay productos en el inventario. ¡Agrega algunos para comenzar!
              </div>
            ) : (
              <>
                {sortedPrizes.map(prize => (
                  <div key={prize.id} className="prize-item">
                    <div className="prize-info">
                      <div className="prize-details">
                        <div className="prize-name">{prize.name}</div>
                        <div className="prize-quantity">
                          {prize.isLosePrize ? `Ruleta: ${prize.wheelCount || 1}x` : `Stock: ${prize.quantity} | Ruleta: ${prize.wheelCount || 1}x`}
                        </div>
                      </div>
                    </div>
                    <div className="prize-actions">
                      {/* Visibility Control */}
                      <button
                        className="icon-button"
                        onClick={() => handleToggleActive(prize.id)}
                        style={{ background: prize.active ? '#10b981' : '#ef4444', color: 'white', flexBasis: '100%' }}
                        title={prize.active ? 'En la ruleta - Click para remover' : 'Fuera de la ruleta - Click para agregar'}
                      >
                        {prize.active ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>

                      {/* Wheel Count Controls */}
                      <button
                        className="icon-button"
                        onClick={() => handleIncreaseWheelCount(prize.id)}
                        style={{ background: '#8b5cf6', color: 'white' }}
                        title="Aumentar veces en ruleta"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => handleDecreaseWheelCount(prize.id)}
                        disabled={(prize.wheelCount || 1) <= 1}
                        style={{ background: '#8b5cf6', color: 'white' }}
                        title="Disminuir veces en ruleta"
                      >
                        <ChevronDown size={18} />
                      </button>

                      {/* Stock Controls */}
                      {!prize.isLosePrize && (
                        <>
                          <button
                            className="icon-button"
                            onClick={() => handleIncrementStock(prize.id)}
                            style={{ background: '#06b6d4', color: 'white' }}
                            title="Incrementar stock"
                          >
                            <Plus size={18} />
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => handleDecrementStock(prize.id)}
                            disabled={prize.quantity === 0}
                            style={{ background: '#f59e0b', color: 'white' }}
                            title="Decrementar stock (compra manual)"
                          >
                            <Minus size={18} />
                          </button>
                        </>
                      )}

                      {/* Edit & Delete Actions */}
                      {!prize.isLosePrize && (
                        <>
                          <button
                            className="icon-button edit-button"
                            onClick={() => handleEditPrize(prize)}
                            title="Editar producto"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            className="icon-button delete-button"
                            onClick={() => handleDeletePrize(prize.id)}
                            title="Eliminar producto"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
