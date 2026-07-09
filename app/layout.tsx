import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Web3 Task Manager',
  description: 'A production-ready starter for smart contract-driven workflows.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
