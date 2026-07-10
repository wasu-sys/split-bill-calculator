export type WalletState = {
  address: string | null;
  connected: boolean;
  providerAvailable: boolean;
};

export async function connectWallet(): Promise<WalletState> {
  if (typeof window === 'undefined') {
    throw new Error('Wallet connection is only available in the browser.');
  }

  if (!('ethereum' in window) || !window.ethereum) {
    throw new Error('No Ethereum wallet provider was found. Install MetaMask and switch to Sepolia to use this demo.');
  }

  const provider = window.ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  try {
    const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];

    return {
      address: accounts[0] ?? null,
      connected: Boolean(accounts[0]),
      providerAvailable: true,
    };
  } catch (error) {
    console.error('Ethereum wallet access failed:', error);
    throw error;
  }
}
