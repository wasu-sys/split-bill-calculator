import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectWallet } from './wallet';

afterEach(() => {
  Reflect.deleteProperty(window, 'ethereum');
  vi.restoreAllMocks();
});

describe('connectWallet', () => {
  it('throws when ethereum is missing', async () => {
    Reflect.deleteProperty(window, 'ethereum');

    await expect(connectWallet()).rejects.toThrow(/No Ethereum wallet provider/i);
  });

  it('returns the first account when a provider approves access', async () => {
    const request = vi.fn().mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']);
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      value: { request },
    });

    const wallet = await connectWallet();

    expect(request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    expect(wallet).toEqual({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      connected: true,
      providerAvailable: true,
    });
  });
});
