# Web3 Full-Stack Starter

This project demonstrates a production-ready Web3 application stack with:

- Solidity smart contracts for task escrow and payout flows
- Hardhat-based compile/test/deploy workflow
- A mobile-responsive Next.js frontend with loading and error states
- CI/CD automation with GitHub Actions
- A clear architecture for extending into real-time event streaming

## Quick start

1. Install dependencies: `npm install`
2. Compile contracts: `npm run contract:compile`
3. Run tests: `npm run contract:test`
4. Start the frontend: `npm run dev`
5. Deploy locally: `npx hardhat node` and `npm run contract:deploy`

## Architecture highlights

- `contracts/TaskManager.sol` orchestrates task creation and completion.
- `contracts/TaskEscrow.sol` manages escrow deposits and releases.
- `app/page.tsx` provides a responsive UI and demo workflow.
- `scripts/deploy.ts` wires up deployment and initialization.
