export type DemoEvent = {
  id: number;
  message: string;
  status: 'pending' | 'active' | 'done';
};

export const demoEvents: DemoEvent[] = [
  { id: 1, message: 'Freighter account connected to Stellar Testnet', status: 'done' },
  { id: 2, message: 'Split bill creation is ready for signature', status: 'pending' },
  { id: 3, message: 'Soroban RPC confirms the submitted transaction', status: 'pending' },
];
