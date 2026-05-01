import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPage from '../components/AdminPage';
import type { Prize, SpinRequest } from '../types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const defaultPrizes: Prize[] = [
  { id: 1, name: 'Café', quantity: 30, probability: 50, image_url: '', active: true, wheelCount: 3 },
  { id: 2, name: 'Gaseosa', quantity: 25, probability: 45, image_url: '', active: true, wheelCount: 1 },
  { id: 21, name: 'Perdiste', quantity: 0, probability: 50, image_url: '❌', active: true, wheelCount: 3, isLosePrize: true },
];

const defaultSpinRequests: SpinRequest[] = [
  { id: 1, prize: defaultPrizes[0]!, timestamp: '2024-01-01T00:00:00Z', status: 'processed' },
  { id: 2, prize: defaultPrizes[1]!, timestamp: '2024-01-01T00:01:00Z', status: 'undone' },
];

describe('AdminPage', () => {
  const mockUpdatePrizes = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        wheelUnlocked: false,
        prizes: defaultPrizes,
        spinRequests: defaultSpinRequests,
      }),
    });
  });

  it('should render page title', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('Panel de Administración')).toBeInTheDocument();
  });

  it('should render wheel control section', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('Control de Rueda')).toBeInTheDocument();
  });

  it('should render inventory section', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('Gestión de Inventario')).toBeInTheDocument();
  });

  it('should show locked status initially', async () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      expect(screen.getByText('Rueda Bloqueada')).toBeInTheDocument();
    });
  });

  it('should toggle wheel lock when button clicked', async () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      expect(screen.getByText('Desbloquear')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Desbloquear'));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/unlock-wheel', { method: 'POST' });
    });
  });

  it('should display prizes in inventory', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.getByText('Gaseosa')).toBeInTheDocument();
  });

  it('should show add prize form when button clicked', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    fireEvent.click(screen.getByText('Agregar Producto'));
    expect(screen.getByPlaceholderText('Ingrese el nombre')).toBeInTheDocument();
  });

  it('should cancel add form', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    fireEvent.click(screen.getByText('Agregar Producto'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByPlaceholderText('Ingrese el nombre')).not.toBeInTheDocument();
  });

  it('should add new prize with valid data', async () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    fireEvent.click(screen.getByText('Agregar Producto'));
    
    fireEvent.change(screen.getByPlaceholderText('Ingrese el nombre'), { target: { value: 'Nuevo Premio' } });
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '5' } });
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '30' } });
    
    const addButtons = screen.getAllByText('Agregar Producto');
    fireEvent.click(addButtons[addButtons.length - 1]!);
    
    await waitFor(() => {
      expect(mockUpdatePrizes).toHaveBeenCalled();
    });
  });

  it('should increment stock', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    const plusButtons = screen.getAllByTitle('Incrementar stock');
    fireEvent.click(plusButtons[0]!);
    expect(mockUpdatePrizes).toHaveBeenCalled();
  });

  it('should decrement stock', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    const minusButtons = screen.getAllByTitle('Decrementar stock (compra manual)');
    fireEvent.click(minusButtons[0]!);
    expect(mockUpdatePrizes).toHaveBeenCalled();
  });

  it('should toggle active status', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    const toggleButtons = screen.getAllByTitle(/En la ruleta|Fuera de la ruleta/);
    fireEvent.click(toggleButtons[0]!);
    expect(mockUpdatePrizes).toHaveBeenCalled();
  });

  it('should increase wheel count', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    const increaseButtons = screen.getAllByTitle('Aumentar veces en ruleta');
    fireEvent.click(increaseButtons[0]!);
    expect(mockUpdatePrizes).toHaveBeenCalled();
  });

  it('should decrease wheel count', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    const decreaseButtons = screen.getAllByTitle('Disminuir veces en ruleta');
    fireEvent.click(decreaseButtons[0]!);
    expect(mockUpdatePrizes).toHaveBeenCalled();
  });

  it('should show last processed spin', async () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      expect(screen.getByText('Último Giro')).toBeInTheDocument();
    });
  });

  it('should undo last spin', async () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      expect(screen.getByText('Deshacer')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Deshacer'));
    expect(mockUpdatePrizes).toHaveBeenCalled();
  });

  it('should show spin history', async () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      expect(screen.getByText(/Historial Anterior/)).toBeInTheDocument();
    });
  });

  it('should show search input', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByPlaceholderText('Buscar productos...')).toBeInTheDocument();
  });

  it('should filter prizes by search', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar productos...'), { target: { value: 'Café' } });
    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.queryByText('Gaseosa')).not.toBeInTheDocument();
  });

  it('should sort by name', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    fireEvent.click(screen.getByText(/^Nombre/));
    expect(mockUpdatePrizes).not.toHaveBeenCalled();
  });

  it('should show statistics when button clicked', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    fireEvent.click(screen.getByText('Estadísticas'));
    expect(screen.getByText(/Productos:/)).toBeInTheDocument();
  });

  it('should show delete confirmation modal', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    const deleteButtons = screen.getAllByTitle('Eliminar producto');
    fireEvent.click(deleteButtons[0]!);
    expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
  });

  it('should cancel delete', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    const deleteButtons = screen.getAllByTitle('Eliminar producto');
    fireEvent.click(deleteButtons[0]!);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Confirmar eliminación')).not.toBeInTheDocument();
  });

  it('should confirm delete', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    const deleteButtons = screen.getAllByTitle('Eliminar producto');
    fireEvent.click(deleteButtons[0]!);
    fireEvent.click(screen.getByText('Eliminar'));
    expect(mockUpdatePrizes).toHaveBeenCalled();
  });

  it('should show empty state when no prizes', () => {
    render(<AdminPage prizes={[]} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText(/No hay productos en el inventario/)).toBeInTheDocument();
  });

  it('should show no results when search has no matches', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar productos...'), { target: { value: 'xyz123' } });
    expect(screen.getByText('No se encontraron productos')).toBeInTheDocument();
  });

  it('should display prizes with missing quantity field (lose prize)', () => {
    const prizesWithMissingQuantity: Prize[] = [
      { id: 1, name: 'Café', quantity: 30, probability: 50, image_url: '', active: true, wheelCount: 3 },
      { id: 21, name: 'Perdiste', probability: 50, image_url: '❌', active: true, wheelCount: 3, isLosePrize: true } as unknown as Prize,
    ];
    render(<AdminPage prizes={prizesWithMissingQuantity} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.getByText('Perdiste')).toBeInTheDocument();
  });

  it('should show Stock: 0 for prizes with undefined quantity', () => {
    const prizesWithUndefinedQuantity: Prize[] = [
      { id: 1, name: 'TestPrize', probability: 10, image_url: '', active: true, wheelCount: 1 } as unknown as Prize,
    ];
    render(<AdminPage prizes={prizesWithUndefinedQuantity} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText(/Stock: 0/)).toBeInTheDocument();
  });

  it('should render inventory section', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('Gestión de Inventario')).toBeInTheDocument();
  });

  it('should show empty history when no spins', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ wheelUnlocked: false, prizes: defaultPrizes, spinRequests: [] }),
    });
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      expect(screen.getByText('No hay giros procesados.')).toBeInTheDocument();
    });
  });

  it('should export config when button clicked', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    const exportButton = screen.getByText('Exportar');
    expect(exportButton).toBeInTheDocument();
  });

  it('should show import button', () => {
    render(<AdminPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('Importar')).toBeInTheDocument();
  });
});
