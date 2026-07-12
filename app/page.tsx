"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  addParticipantOnChain,
  createBillOnChain,
  getBillOnChain,
  getParticipantOnChain,
  payShareOnChain,
  settleBillOnChain,
} from './contract';
import { connectWallet } from './wallet';

type ParticipantSnapshot = {
  address: string;
  share: string;
  paid: string;
};

type TransactionHistoryEntry = {
  action: 'Create Bill' | 'Add Participant' | 'Pay Share' | 'Settle Bill';
  hash: string;
  createdAt: number;
};

type BillSnapshot = {
  billId: string;
  name: string;
  total: string;
  owner: string;
  settled: boolean;
  paidTotal: string;
  participantCount: number;
  createTxHash: string;
  lastTxHash: string;
  createdAt: number;
  participants: ParticipantSnapshot[];
  history: TransactionHistoryEntry[];
};

const SESSION_KEY = 'split-bill-session-bills';

const stats = [
  { label: 'Session bills', value: 'Local + live' },
  { label: 'Wallet flow', value: 'Freighter' },
  { label: 'Contract state', value: 'Soroban read/write' },
];

function billStorageLabel(bill: BillSnapshot) {
  return bill.name.trim() || `Bill ${bill.billId}`;
}

function toBigInt(value: string) {
  if (!value.trim()) {
    return 0n;
  }

  return BigInt(value);
}

function formatAmount(value: bigint) {
  return new Intl.NumberFormat('en-US').format(Number(value));
}

function formatHash(hash: string) {
  return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : hash;
}

function statusPillClass(isActive: boolean, isSettled: boolean) {
  if (isSettled) {
    return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';
  }

  if (isActive) {
    return 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30';
  }

  return 'bg-slate-800 text-slate-300 border-slate-700';
}

function participantStatus(participant: ParticipantSnapshot) {
  const share = toBigInt(participant.share);
  const paid = toBigInt(participant.paid);

  if (paid >= share && share > 0n) {
    return 'Paid';
  }

  if (paid > 0n) {
    return 'Partial';
  }

  return 'Unpaid';
}

export default function HomePage() {
  const [status, setStatus] = useState('Connect Freighter to start creating split bills.');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [providerAvailable, setProviderAvailable] = useState(false);
  const [bills, setBills] = useState<BillSnapshot[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [billName, setBillName] = useState('');
  const [billTotal, setBillTotal] = useState('');
  const [participantAddress, setParticipantAddress] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedBills = window.sessionStorage.getItem(SESSION_KEY);
      if (savedBills) {
        const parsedBills = JSON.parse(savedBills) as BillSnapshot[];
        setBills(parsedBills);
        setSelectedBillId(parsedBills[0]?.billId ?? null);
      }
    } catch (error) {
      console.error('Failed to restore saved bills:', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(bills));
  }, [bills, hydrated]);

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.billId === selectedBillId) ?? null,
    [bills, selectedBillId]
  );

  const selectedBillIdValue = selectedBill ? BigInt(selectedBill.billId) : null;
  const selectedBillTotal = selectedBill ? toBigInt(selectedBill.total) : 0n;
  const selectedBillPaid = selectedBill ? toBigInt(selectedBill.paidTotal) : 0n;
  const participantCount = selectedBill ? selectedBill.participantCount : 0;
  const currentShare = participantCount > 0 ? selectedBillTotal / BigInt(participantCount) : 0n;
  const selectedBillParticipants = selectedBill?.participants ?? [];
  const selectedBillHistory = selectedBill?.history ?? [];
  const connectedIsOwner = Boolean(selectedBill && walletAddress && selectedBill.owner === walletAddress);
  const connectedParticipant = Boolean(selectedBill && walletAddress && selectedBillParticipants.some((participant) => participant.address === walletAddress));
  const connectedParticipantRecord = selectedBillParticipants.find((participant) => participant.address === walletAddress) ?? null;
  const canSettle =
    Boolean(selectedBill) &&
    selectedBill !== null &&
    !selectedBill.settled &&
    selectedBillParticipants.length > 0 &&
    selectedBillParticipants.every((participant) => toBigInt(participant.paid) >= toBigInt(participant.share)) &&
    selectedBillPaid >= selectedBillTotal;

  const replaceBill = (nextBill: BillSnapshot) => {
    setBills((currentBills) => currentBills.map((bill) => (bill.billId === nextBill.billId ? nextBill : bill)));
  };

  const appendBillHistory = (bill: BillSnapshot, action: TransactionHistoryEntry['action'], hash: string) => ({
    ...bill,
    history: [...bill.history, { action, hash, createdAt: Date.now() }],
  });

  const scrollToCreateForm = () => {
    const createForm = document.getElementById('create-bill-form');
    createForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const syncBillFromChain = async (seedBill: BillSnapshot, currentWallet: string) => {
    const onChainBill = await getBillOnChain(currentWallet, BigInt(seedBill.billId));
    const existingBill = bills.find((bill) => bill.billId === seedBill.billId);
    const nextParticipants = await Promise.all(
      seedBill.participants.map(async (participant) => {
        try {
          const onChainParticipant = await getParticipantOnChain(currentWallet, BigInt(seedBill.billId), participant.address);
          return {
            address: participant.address,
            share: onChainParticipant.share.toString(),
            paid: onChainParticipant.paid.toString(),
          };
        } catch (error) {
          console.warn('Participant refresh failed:', error);
          return participant;
        }
      })
    );

    replaceBill({
      ...seedBill,
      owner: onChainBill.owner,
      total: onChainBill.total.toString(),
      paidTotal: onChainBill.paid_total.toString(),
      participantCount: onChainBill.participant_count,
      settled: onChainBill.settled,
      participants: nextParticipants,
      history: seedBill.history.length > 0 ? seedBill.history : existingBill?.history ?? [],
    });
  };

  const handleWalletConnect = async () => {
    setLoading(true);
    setStatus('Requesting wallet access...');

    try {
      const wallet = await connectWallet();
      setProviderAvailable(wallet.providerAvailable);

      if (wallet.connected && wallet.address) {
        setConnected(true);
        setWalletAddress(wallet.address);
        setStatus(`Wallet connected: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`);
      } else {
        setStatus('Wallet connection was declined or unavailable.');
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setStatus(error instanceof Error ? error.message : 'Wallet connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBill = async () => {
    setLoading(true);
    setStatus('Preparing create_bill transaction...');

    try {
      if (!walletAddress) {
        throw new Error('Connect your Freighter wallet first.');
      }

      const parsedTotal = toBigInt(billTotal);
      if (parsedTotal <= 0n) {
        throw new Error('Enter a bill total greater than zero.');
      }

      let billId = BigInt(Date.now());
      while (bills.some((bill) => bill.billId === billId.toString())) {
        billId += 1n;
      }

      const createdBill: BillSnapshot = {
        billId: billId.toString(),
        name: billName.trim() || `Bill ${billId.toString()}`,
        total: parsedTotal.toString(),
        owner: walletAddress,
        settled: false,
        paidTotal: '0',
        participantCount: 0,
        createTxHash: '',
        lastTxHash: '',
        createdAt: Date.now(),
        participants: [],
        history: [],
      };

      setBills((currentBills) => [createdBill, ...currentBills]);
      setSelectedBillId(createdBill.billId);

      const transaction = await createBillOnChain(walletAddress, billId, parsedTotal);
      const createdBillWithHistory = appendBillHistory(
        { ...createdBill, createTxHash: transaction.hash, lastTxHash: transaction.hash },
        'Create Bill',
        transaction.hash
      );
      setStatus(`Bill created. Transaction hash: ${transaction.hash}`);
      setBills((currentBills) =>
        currentBills.map((bill) =>
          bill.billId === createdBill.billId
            ? createdBillWithHistory
            : bill
        )
      );
      await syncBillFromChain(createdBillWithHistory, walletAddress);
      setBillName('');
      setBillTotal('');
    } catch (error) {
      console.error('Create bill failed:', error);
      setStatus(error instanceof Error ? error.message : 'Bill creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async () => {
    setLoading(true);
    setStatus('Preparing add_participant transaction...');

    try {
      if (!walletAddress) {
        throw new Error('Connect your Freighter wallet first.');
      }

      if (!selectedBill) {
        throw new Error('Create or select a bill first.');
      }

      if (!connectedIsOwner) {
        throw new Error('Connect the bill owner wallet to add participants.');
      }

      const trimmedParticipantAddress = participantAddress.trim();
      if (!trimmedParticipantAddress) {
        throw new Error('Enter a Stellar wallet address.');
      }

      if (selectedBill.participants.some((participant) => participant.address === trimmedParticipantAddress)) {
        throw new Error('That participant is already added to this bill.');
      }

      const nextParticipantCount = selectedBill.participantCount + 1;
      const share = toBigInt(selectedBill.total) / BigInt(nextParticipantCount);

      if (share <= 0n) {
        throw new Error('Bill total is too small for that many participants.');
      }

      const transaction = await addParticipantOnChain(
        walletAddress,
        BigInt(selectedBill.billId),
        trimmedParticipantAddress,
        share
      );

      const nextBill: BillSnapshot = {
        ...selectedBill,
        participantCount: nextParticipantCount,
        lastTxHash: transaction.hash,
        participants: [
          ...selectedBill.participants,
          {
            address: trimmedParticipantAddress,
            share: share.toString(),
            paid: '0',
          },
        ],
        history: [
          ...selectedBill.history,
          { action: 'Add Participant', hash: transaction.hash, createdAt: Date.now() },
        ],
      };

      setBills((currentBills) => currentBills.map((bill) => (bill.billId === selectedBill.billId ? nextBill : bill)));
      setSelectedBillId(selectedBill.billId);
      setParticipantAddress('');
      setStatus(`Participant added. Transaction hash: ${transaction.hash}`);
      await syncBillFromChain({ ...nextBill, lastTxHash: transaction.hash }, walletAddress);
    } catch (error) {
      console.error('Add participant failed:', error);
      setStatus(error instanceof Error ? error.message : 'Participant update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayShare = async () => {
    setLoading(true);
    setStatus('Preparing pay_share transaction...');

    try {
      if (!walletAddress) {
        throw new Error('Connect your Freighter wallet first.');
      }

      if (!selectedBillIdValue || !selectedBill) {
        throw new Error('Select a bill first.');
      }

      if (!connectedParticipantRecord) {
        throw new Error('Your wallet is not listed as a participant on this bill.');
      }

      const remaining = toBigInt(connectedParticipantRecord.share) - toBigInt(connectedParticipantRecord.paid);
      if (remaining <= 0n) {
        throw new Error('Your share is already paid.');
      }

      const transaction = await payShareOnChain(walletAddress, selectedBillIdValue, remaining);

      const nextBill: BillSnapshot = {
        ...selectedBill,
        lastTxHash: transaction.hash,
        participants: selectedBill.participants.map((participant) =>
          participant.address === walletAddress
            ? { ...participant, paid: (toBigInt(participant.paid) + remaining).toString() }
            : participant
        ),
        paidTotal: (selectedBillPaid + remaining).toString(),
        history: [...selectedBill.history, { action: 'Pay Share', hash: transaction.hash, createdAt: Date.now() }],
      };

      setBills((currentBills) => currentBills.map((bill) => (bill.billId === selectedBill.billId ? nextBill : bill)));
      setStatus(`Payment submitted. Transaction hash: ${transaction.hash}`);
      await syncBillFromChain({ ...nextBill, lastTxHash: transaction.hash }, walletAddress);
    } catch (error) {
      console.error('Pay share failed:', error);
      setStatus(error instanceof Error ? error.message : 'Payment failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettleBill = async () => {
    setLoading(true);
    setStatus('Preparing settle_bill transaction...');

    try {
      if (!walletAddress) {
        throw new Error('Connect your Freighter wallet first.');
      }

      if (!selectedBillIdValue || !selectedBill) {
        throw new Error('Select a bill first.');
      }

      if (!connectedIsOwner) {
        throw new Error('Only the bill owner can settle this bill.');
      }

      if (!canSettle) {
        throw new Error('All shares must be paid before settling.');
      }

      const transaction = await settleBillOnChain(walletAddress, selectedBillIdValue);

      const nextBill: BillSnapshot = {
        ...selectedBill,
        settled: true,
        lastTxHash: transaction.hash,
        history: [...selectedBill.history, { action: 'Settle Bill', hash: transaction.hash, createdAt: Date.now() }],
      };

      setBills((currentBills) => currentBills.map((bill) => (bill.billId === selectedBill.billId ? nextBill : bill)));
      setStatus(`Bill settled. Transaction hash: ${transaction.hash}`);
      await syncBillFromChain({ ...nextBill, lastTxHash: transaction.hash }, walletAddress);
    } catch (error) {
      console.error('Settle bill failed:', error);
      setStatus(error instanceof Error ? error.message : 'Settle failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#08111f_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-8 lg:p-10">
          <div className="absolute right-0 top-0 h-56 w-56 translate-x-1/3 -translate-y-1/3 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 -translate-x-1/3 translate-y-1/3 rounded-full bg-amber-400/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.35em] text-cyan-200">
                Split bill workspace
              </span>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  Create a bill, add people, collect shares, and settle it on Soroban.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Bill names stay in this session UI, while totals, participants, payments, and settlement are written to your contract.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-lg font-semibold text-slate-50">{item.value}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-400">Status</p>
                    <p className="mt-1 text-slate-200">{status}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      connected ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30' : statusPillClass(false, false)
                    }`}
                  >
                    {connected ? 'Wallet connected' : providerAvailable ? 'Wallet detected' : 'Wallet pending'}
                  </span>
                </div>
                {walletAddress ? <p className="mt-3 break-all text-xs text-cyan-200">{walletAddress}</p> : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={connected ? scrollToCreateForm : handleWalletConnect}
                  disabled={loading}
                  className="rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Working...' : connected ? 'Jump to form' : providerAvailable ? 'Connect wallet' : 'Connect Freighter'}
                </button>
                <a
                  href="#bills"
                  className="rounded-full border border-slate-700 px-5 py-3 font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
                >
                  View bills
                </a>
              </div>
            </div>

            <div className="grid gap-4">
              <div id="create-bill-form" className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <h2 className="text-lg font-semibold">Create Bill</h2>
                <p className="mt-1 text-sm text-slate-400">
                  The name is a local label. The total is written to the contract.
                </p>
                <div className="mt-5 space-y-4">
                  <label className="block space-y-2 text-sm">
                    <span className="text-slate-300">Bill name</span>
                    <input
                      value={billName}
                      onChange={(event) => setBillName(event.target.value)}
                      placeholder="Dinner at Kora"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                    />
                  </label>
                  <label className="block space-y-2 text-sm">
                    <span className="text-slate-300">Total amount</span>
                    <input
                      value={billTotal}
                      onChange={(event) => setBillTotal(event.target.value)}
                      placeholder="1000"
                      inputMode="numeric"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                    />
                    <p className="text-xs text-slate-500">Use whole numbers that match your contract units, such as stroops.</p>
                  </label>
                  <button
                    onClick={handleCreateBill}
                    disabled={loading || !connected}
                    className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Create Bill
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <h2 className="text-lg font-semibold">Session notes</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Created bills are saved in this browser session so you can switch between them. The contract does not expose bill enumeration, so the list below is the session index.
                </p>
                <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                  Equal splits are stored per participant when they are added. The UI shows the current even split for the selected bill.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="bills" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="space-y-4 rounded-[2rem] border border-slate-800 bg-slate-950/70 p-5 shadow-xl shadow-slate-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Created bills</h2>
                <p className="text-sm text-slate-400">{bills.length} bill{bills.length === 1 ? '' : 's'} in this session</p>
              </div>
            </div>

            <div className="space-y-3">
              {bills.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-sm text-slate-400">
                  No bills yet. Create one to start the split.
                </div>
              ) : (
                bills.map((bill) => {
                  const active = bill.billId === selectedBillId;
                  return (
                    <button
                      key={bill.billId}
                      onClick={() => setSelectedBillId(bill.billId)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? 'border-cyan-400/40 bg-cyan-400/10 shadow-lg shadow-cyan-950/20'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-50">{billStorageLabel(bill)}</p>
                          <p className="mt-1 text-xs text-slate-400">Bill ID {bill.billId}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusPillClass(active, bill.settled)}`}>
                          {bill.settled ? 'Settled' : active ? 'Selected' : 'Open'}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                        <div>
                          <p className="text-slate-500">Total</p>
                          <p>{formatAmount(toBigInt(bill.total))}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Paid</p>
                          <p>{formatAmount(toBigInt(bill.paidTotal))}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="space-y-6 rounded-[2rem] border border-slate-800 bg-slate-950/70 p-5 shadow-xl shadow-slate-950/30">
            {selectedBill ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">{billStorageLabel(selectedBill)}</h2>
                    <p className="mt-1 text-sm text-slate-400">Contract-backed bill details and settlement controls.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusPillClass(true, selectedBill.settled)}`}>
                      {selectedBill.settled ? 'Settled' : 'Open'}
                    </span>
                    {selectedBill.createTxHash ? (
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                        Create tx {formatHash(selectedBill.createTxHash)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-sm text-slate-400">Total amount</p>
                    <p className="mt-2 text-2xl font-semibold">{formatAmount(selectedBillTotal)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-sm text-slate-400">Paid so far</p>
                    <p className="mt-2 text-2xl font-semibold">{formatAmount(selectedBillPaid)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-sm text-slate-400">Participants</p>
                    <p className="mt-2 text-2xl font-semibold">{participantCount}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-sm text-slate-400">Per-person share</p>
                    <p className="mt-2 text-2xl font-semibold">{participantCount > 0 ? formatAmount(currentShare) : '0'}</p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                    <h3 className="text-lg font-semibold">Add Participants</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      This contract stores a fixed share per participant, so the UI calculates the equal split automatically when a new participant joins.
                    </p>
                    <div className="mt-4 space-y-4">
                      <label className="block space-y-2 text-sm">
                        <span className="text-slate-300">Stellar wallet address</span>
                        <input
                          value={participantAddress}
                          onChange={(event) => setParticipantAddress(event.target.value)}
                          placeholder="G..."
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                        />
                      </label>
                      <button
                        onClick={handleAddParticipant}
                        disabled={loading || !connectedIsOwner}
                        className="w-full rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Add Participant
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                    <h3 className="text-lg font-semibold">Pay Share</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      The connected wallet can pay its remaining share when it appears in the participant list.
                    </p>
                    <div className="mt-4 space-y-4">
                      {connectedParticipantRecord ? (
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                          Your wallet is on this bill. Remaining share:{' '}
                          {formatAmount(toBigInt(connectedParticipantRecord.share) - toBigInt(connectedParticipantRecord.paid))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-400">
                          Connect a participant wallet to pay a share.
                        </div>
                      )}
                      <button
                        onClick={handlePayShare}
                        disabled={loading || !connectedParticipantRecord}
                        className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Pay My Share
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">Participants</h3>
                      <p className="text-sm text-slate-400">
                        {participantCount > 0 ? `${participantCount} total` : 'No participants yet'}
                      </p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedBillParticipants.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
                          Add the first participant to begin splitting the bill.
                        </div>
                      ) : (
                        selectedBillParticipants.map((participant) => {
                          const paid = toBigInt(participant.paid);
                          const share = toBigInt(participant.share);
                          const isConnectedWallet = participant.address === walletAddress;

                          return (
                            <div
                              key={participant.address}
                              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="break-all text-sm font-medium text-slate-50">
                                    {participant.address}
                                    {isConnectedWallet ? ' (you)' : ''}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    Share {formatAmount(share)} | Paid {formatAmount(paid)}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                                    participantStatus(participant) === 'Paid'
                                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                                      : participantStatus(participant) === 'Partial'
                                        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                                        : 'border-slate-700 bg-slate-900 text-slate-300'
                                  }`}
                                >
                                  {participantStatus(participant)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                    <h3 className="text-lg font-semibold">Bill status</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-sm text-slate-400">Owner</p>
                        <p className="mt-2 break-all text-sm text-slate-100">{selectedBill.owner}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-sm text-slate-400">Last transaction</p>
                        <p className="mt-2 break-all text-sm text-slate-100">
                          {selectedBill.lastTxHash ? formatHash(selectedBill.lastTxHash) : 'Waiting for activity'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <span>Settled</span>
                        <span className={selectedBill.settled ? 'text-emerald-300' : 'text-amber-300'}>
                          {selectedBill.settled ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span>Ready to settle</span>
                        <span className={canSettle ? 'text-emerald-300' : 'text-slate-400'}>{canSettle ? 'Yes' : 'Not yet'}</span>
                      </div>
                    </div>

                    <div data-testid="transaction-history-panel" className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-medium text-slate-100">Transaction history</h4>
                        <span className="text-xs text-slate-500">{selectedBillHistory.length} entries</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {selectedBillHistory.length === 0 ? (
                          <p className="text-sm text-slate-400">No submitted transactions yet.</p>
                        ) : (
                          selectedBillHistory.map((entry) => (
                            <div key={`${entry.action}-${entry.hash}-${entry.createdAt}`} className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <span className="font-medium text-slate-100">{entry.action}</span>
                                <span className="ml-3 break-all text-right text-slate-400">{entry.hash}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {canSettle ? (
                      <button
                        onClick={handleSettleBill}
                        disabled={loading}
                        className="w-full rounded-2xl bg-gradient-to-r from-amber-300 to-cyan-300 px-4 py-3 font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Settle Bill
                      </button>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
                        Settle becomes available once every participant has paid their share.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[30rem] flex-col items-start justify-center rounded-[1.5rem] border border-dashed border-slate-700 bg-slate-950/50 p-8 text-slate-400">
                <h2 className="text-2xl font-semibold text-slate-100">No bill selected</h2>
                <p className="mt-2 max-w-xl leading-7">
                  Create a bill to bring up participant management, share calculations, payment buttons, and settlement controls.
                </p>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
