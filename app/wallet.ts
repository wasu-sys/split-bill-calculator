import { getNetworkDetails, isConnected, requestAccess } from '@stellar/freighter-api';

export type WalletState = {
  address: string | null;
  connected: boolean;
  providerAvailable: boolean;
};

const STELLAR_TESTNET_NETWORK = 'Test SDF Network ; September 2015';
const TESTNET_NETWORK_NAMES = new Set(['TESTNET', 'TEST NET']);

function isTestnetNetwork(network: { network?: string; networkPassphrase?: string }) {
  const networkName = (network.network || '').trim().toUpperCase();
  const networkPassphrase = (network.networkPassphrase || '').trim();

  return TESTNET_NETWORK_NAMES.has(networkName) || networkPassphrase === STELLAR_TESTNET_NETWORK;
}

export async function connectWallet(): Promise<WalletState> {
  if (typeof window === 'undefined') {
    throw new Error('Wallet connection is only available in the browser.');
  }

  try {
    const connectionStatus = await isConnected();
    if (connectionStatus.error) {
      console.error('Freighter connection check failed:', connectionStatus.error);
    }

    const access = await requestAccess();
    if (access.error || !access.address) {
      console.error('Freighter access failed:', access.error);
      throw new Error('Freighter wallet connection was declined or unavailable. Install Freighter and approve the connection prompt to continue.');
    }

    const network = await getNetworkDetails();
    if (network.error) {
      console.error('Freighter network check failed:', network.error);
      throw new Error('Unable to verify the Freighter network. Switch Freighter to Test SDF Network ; September 2015.');
    }

    console.log('Freighter network details:', network);

    if (!isTestnetNetwork(network)) {
      throw new Error(`Switch Freighter to ${STELLAR_TESTNET_NETWORK} to use this demo.`);
    }

    return {
      address: access.address,
      connected: true,
      providerAvailable: Boolean(connectionStatus.isConnected || access.address),
    };
  } catch (error) {
    console.error('Freighter wallet access failed:', error);
    throw error;
  }
}
