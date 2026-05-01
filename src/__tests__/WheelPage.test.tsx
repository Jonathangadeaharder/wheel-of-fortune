import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WheelPage from '../components/WheelPage';
import type { Prize } from '../types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const defaultPrizes: Prize[] = [
  { id: 1, name: 'Café', quantity: 30, probability: 50, image_url: '', active: true, wheelCount: 3 },
  { id: 2, name: 'Gaseosa', quantity: 25, probability: 45, image_url: '', active: true, wheelCount: 1 },
  { id: 21, name: 'Perdiste', quantity: 0, probability: 50, image_url: '❌', active: true, wheelCount: 3, isLosePrize: true },
];

describe('WheelPage', () => {
  const mockUpdatePrizes = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ wheelUnlocked: true, prizes: defaultPrizes, spinRequests: [] }),
    });
  });

  it('should render page title', () => {
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('¡Gira la Rueda de la Fortuna!')).toBeInTheDocument();
  });

  it('should show locked message when wheel is locked', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ wheelUnlocked: false }),
    });
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      expect(screen.getByText(/Rueda Bloqueada/)).toBeInTheDocument();
    });
  });

  it('should show empty state when no prizes available', () => {
    render(<WheelPage prizes={[]} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('No prizes available')).toBeInTheDocument();
  });

  it('should disable spin button when wheel is locked', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ wheelUnlocked: false }),
    });
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      const button = screen.getByText(/Rueda Bloqueada/);
      expect(button).toBeDisabled();
    });
  });

  it('should enable spin button when wheel is unlocked', async () => {
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      const button = screen.getByText(/¡Girar la Rueda!/);
      expect(button).not.toBeDisabled();
    });
  });

  it('should spin wheel when button clicked', async () => {
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      expect(screen.getByText(/¡Girar la Rueda!/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/¡Girar la Rueda!/));
    expect(screen.getByText('Girando...')).toBeInTheDocument();
  });

  it('should render wheel SVG', () => {
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should render pointer', () => {
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByRole('img', { name: 'Wheel pointer' })).toBeInTheDocument();
  });

  it('should show SPIN button in center', () => {
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('SPIN')).toBeInTheDocument();
  });

  it('should render prize names on wheel', () => {
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getAllByText('CAFÉ').length).toBeGreaterThan(0);
  });

  it('should include lose prize on wheel even with missing quantity', () => {
    const prizesWithMissingQuantity: Prize[] = [
      { id: 1, name: 'Café', quantity: 30, probability: 50, image_url: '', active: true, wheelCount: 1 },
      { id: 21, name: 'Perdiste', probability: 50, image_url: '❌', active: true, wheelCount: 1, isLosePrize: true } as unknown as Prize,
    ];
    render(<WheelPage prizes={prizesWithMissingQuantity} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getAllByText('CAFÉ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PERDISTE').length).toBeGreaterThan(0);
  });

  it('should not show prizes with zero quantity on wheel', () => {
    const prizesWithZero: Prize[] = [
      { id: 1, name: 'Café', quantity: 0, probability: 50, image_url: '', active: true, wheelCount: 1 },
    ];
    render(<WheelPage prizes={prizesWithZero} updatePrizes={mockUpdatePrizes} />);
    expect(screen.getByText('No prizes available')).toBeInTheDocument();
  });

  it('should not spin when already spinning', async () => {
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    await waitFor(() => {
      expect(screen.getByText(/¡Girar la Rueda!/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/¡Girar la Rueda!/));
    fireEvent.click(screen.getByText('Girando...'));
    expect(mockUpdatePrizes).not.toHaveBeenCalled();
  });

  it('should handle spin completion and show result', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    
    await waitFor(() => {
      expect(screen.getByText(/¡Girar la Rueda!/)).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText(/¡Girar la Rueda!/));
    
    await vi.advanceTimersByTimeAsync(5000);
    
    const result = screen.queryByText('¡Felicitaciones!') || screen.queryByText('¡Qué lástima!');
    expect(result).toBeTruthy();
    
    vi.useRealTimers();
  });

  it('should lock wheel after spin completes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    
    await waitFor(() => {
      expect(screen.getByText(/¡Girar la Rueda!/)).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText(/¡Girar la Rueda!/));
    
    await vi.advanceTimersByTimeAsync(5000);
    
    expect(mockFetch).toHaveBeenCalledWith('/api/lock-wheel', { method: 'POST' });
    
    vi.useRealTimers();
  });

  it('should save spin record after spin completes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<WheelPage prizes={defaultPrizes} updatePrizes={mockUpdatePrizes} />);
    
    await waitFor(() => {
      expect(screen.getByText(/¡Girar la Rueda!/)).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText(/¡Girar la Rueda!/));
    
    await vi.advanceTimersByTimeAsync(5000);
    
    expect(mockFetch).toHaveBeenCalledWith('/api/spin-requests', expect.objectContaining({
      method: 'POST',
    }));
    
    vi.useRealTimers();
  });
});
