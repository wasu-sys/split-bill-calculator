import { ethers } from 'ethers';
import TaskManagerArtifact from '../artifacts/contracts/TaskManager.sol/TaskManager.json';
import { CONTRACT_ADDRESSES } from './contract-config';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export async function createTaskOnChain(address: string) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Wallet provider not available');
  }

  const provider = new ethers.BrowserProvider(window.ethereum as unknown as ethers.Eip1193Provider);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESSES.taskManager, TaskManagerArtifact.abi, signer);

  const tx = await contract.createTask(
    'Wallet-backed demo task',
    'Created via the demo UI',
    address,
    ethers.parseEther('0.01')
  );
  await tx.wait();
  return tx.hash;
}
