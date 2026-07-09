import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './page';

describe('HomePage', () => {
  it('shows the demo status and updates the timeline after running the flow', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    expect(screen.getByText(/production-ready web3 starter/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /run demo flow/i }));

    expect(screen.getByText(/connecting wallet and approving escrow/i)).toBeInTheDocument();
  });
});
