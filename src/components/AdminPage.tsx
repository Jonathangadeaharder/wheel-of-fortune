import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Unlock, Lock, Minus, Eye, EyeOff, ChevronUp, ChevronDown, Plus, Search, Download, Upload, RotateCcw, BarChart3 } from 'lucide-react';
import type { Prize, SpinRequest } from '../types';

interface AdminPageProps {
  prizes: Prize[];
  updatePrizes: (prizes: Prize[]) => Promise<void>;
}

const AdminPage = ({ prizes, updatePrizes }: AdminPageProps) => {
  const [spinRequests, setSpinRequests] = useState<SpinRequest[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    probability: 10,
    image_url: ''
  });
  const [wheelUnlocked, setWheelUnlocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'probability'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/data');
        const data = await response.json();
        setWheelUnlocked(data.wheelUnlocked || false);
        setSpinRequests(data.spinRequests || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();

    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleWheelLock = async () => {
    const newState = !wheelUnlocked;
    setWheelUnlocked(newState);

    try {
      const endpoint = newState ? '/api/unlock-wheel' : '/api/lock-wheel';
      await fetch(endpoint, { method: 'POST' });
      showToast(newState ? 'Rueda desbloqueada' : 'Rueda bloqueada');
    } catch (error) {
      console.error('Error toggling wheel lock:', error);
      showToast('Error al cambiar estado', 'error');
    }
  };

  const handleUndoLastSpin = (requestId: number) => {
    const request = spinRequests.find(r => r.id === requestId);
    if (!request) return;

    const updatedPrizes = prizes.map(prize => {
      if (prize.id === request.prize.id) {
        return { ...prize, quantity: (prize.quantity ?? 0) + 1 };
      }
      return prize;
    });

    updatePrizes(updatedPrizes);

    const updatedRequests = spinRequests.map(r => {
      if (r.id === requestId) {
        return { ...r, status: 'undone' as const };
      }
      return r;
    });

    setSpinRequests(updatedRequests);
    showToast('Giro deshecho, stock restaurado');
    
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

    const newPrize: Prize = {
      id: Date.now(),
      ...formData,
      quantity: formData.quantity,
      probability: formData.probability,
      active: true,
      wheelCount: 1
    };

    updatePrizes([...prizes, newPrize]);
    setFormData({ name: '', quantity: 1, probability: 10, image_url: '🎁' });
    setShowAddForm(false);
    showToast('Producto agregado');
  };

  const handleEditPrize = (prize: Prize) => {
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
      if (editingPrize && prize.id === editingPrize.id) {
        return { ...prize, ...formData };
      }
      return prize;
    });

    updatePrizes(updatedPrizes);
    setEditingPrize(null);
    setFormData({ name: '', quantity: 1, probability: 10, image_url: '' });
    showToast('Producto actualizado');
  };

  const handleDeletePrize = (prizeId: number) => {
    const updatedPrizes = prizes.filter(prize => prize.id !== prizeId);
    updatePrizes(updatedPrizes);
    setShowDeleteConfirm(null);
    showToast('Producto eliminado');
  };

  const handleIncrementStock = (prizeId: number) => {
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === prizeId) {
        return { ...prize, quantity: prize.quantity + 1 };
      }
      return prize;
    });
    updatePrizes(updatedPrizes);
  };

  const handleDecrementStock = (prizeId: number) => {
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === prizeId && (prize.quantity ?? 0) > 0) {
        return { ...prize, quantity: (prize.quantity ?? 0) - 1 };
      }
      return prize;
    });
    updatePrizes(updatedPrizes);
  };

  const handleToggleActive = (prizeId: number) => {
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === prizeId) {
        return { ...prize, active: !prize.active };
      }
      return prize;
    });
    updatePrizes(updatedPrizes);
  };

  const handleIncreaseWheelCount = (prizeId: number) => {
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === prizeId) {
        return { ...prize, wheelCount: (prize.wheelCount || 1) + 1 };
      }
      return prize;
    });
    updatePrizes(updatedPrizes);
  };

  const handleDecreaseWheelCount = (prizeId: number) => {
    const updatedPrizes = prizes.map(prize => {
      if (prize.id === prizeId && (prize.wheelCount || 1) > 1) {
        return { ...prize, wheelCount: (prize.wheelCount || 1) - 1 };
      }
      return prize;
    });
    updatePrizes(updatedPrizes);
  };

  const handleExportConfig = () => {
    const dataStr = JSON.stringify(prizes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ruleta-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Configuración exportada');
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as Prize[];
        if (Array.isArray(imported) && imported.length > 0) {
          updatePrizes(imported);
          showToast(`${imported.length} productos importados`);
        } else {
          showToast('Archivo inválido', 'error');
        }
      } catch {
        showToast('Error al leer archivo', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetStock = () => {
    updatePrizes([...prizes]);
    setShowResetConfirm(false);
    showToast('Stock no modificado (funcionalidad pendiente)');
  };

  const handleSort = (column: 'name' | 'quantity' | 'probability') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  const filteredPrizes = prizes
    .filter(prize => prize.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'probability':
          comparison = a.probability - b.probability;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

  const processedRequests = spinRequests.filter(r => r.status === 'processed');
  const lastProcessedSpin = processedRequests.length > 0 ? processedRequests[processedRequests.length - 1] : null;
  const historyRequests = spinRequests.filter(r => r.status !== 'processed');

  const stats = {
    totalPrizes: prizes.length,
    activePrizes: prizes.filter(p => p.active).length,
    totalStock: prizes.reduce((sum, p) => sum + (p.isLosePrize ? 0 : (p.quantity ?? 0)), 0),
    totalSpins: spinRequests.filter(r => r.status === 'processed').length,
    undoneSpins: spinRequests.filter(r => r.status === 'undone').length,
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Panel de Administración</h1>

      {toast && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          color: 'white',
          fontWeight: 600,
          zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.message}
        </div>
      )}

      <div className="admin-top-section">
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
                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1f2937' }}>
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

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setShowStats(!showStats)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={16} /> Estadísticas
            </button>
            <button className="btn btn-secondary" onClick={handleExportConfig} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={16} /> Exportar
            </button>
            <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <Upload size={16} /> Importar
              <input type="file" accept=".json" onChange={handleImportConfig} style={{ display: 'none' }} />
            </label>
          </div>

          {showStats && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><strong>Productos:</strong> {stats.totalPrizes}</div>
                <div><strong>Activos:</strong> {stats.activePrizes}</div>
                <div><strong>Stock total:</strong> {stats.totalStock}</div>
                <div><strong>Giros:</strong> {stats.totalSpins}</div>
                <div><strong>Deshacer:</strong> {stats.undoneSpins}</div>
              </div>
            </div>
          )}
        </div>

        <div className="spin-requests-section">
          <h2 className="section-title">Historial de Giros</h2>

          <div className="spin-history-scroll">
            {lastProcessedSpin ? (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
                  Último Giro
                </h3>
                <div className="spin-request-item" style={{ background: '#d1fae5', borderColor: '#10b981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '1.125rem' }}>
                        {lastProcessedSpin.prize.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {new Date(lastProcessedSpin.timestamp).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem', fontWeight: 600 }}>
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
              <div className="empty-state">No hay giros procesados.</div>
            )}

            {historyRequests.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
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
                            fontWeight: 600,
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

      <div className="admin-grid">
        <div className="inventory-section">
          <h2 className="section-title">Gestión de Inventario</h2>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <button className="btn btn-secondary" onClick={() => setShowResetConfirm(true)} title="Resetear stock">
              <RotateCcw size={16} />
            </button>
          </div>

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

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              onClick={() => handleSort('name')}
              style={{ background: sortBy === 'name' ? '#3b82f6' : '#e5e7eb', color: sortBy === 'name' ? 'white' : '#374151', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Nombre {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('quantity')}
              style={{ background: sortBy === 'quantity' ? '#3b82f6' : '#e5e7eb', color: sortBy === 'quantity' ? 'white' : '#374151', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Stock {sortBy === 'quantity' && (sortAsc ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('probability')}
              style={{ background: sortBy === 'probability' ? '#3b82f6' : '#e5e7eb', color: sortBy === 'probability' ? 'white' : '#374151', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Probabilidad {sortBy === 'probability' && (sortAsc ? '↑' : '↓')}
            </button>
          </div>

          <div className="prize-list">
            {filteredPrizes.length === 0 ? (
              <div className="empty-state">
                {searchQuery ? 'No se encontraron productos' : 'No hay productos en el inventario. ¡Agrega algunos para comenzar!'}
              </div>
            ) : (
              <>
                {filteredPrizes.map(prize => (
                  <div key={prize.id} className="prize-item">
                    <div className="prize-info">
                      <div className="prize-details">
                        <div className="prize-name">{prize.name}</div>
                        <div className="prize-quantity">
                          {prize.isLosePrize ? `Ruleta: ${prize.wheelCount || 1}x` : `Stock: ${prize.quantity ?? 0} | Ruleta: ${prize.wheelCount || 1}x`}
                        </div>
                      </div>
                    </div>
                    <div className="prize-actions">
                      <button
                        className="icon-button"
                        onClick={() => handleToggleActive(prize.id)}
                        style={{ background: prize.active ? '#10b981' : '#ef4444', color: 'white', flexBasis: '100%' }}
                        title={prize.active ? 'En la ruleta - Click para remover' : 'Fuera de la ruleta - Click para agregar'}
                      >
                        {prize.active ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>

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
                            onClick={() => setShowDeleteConfirm(prize.id)}
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

      {showDeleteConfirm && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Confirmar eliminación</h3>
            <p style={{ marginBottom: '1.5rem' }}>¿Estás seguro de que querés eliminar este producto?</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDeletePrize(showDeleteConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Resetear stock</h3>
            <p style={{ marginBottom: '1.5rem' }}>¿Estás seguro? Esto restaurará el stock a los valores por defecto.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowResetConfirm(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleResetStock}>Resetear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
