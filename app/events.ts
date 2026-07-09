export type DemoEvent = {
  id: number;
  message: string;
  status: 'pending' | 'active' | 'done';
};

export const demoEvents: DemoEvent[] = [
  { id: 1, message: 'Task created on-chain and escrow funded', status: 'done' },
  { id: 2, message: 'Assignee marked ready for payout', status: 'pending' },
  { id: 3, message: 'Payout released and event emitted to the UI', status: 'pending' },
];
