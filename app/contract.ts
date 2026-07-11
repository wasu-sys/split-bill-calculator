import { signTransaction } from '@stellar/freighter-api';
import { Address, BASE_FEE, Contract, nativeToScVal, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { assembleTransaction, Server } from '@stellar/stellar-sdk/rpc';
import { SOROBAN_RPC_URL, SOROBAN_TESTNET_PASSPHRASE, SPLIT_BILL_CONTRACT_ID } from './contract-config';

export type SorobanTransactionResult = { hash: string };

function requireContractId() {
  if (!SPLIT_BILL_CONTRACT_ID) throw new Error('Set NEXT_PUBLIC_SPLIT_BILL_CONTRACT_ID after deploying the Soroban contract to Stellar Testnet.');
  return SPLIT_BILL_CONTRACT_ID;
}

async function submitContractCall(walletAddress: string, method: string, args: ReturnType<typeof nativeToScVal>[]) {
  const server = new Server(SOROBAN_RPC_URL);
  const account = await server.getAccount(walletAddress);
  const contract = new Contract(requireContractId());
  const transaction = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(contract.call(method, ...args)).setTimeout(60).build();
  const simulation = await server.simulateTransaction(transaction);
  const prepared = assembleTransaction(transaction, simulation).build();
  const signed = await signTransaction(prepared.toXDR(), { address: walletAddress, networkPassphrase: SOROBAN_TESTNET_PASSPHRASE });
  if (signed.error || !signed.signedTxXdr) {
    console.error('Freighter transaction signing failed:', signed.error);
    throw new Error(signed.error?.message || 'Freighter did not sign the Soroban transaction.');
  }
  const signedTransaction = TransactionBuilder.fromXDR(signed.signedTxXdr, Networks.TESTNET);
  const submission = await server.sendTransaction(signedTransaction);
  if (submission.status !== 'PENDING') {
    console.error('Soroban transaction submission failed:', submission);
    throw new Error(`Soroban RPC rejected the transaction (${submission.status}).`);
  }
  const completed = await server.pollTransaction(submission.hash);
  if (completed.status !== 'SUCCESS') {
    console.error('Soroban transaction did not succeed:', completed);
    throw new Error(`Soroban transaction finished with status ${completed.status}.`);
  }
  return { hash: submission.hash };
}

export async function createBillOnChain(walletAddress: string, billId: bigint, total: bigint): Promise<SorobanTransactionResult> {
  return submitContractCall(walletAddress, 'create_bill', [
    nativeToScVal(billId, { type: 'u64' }), new Address(walletAddress).toScVal(), nativeToScVal(total, { type: 'i128' }),
  ]);
}

export async function addParticipantOnChain(ownerAddress: string, billId: bigint, participantAddress: string, share: bigint): Promise<SorobanTransactionResult> {
  return submitContractCall(ownerAddress, 'add_participant', [
    nativeToScVal(billId, { type: 'u64' }), new Address(participantAddress).toScVal(), nativeToScVal(share, { type: 'i128' }),
  ]);
}

export async function payShareOnChain(participantAddress: string, billId: bigint, amount: bigint): Promise<SorobanTransactionResult> {
  return submitContractCall(participantAddress, 'pay_share', [
    nativeToScVal(billId, { type: 'u64' }), new Address(participantAddress).toScVal(), nativeToScVal(amount, { type: 'i128' }),
  ]);
}

export async function settleBillOnChain(ownerAddress: string, billId: bigint): Promise<SorobanTransactionResult> {
  return submitContractCall(ownerAddress, 'settle_bill', [nativeToScVal(billId, { type: 'u64' })]);
}
