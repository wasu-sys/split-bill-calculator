
# Split Bill Calculator

A Stellar Testnet dApp for tracking shared bills with a Soroban smart contract and Freighter wallet signing.

## Features

- Soroban Rust contract for `create_bill`, `add_participant`, `pay_share`, and `settle_bill`
- Freighter integration on Stellar Testnet (`Test SDF Network ; September 2015`)
- Soroban RPC simulation, transaction assembly, wallet signing, submission, and confirmation polling
- Responsive Next.js interface with transaction loading and error states
- Rust contract tests, frontend tests, and GitHub Actions CI

## Run Locally

1. Install JavaScript dependencies: `npm install`
2. Install Rust and the `wasm32v1-none` target: `rustup target add wasm32v1-none`
3. Copy `.env.example` to `.env` and add your deployed contract ID.
4. Run contract tests: `npm run contract:test`
5. Run frontend tests: `npm run test:frontend`
6. Start the app: `npm run dev`

The frontend can connect without a deployed contract, but creating a bill requires `NEXT_PUBLIC_SPLIT_BILL_CONTRACT_ID` in `.env`.

## Deploy to Stellar Testnet

Install the Stellar CLI, create or select a funded Testnet identity, then run:

```powershell
npm run contract:deploy -- -SourceAccount your-testnet-identity -Network testnet
```

The command builds `soroban/src/lib.rs`, uploads the WASM, deploys it, and prints the contract ID. Copy that value into `.env`:

```dotenv
NEXT_PUBLIC_SPLIT_BILL_CONTRACT_ID=CA3Q3TVF7YIUU5BCP7KLAUYBYND4TVRWAJODKCPU4LLLS4JFPYVAIGHG
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
```

Restart `npm run dev`, connect Freighter while it is set to Testnet, then select **Create test bill**. Freighter signs the simulated `create_bill` transaction and the page displays the confirmed transaction hash.

## Project Structure

- `soroban/src/lib.rs` - Split bill Soroban contract and its Rust tests.
- `app/contract.ts` - Soroban RPC transaction lifecycle and Freighter signing.
- `app/wallet.ts` - Freighter access and Testnet verification.
- `scripts/deploy-soroban.ps1` - Testnet/Mainnet deployment helper.
- `.github/workflows/ci.yml` - Rust contract build/tests plus frontend tests/build.

## CI/CD

Every push and pull request runs the Soroban WASM build, Rust contract tests, frontend tests, and the Next.js production build.

## Live Demo

[split-bill-calculator-self.vercel.app](https://split-bill-calculator-self.vercel.app/)

## Deployment

- Contract ID: `CA3Q3TVF7YIUU5BCP7KLAUYBYND4TVRWAJODKCPU4LLLS4JFPYVAIGHG`
- WASM upload hash: [`687be48409de0e37420b3935d16d40a01e785bdd5b6b7c7683cc0ea2b389b78b`](https://stellar.expert/explorer/testnet/tx/687be48409de0e37420b3935d16d40a01e785bdd5b6b7c7683cc0ea2b389b78b)
- Contract deploy hash: [`1c4319558820643d8d7b7a1126a1f612428d091d254ead833215dcb62da48ee0`](https://stellar.expert/explorer/testnet/tx/1c4319558820643d8d7b7a1126a1f612428d091d254ead833215dcb62da48ee0)
- Contract page on Stellar Expert: [`CA3Q3TVF7YIUU5BCP7KLAUYBYND4TVRWAJODKCPU4LLLS4JFPYVAIGHG`](https://stellar.expert/explorer/testnet/contract/CA3Q3TVF7YIUU5BCP7KLAUYBYND4TVRWAJODKCPU4LLLS4JFPYVAIGHG)

## Live Transaction Example

- Transaction hash: [`eac3d1091a93a8de305b180789094e4994ed2262141f29e97222cdb6afd942b2`](https://stellar.expert/explorer/testnet/tx/eac3d1091a93a8de305b180789094e4994ed2262141f29e97222cdb6afd942b2)
- Latest live transaction hash: [`b6ad77e795de80a751cde31b5baa349833d45185d7454a3dd2398256938463c1`](https://stellar.expert/explorer/testnet/tx/b6ad77e795de80a751cde31b5baa349833d45185d7454a3dd2398256938463c1)

## Submission Artifacts

- Contract interaction transaction: create a bill and copy the hash shown in the UI.
- Mobile responsive UI screenshot:<img width="800" height="8400" alt="split-bill-calculator-self vercel app_ (1)" src="https://github.com/user-attachments/assets/b2b46cbc-652f-4de3-ac07-da122d05d02d" />


- CI/CD pipeline screenshot:<img width="1885" height="896" alt="Screenshot 2026-07-11 143810" src="https://github.com/user-attachments/assets/0689ee41-0f2e-4e64-9a36-2d723f123693" />



- Demo video: add your 1-2 minute recording link.
