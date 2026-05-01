import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        prizes: [
          { id: 1, name: 'Test Prize', quantity: 10, probability: 50, image_url: '', active: true, wheelCount: 1 }
        ],
        wheelUnlocked: false,
        spinRequests: []
      }),
    });
  });

  it('should render navigation with title', () => {
    render(<App />);
    expect(screen.getByText('Rueda de la Fortuna')).toBeInTheDocument();
  });

  it('should render WheelPage on root route', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Gira la Rueda/)).toBeInTheDocument();
    });
  });

  it('should fetch data on mount', async () => {
    render(<App />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/data');
    });
  });

  it('should use default prizes when server has none', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ prizes: [], wheelUnlocked: false, spinRequests: [] }),
    });
    render(<App />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Rueda de la Fortuna')).toBeInTheDocument();
    });
  });

  it('should post default prizes to server when none exist', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ prizes: [], wheelUnlocked: false, spinRequests: [] }),
    });
    render(<App />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/prizes', expect.objectContaining({
        method: 'POST',
      }));
    });
  });
});
