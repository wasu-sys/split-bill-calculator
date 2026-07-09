export type WalletState = {
  address: string | null;
  connected: boolean;
  providerAvailable: boolean;
};

export async function connectWallet(): Promise<WalletState> {
  if (typeof window === 'undefined' || !('ethereum' in window)) {
    return { address: null, connected: false, providerAvailable: false };
  }

  const provider = window.ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];

  return {
    address: accounts[0] ?? null,
    connected: Boolean(accounts[0]),
    providerAvailable: true,
  };
}
