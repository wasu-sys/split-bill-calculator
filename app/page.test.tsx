import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

const connectWalletMock = vi.hoisted(() => vi.fn());
const createBillOnChainMock = vi.hoisted(() => vi.fn());

vi.mock('./wallet', () => ({
  connectWallet: connectWalletMock,
}));

vi.mock('./contract', () => ({
  createBillOnChain: createBillOnChainMock,
}));

import HomePage from './page';

describe('HomePage', () => {
  it('shows the hero content and architecture summary', () => {
    render(<HomePage />);

    expect(screen.getByText(/production-ready web3 starter/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile responsive ui/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view architecture/i })).toHaveAttribute('href', '#architecture');
  });

  it('shows a wallet status message when the demo flow starts without a provider', async () => {
    connectWalletMock.mockRejectedValueOnce(
      new Error('Freighter wallet connection was declined or unavailable. Install Freighter and approve the connection prompt to continue.')
    );
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: /connect freighter/i }));

    expect(await screen.findByText(/Install Freighter and approve the connection prompt/i)).toBeInTheDocument();
  });

  it('submits a split bill after a wallet is connected', async () => {
    connectWalletMock.mockResolvedValueOnce({ address: 'GABCD1234EFGH5678IJKL9012MNOP3456QRST7890', connected: true, providerAvailable: true });
    createBillOnChainMock.mockResolvedValueOnce({ hash: 'abc123' });
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: /connect freighter/i }));
    await user.click(await screen.findByRole('button', { name: /create test bill/i }));

    expect(createBillOnChainMock).toHaveBeenCalledWith('GABCD1234EFGH5678IJKL9012MNOP3456QRST7890', expect.any(BigInt), 1000n);
    expect(await screen.findByText(/Transaction: abc123/i)).toBeInTheDocument();
  });
});
