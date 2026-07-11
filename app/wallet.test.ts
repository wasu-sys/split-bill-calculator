import { afterEach, describe, expect, it, vi } from 'vitest';

const freighter = vi.hoisted(() => ({
  getNetworkDetails: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
}));

vi.mock('@stellar/freighter-api', () => freighter);

import { connectWallet } from './wallet';

afterEach(() => {
  vi.clearAllMocks();
});

describe('connectWallet', () => {
  it('calls isConnected before requestAccess and returns the Freighter address', async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: false });
    freighter.requestAccess.mockResolvedValue({ address: 'GABCD1234EFGH5678IJKL9012MNOP3456QRST7890' });
    freighter.getNetworkDetails.mockResolvedValue({
      network: 'Test SDF Network ; September 2015',
      networkPassphrase: 'Test SDF Network ; September 2015',
    });

    const wallet = await connectWallet();

    expect(freighter.isConnected).toHaveBeenCalledTimes(1);
    expect(freighter.requestAccess).toHaveBeenCalledTimes(1);
    expect(freighter.getNetworkDetails).toHaveBeenCalledTimes(1);
    expect(freighter.isConnected.mock.invocationCallOrder[0]).toBeLessThan(freighter.requestAccess.mock.invocationCallOrder[0]);
    expect(wallet).toEqual({
      address: 'GABCD1234EFGH5678IJKL9012MNOP3456QRST7890',
      connected: true,
      providerAvailable: true,
    });
  });

  it('accepts a TESTNET network name from Freighter', async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.requestAccess.mockResolvedValue({ address: 'GABCD1234EFGH5678IJKL9012MNOP3456QRST7890' });
    freighter.getNetworkDetails.mockResolvedValue({
      network: 'TESTNET',
      networkPassphrase: 'Test SDF Network ; September 2015',
    });

    const wallet = await connectWallet();

    expect(wallet.connected).toBe(true);
    expect(wallet.address).toBe('GABCD1234EFGH5678IJKL9012MNOP3456QRST7890');
  });

  it('throws a Freighter install message when access is declined', async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: false });
    freighter.requestAccess.mockResolvedValue({ address: '', error: { message: 'declined' } });

    await expect(connectWallet()).rejects.toThrow(/Install Freighter/i);
    expect(freighter.getNetworkDetails).not.toHaveBeenCalled();
  });
});
