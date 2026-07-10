import hre from 'hardhat';

const ethers = (hre as any).ethers;

async function main() {
  const TaskToken = await ethers.getContractFactory('TaskToken');
  const token = await TaskToken.deploy();
  await token.waitForDeployment();

  const TaskEscrow = await ethers.getContractFactory('TaskEscrow');
  const escrow = await TaskEscrow.deploy(await token.getAddress());
  await escrow.waitForDeployment();

  const TaskManager = await ethers.getContractFactory('TaskManager');
  const manager = await TaskManager.deploy(await escrow.getAddress(), await token.getAddress());
  await manager.waitForDeployment();
  await escrow.setManager(await manager.getAddress());
  console.log('Deployment complete');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
