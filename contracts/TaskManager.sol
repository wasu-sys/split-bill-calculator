// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface ITaskEscrow {
    function release(uint256 taskId, address recipient, uint256 amount) external returns (bool);
}

contract TaskManager is Ownable {
    struct Task {
        uint256 id;
        string title;
        string description;
        address assignee;
        address creator;
        uint256 amount;
        bool completed;
        bool paid;
    }

    IERC20 public token;
    address public escrow;
    uint256 public taskCounter;

    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed id, address indexed creator, address indexed assignee, uint256 amount);
    event TaskCompleted(uint256 indexed id, address indexed assignee);

    constructor(address _escrow, address _token) Ownable(msg.sender) {
        escrow = _escrow;
        token = IERC20(_token);
    }

    function createTask(
        string calldata title,
        string calldata description,
        address assignee,
        uint256 amount
    ) external returns (uint256) {
        require(assignee != address(0), 'Invalid assignee');
        require(amount > 0, 'Invalid amount');
        require(token.transferFrom(msg.sender, escrow, amount), 'Deposit failed');

        taskCounter += 1;
        tasks[taskCounter] = Task(taskCounter, title, description, assignee, msg.sender, amount, false, false);
        emit TaskCreated(taskCounter, msg.sender, assignee, amount);
        return taskCounter;
    }

    function completeTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(task.creator != address(0), 'Task does not exist');
        require(msg.sender == task.creator, 'Only creator can complete');
        require(!task.completed, 'Already completed');

        task.completed = true;
        task.paid = true;
        require(ITaskEscrow(escrow).release(taskId, task.assignee, task.amount), 'Payout failed');
        emit TaskCompleted(taskId, task.assignee);
    }

    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }
}
