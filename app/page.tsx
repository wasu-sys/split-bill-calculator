"use client";

import React, { useMemo, useState } from 'react';
import { createBillOnChain } from './contract';
import { demoEvents } from './events';
import { connectWallet } from './wallet';

const stats = [
  { label: 'Contract-backed workflows', value: '100%' },
  { label: 'Mobile responsive UI', value: 'Yes' },
  { label: 'CI/CD ready', value: 'Configured' },
];

export default function HomePage() {
  const [status, setStatus] = useState('Ready to create a split bill on Stellar Testnet');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [providerAvailable, setProviderAvailable] = useState(false);
  const [events, setEvents] = useState(demoEvents);

  const cardText = useMemo(
    () => 'Soroban smart contracts, Freighter signing, RPC transaction submission, and real-time status updates work together here.',
    []
  );

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

  const simulateFlow = async () => {
    setLoading(true);
    setStatus('Preparing Soroban create_bill transaction...');
    setEvents(demoEvents.map((event) => ({ ...event, status: event.id === 1 ? 'done' : 'pending' })));

    try {
      if (!walletAddress) {
        throw new Error('Connect a wallet first');
      }

      const billId = BigInt(Date.now());
      setEvents((current) =>
        current.map((event) =>
          event.id === 2 ? { ...event, status: 'active' } : event.id === 3 ? { ...event, status: 'active' } : event
        )
      );
      const transaction = await createBillOnChain(walletAddress, billId, 1000n);
      setConnected(true);
      setEvents((current) =>
        current.map((event) =>
          event.id === 2 || event.id === 3 ? { ...event, status: 'done' } : event
        )
      );
      setStatus(`Bill created on Stellar Testnet. Transaction: ${transaction.hash}`);
    } catch (error) {
      console.error('Transaction flow failed:', error);
      setStatus(error instanceof Error ? error.message : 'Transaction failed. Please ensure your wallet and contract deployment are ready.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
      <section className="grid gap-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-cyan-950/30 lg:grid-cols-[1.15fr_0.85fr] lg:p-12">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
            Production-ready Web3 starter
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Showcase a complete decentralized workflow with confidence.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">{cardText}</p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={connected ? simulateFlow : handleWalletConnect}
              className="rounded-full bg-cyan-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-400"
            >
              {loading ? 'Working...' : connected ? 'Create test bill' : providerAvailable ? 'Connect wallet' : 'Connect Freighter'}
            </button>
            <a
              href="#architecture"
              className="rounded-full border border-slate-700 px-5 py-3 font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
            >
              View architecture
            </a>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-slate-100">Demo status</span>
              <span className={`rounded-full px-2.5 py-1 text-xs ${connected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                {connected ? 'Wallet connected' : providerAvailable ? 'Ready to connect' : 'Wallet pending'}
              </span>
            </div>
            <p>{status}</p>
            {walletAddress ? <p className="mt-2 text-xs text-cyan-300">Connected account: {walletAddress}</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-xl font-semibold">What this demo highlights</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>- Soroban split-bill contract calls</li>
            <li>- Freighter-signed Stellar Testnet transactions</li>
            <li>- Responsive UI with loading and error states</li>
            <li>- Contract tests plus deployment automation</li>
          </ul>

          <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Live event timeline</h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-200">
              {events.map((event) => (
                <li key={event.id} className="flex gap-2">
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full ${
                      event.status === 'done' ? 'bg-cyan-400' : event.status === 'active' ? 'bg-emerald-400' : 'bg-slate-600'
                    }`}
                  />
                  <span className={event.status === 'pending' ? 'text-slate-400' : 'text-slate-100'}>{event.message}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="architecture" className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-2xl font-semibold">{item.value}</p>
            <p className="mt-1 text-sm text-slate-400">{item.label}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
