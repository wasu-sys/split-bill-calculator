import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const connectWalletMock = vi.hoisted(() => vi.fn());
const createBillOnChainMock = vi.hoisted(() => vi.fn());
const addParticipantOnChainMock = vi.hoisted(() => vi.fn());
const payShareOnChainMock = vi.hoisted(() => vi.fn());
const settleBillOnChainMock = vi.hoisted(() => vi.fn());
const getBillOnChainMock = vi.hoisted(() => vi.fn());
const getParticipantOnChainMock = vi.hoisted(() => vi.fn());

vi.mock('./wallet', () => ({
  connectWallet: connectWalletMock,
}));

vi.mock('./contract', () => ({
  addParticipantOnChain: addParticipantOnChainMock,
  createBillOnChain: createBillOnChainMock,
  getBillOnChain: getBillOnChainMock,
  getParticipantOnChain: getParticipantOnChainMock,
  payShareOnChain: payShareOnChainMock,
  settleBillOnChain: settleBillOnChainMock,
}));

import HomePage from './page';

afterEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe('HomePage', () => {
  it('shows the split bill workspace and create form', () => {
    render(<HomePage />);

    expect(screen.getByText(/split bill workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect freighter/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/bill name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total amount/i)).toBeInTheDocument();
  });

  it('shows a wallet status message when the Freighter prompt is declined', async () => {
    connectWalletMock.mockRejectedValueOnce(
      new Error('Freighter wallet connection was declined or unavailable. Install Freighter and approve the connection prompt to continue.')
    );

    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: /connect freighter/i }));

    expect(await screen.findByText(/Install Freighter and approve the connection prompt/i)).toBeInTheDocument();
  });

  it('creates, funds, and settles a bill through the full flow', async () => {
    const walletAddress = 'GABCD1234EFGH5678IJKL9012MNOP3456QRST7890';
    let billState = {
      owner: walletAddress,
      total: 1000n,
      paid_total: 0n,
      participant_count: 0,
      settled: false,
    };
    let participantState = {
      share: 0n,
      paid: 0n,
    };

    connectWalletMock.mockResolvedValueOnce({
      address: walletAddress,
      connected: true,
      providerAvailable: true,
    });
    createBillOnChainMock.mockImplementation(async () => ({ hash: 'create-hash' }));
    addParticipantOnChainMock.mockImplementation(async (_owner, _billId, _participant, share) => {
      billState = { ...billState, participant_count: 1 };
      participantState = { share, paid: 0n };
      return { hash: 'add-hash' };
    });
    payShareOnChainMock.mockImplementation(async (_participant, _billId, amount) => {
      billState = { ...billState, paid_total: billState.paid_total + amount };
      participantState = { ...participantState, paid: participantState.paid + amount };
      return { hash: 'pay-hash' };
    });
    settleBillOnChainMock.mockImplementation(async () => {
      billState = { ...billState, settled: true };
      return { hash: 'settle-hash' };
    });
    getBillOnChainMock.mockImplementation(async () => billState);
    getParticipantOnChainMock.mockImplementation(async () => participantState);

    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: /connect freighter/i }));
    await user.type(screen.getByLabelText(/bill name/i), 'Dinner')
    await user.type(screen.getByLabelText(/total amount/i), '1000');
    await user.click(screen.getByRole('button', { name: /create bill/i }));

    expect(createBillOnChainMock).toHaveBeenCalledTimes(1);
    expect(createBillOnChainMock.mock.calls[0][0]).toBe(walletAddress);
    expect(typeof createBillOnChainMock.mock.calls[0][1]).toBe('bigint');
    expect(createBillOnChainMock.mock.calls[0][2]).toBe(1000n);
    expect(await screen.findByText(/Transaction hash: create-hash/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/stellar wallet address/i), walletAddress);
    await user.click(screen.getByRole('button', { name: /add participant/i }));

    expect(addParticipantOnChainMock).toHaveBeenCalledTimes(1);
    expect(addParticipantOnChainMock.mock.calls[0][0]).toBe(walletAddress);
    expect(addParticipantOnChainMock.mock.calls[0][2]).toBe(walletAddress);
    expect(addParticipantOnChainMock.mock.calls[0][3]).toBe(1000n);
    expect(await screen.findByText(/Transaction hash: add-hash/i)).toBeInTheDocument();

    expect(await screen.findByText(/Your wallet is on this bill/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /pay my share/i }));

    expect(payShareOnChainMock).toHaveBeenCalledTimes(1);
    expect(payShareOnChainMock.mock.calls[0][0]).toBe(walletAddress);
    expect(payShareOnChainMock.mock.calls[0][2]).toBe(1000n);
    expect(await screen.findByText(/Transaction hash: pay-hash/i)).toBeInTheDocument();

    const settleButton = await screen.findByRole('button', { name: /settle bill/i });
    await user.click(settleButton);

    expect(settleBillOnChainMock).toHaveBeenCalledTimes(1);
    expect(settleBillOnChainMock.mock.calls[0][0]).toBe(walletAddress);
    expect(await screen.findByText(/Transaction hash: settle-hash/i)).toBeInTheDocument();

    const historyPanel = screen.getByTestId('transaction-history-panel');
    expect(within(historyPanel).getByText(/Create Bill/i)).toBeInTheDocument();
    expect(within(historyPanel).getByText(/Add Participant/i)).toBeInTheDocument();
    expect(within(historyPanel).getByText(/Pay Share/i)).toBeInTheDocument();
    expect(within(historyPanel).getByText(/Settle Bill/i)).toBeInTheDocument();
    expect(within(historyPanel).getByText(/create-hash/i)).toBeInTheDocument();
    expect(within(historyPanel).getByText(/add-hash/i)).toBeInTheDocument();
    expect(within(historyPanel).getByText(/pay-hash/i)).toBeInTheDocument();
    expect(within(historyPanel).getByText(/settle-hash/i)).toBeInTheDocument();
  });
});
