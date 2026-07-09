// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract TaskEscrow is Ownable {
    IERC20 public token;
    address public manager;

    event FundsDeposited(uint256 indexed taskId, address indexed payer, uint256 amount);
    event FundsReleased(uint256 indexed taskId, address indexed recipient, uint256 amount);

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    function setManager(address _manager) external onlyOwner {
        manager = _manager;
    }

    function deposit(uint256 taskId, uint256 amount) external returns (bool) {
        require(msg.sender == manager, 'Only manager can deposit');
        require(token.transferFrom(msg.sender, address(this), amount), 'Transfer failed');
        emit FundsDeposited(taskId, msg.sender, amount);
        return true;
    }

    function release(uint256 taskId, address recipient, uint256 amount) external returns (bool) {
        require(msg.sender == manager, 'Only manager can release');
        require(token.transfer(recipient, amount), 'Transfer failed');
        emit FundsReleased(taskId, recipient, amount);
        return true;
    }
}
