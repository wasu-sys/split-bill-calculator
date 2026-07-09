import { ethers } from 'hardhat';

async function main() {
  const TaskToken = await ethers.getContractFactory('TaskToken');
  const token = await TaskToken.deploy();
  await token.waitForDeployment();
  console.log('TaskToken deployed to:', await token.getAddress());

  const TaskEscrow = await ethers.getContractFactory('TaskEscrow');
  const escrow = await TaskEscrow.deploy(await token.getAddress());
  await escrow.waitForDeployment();
  console.log('TaskEscrow deployed to:', await escrow.getAddress());

  const TaskManager = await ethers.getContractFactory('TaskManager');
  const manager = await TaskManager.deploy(await escrow.getAddress(), await token.getAddress());
  await manager.waitForDeployment();
  await escrow.setManager(await manager.getAddress());
  console.log('TaskManager deployed to:', await manager.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
