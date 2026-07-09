import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './page';

describe('HomePage', () => {
  it('shows the hero content and architecture summary', () => {
    render(<HomePage />);

    expect(screen.getByText(/production-ready web3 starter/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile responsive ui/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view architecture/i })).toHaveAttribute('href', '#architecture');
  });

  it('shows a wallet status message when the demo flow starts without a provider', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: /run demo flow/i }));

    expect(await screen.findByText(/wallet connection was declined or unavailable/i)).toBeInTheDocument();
  });
});
