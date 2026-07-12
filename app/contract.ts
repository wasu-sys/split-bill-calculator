import { signTransaction } from '@stellar/freighter-api';
import { Address, BASE_FEE, Contract, Networks, TransactionBuilder, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { assembleTransaction, Server } from '@stellar/stellar-sdk/rpc';
import { SOROBAN_RPC_URL, SOROBAN_TESTNET_PASSPHRASE, SPLIT_BILL_CONTRACT_ID } from './contract-config';

export type SorobanTransactionResult = { hash: string };

export type BillOnChain = {
  owner: string;
  total: bigint;
  paid_total: bigint;
  participant_count: number;
  settled: boolean;
};

export type ParticipantOnChain = {
  share: bigint;
  paid: bigint;
};

type ContractArg = ReturnType<typeof nativeToScVal>;

function requireContractId() {
  if (!SPLIT_BILL_CONTRACT_ID) {
    throw new Error('Set NEXT_PUBLIC_SPLIT_BILL_CONTRACT_ID after deploying the Soroban contract to Stellar Testnet.');
  }

  return SPLIT_BILL_CONTRACT_ID;
}

function toRecord(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('Soroban contract returned an unexpected value.');
  }

  return value as Record<string, unknown>;
}

function toAddress(value: unknown) {
  if (value instanceof Address) {
    return value.toString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value);
}

function toBigInt(value: unknown) {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    return BigInt(value);
  }

  if (typeof value === 'string') {
    return BigInt(value);
  }

  return BigInt(String(value));
}

function buildContractCall(walletAddress: string, method: string, args: ContractArg[]) {
  const server = new Server(SOROBAN_RPC_URL);
  const contract = new Contract(requireContractId());

  return server.getAccount(walletAddress).then((account) => {
    const transaction = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(contract.call(method, ...args))
      .setTimeout(60)
      .build();

    return { server, transaction };
  });
}

async function submitContractCall(walletAddress: string, method: string, args: ContractArg[]) {
  const { server, transaction } = await buildContractCall(walletAddress, method, args);
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

async function readContractCall(walletAddress: string, method: string, args: ContractArg[]) {
  const { server, transaction } = await buildContractCall(walletAddress, method, args);
  const simulation = await server.simulateTransaction(transaction);

  if ('error' in simulation && simulation.error) {
    throw new Error(simulation.error);
  }

  if (!('result' in simulation) || !simulation.result) {
    throw new Error(`Soroban read call for ${method} did not return a value.`);
  }

  return scValToNative(simulation.result.retval);
}

export async function createBillOnChain(walletAddress: string, billId: bigint, total: bigint): Promise<SorobanTransactionResult> {
  return submitContractCall(walletAddress, 'create_bill', [
    nativeToScVal(billId, { type: 'u64' }),
    new Address(walletAddress).toScVal(),
    nativeToScVal(total, { type: 'i128' }),
  ]);
}

export async function addParticipantOnChain(
  ownerAddress: string,
  billId: bigint,
  participantAddress: string,
  share: bigint
): Promise<SorobanTransactionResult> {
  return submitContractCall(ownerAddress, 'add_participant', [
    nativeToScVal(billId, { type: 'u64' }),
    new Address(participantAddress).toScVal(),
    nativeToScVal(share, { type: 'i128' }),
  ]);
}

export async function payShareOnChain(participantAddress: string, billId: bigint, amount: bigint): Promise<SorobanTransactionResult> {
  return submitContractCall(participantAddress, 'pay_share', [
    nativeToScVal(billId, { type: 'u64' }),
    new Address(participantAddress).toScVal(),
    nativeToScVal(amount, { type: 'i128' }),
  ]);
}

export async function settleBillOnChain(ownerAddress: string, billId: bigint): Promise<SorobanTransactionResult> {
  return submitContractCall(ownerAddress, 'settle_bill', [nativeToScVal(billId, { type: 'u64' })]);
}

export async function getBillOnChain(walletAddress: string, billId: bigint): Promise<BillOnChain> {
  const native = toRecord(await readContractCall(walletAddress, 'get_bill', [nativeToScVal(billId, { type: 'u64' })]));

  return {
    owner: toAddress(native.owner),
    total: toBigInt(native.total),
    paid_total: toBigInt(native.paid_total),
    participant_count: Number(native.participant_count),
    settled: Boolean(native.settled),
  };
}

export async function getParticipantOnChain(walletAddress: string, billId: bigint, participantAddress: string): Promise<ParticipantOnChain> {
  const native = toRecord(
    await readContractCall(walletAddress, 'get_participant', [
      nativeToScVal(billId, { type: 'u64' }),
      new Address(participantAddress).toScVal(),
    ])
  );

  return {
    share: toBigInt(native.share),
    paid: toBigInt(native.paid),
  };
}
