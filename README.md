# Split Bill Calculator

Production-ready Stellar/Web3 starter with smart contracts, a responsive frontend, CI, and deployment automation.

## What's Included

- Advanced smart contract workflow with escrow and payout logic
- Inter-contract communication between manager and escrow contracts
- Event-driven UI timeline for state changes
- Mobile responsive Next.js frontend with loading and error states
- Hardhat test and deployment scripts
- GitHub Actions CI pipeline

## Quick Start

1. Install dependencies: `npm install`
2. Compile contracts: `npm run contract:compile`
3. Run contract tests: `npm run contract:test`
4. Run frontend tests: `npm run test:frontend`
5. Start the app: `npm run dev`

## Project Structure

- `contracts/TaskToken.sol` mints the demo token used in the workflow.
- `contracts/TaskEscrow.sol` manages token custody and payout release.
- `contracts/TaskManager.sol` coordinates task creation and completion.
- `app/page.tsx` renders the demo UI and wallet flow.
- `app/contract.ts` submits the on-chain task creation transaction.
- `scripts/deploy.ts` handles deployment on local and test networks.

## CI/CD

The repository includes GitHub Actions in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) that:

- installs dependencies with `npm ci`
- compiles the contracts
- runs the contract test suite
- builds the Next.js app

## Submission Checklist

Status reflects what is currently present in the repository or what still needs to be supplied before submission.

- Public GitHub repository: complete
- README with complete documentation: complete
- Minimum 10+ meaningful commits: not yet complete
- Live demo link: not yet provided
- Contract deployment address: not yet provided
- Transaction hash for contract interaction: not yet provided
- Mobile responsive UI screenshot: not yet provided
- CI/CD pipeline screenshot: not yet provided
- Test output with 3+ passing tests: complete
- Demo video link: not yet provided

## Required Submission Artifacts

Paste these into the final submission package:

- Live demo: `https://split-bill-calculator-self.vercel.app/`
- Deployed contract address: `0x0000000000000000000000000000000000000000`
- Transaction hash: `0x0000000000000000000000000000000000000000000000000000000000000000`
- Mobile screenshot: `./submission/mobile-ui.png`
- CI screenshot: `./submission/ci-passed.png`
- Demo video: `https://your-demo-video-url`

## Final Submission Notes

- The repository now includes 4 frontend tests and 1 contract test.
- The Hardhat network is pinned to the standard test mnemonic for repeatable local runs.
- Before submitting, add the real deployment address, transaction hash, live demo URL, screenshots, and demo video link.

## Sepolia Deploy

1. Set `SEPOLIA_RPC_URL` and `PRIVATE_KEY` in `.env`.
2. Deploy with `npm run contract:deploy:sepolia`.
3. Copy the printed `TaskManager` address and transaction hash into the submission checklist.
