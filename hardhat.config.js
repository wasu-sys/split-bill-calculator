require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

const sepoliaAccounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      accounts: {
        count: 10,
        mnemonic: 'test test test test test test test test test test test junk',
        path: "m/44'/60'/0'/0",
      },
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      accounts: {
        mnemonic: 'test test test test test test test test test test test junk',
      },
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || '',
      accounts: sepoliaAccounts,
    },
  },
};
