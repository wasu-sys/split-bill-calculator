const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('TaskManager', function () {
  it('creates and completes a task through the escrow flow', async function () {
    const [creator, assignee] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('TaskToken');
    const token = await Token.deploy();

    const Escrow = await ethers.getContractFactory('TaskEscrow');
    const escrow = await Escrow.deploy(await token.getAddress());

    const Manager = await ethers.getContractFactory('TaskManager');
    const manager = await Manager.deploy(await escrow.getAddress(), await token.getAddress());

    await escrow.setManager(await manager.getAddress());
    await token.transfer(creator.address, ethers.parseEther('1000'));
    await token.connect(creator).approve(await manager.getAddress(), ethers.parseEther('100'));

    const createTx = await manager
      .connect(creator)
      .createTask('Build a responsive dashboard', 'Create a polished mobile experience', assignee.address, ethers.parseEther('50'));
    await createTx.wait();

    const task = await manager.getTask(1);
    expect(task.title).to.equal('Build a responsive dashboard');
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(ethers.parseEther('50'));

    const balanceBefore = await token.balanceOf(assignee.address);
    await manager.connect(creator).completeTask(1);
    const balanceAfter = await token.balanceOf(assignee.address);

    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther('50'));
  });
});
