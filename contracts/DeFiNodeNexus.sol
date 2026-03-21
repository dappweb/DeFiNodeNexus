// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeFiNodeNexus
 * @dev Core logic for TOT (Yield Token) and TOF (Consumption Token) in the Nexus ecosystem.
 */
contract DeFiNodeNexus is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1000000000 * 10**18;
    
    // Mapping for NFTA node yields
    mapping(address => uint256) public dailyYieldRate;
    mapping(address => uint256) public lastClaimTimestamp;

    event YieldClaimed(address indexed user, uint256 amount);
    event NodeActivated(address indexed user, uint256 nodeId);

    constructor() ERC20("Nexus Yield Token", "TOT") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev Simple yield claim simulation logic for testing on Sepolia.
     */
    function claimYield() external {
        uint256 timePassed = block.timestamp - lastClaimTimestamp[msg.sender];
        require(timePassed >= 1 days, "Can only claim once per day");
        
        uint256 amount = dailyYieldRate[msg.sender];
        require(amount > 0, "No active nodes found");

        lastClaimTimestamp[msg.sender] = block.timestamp;
        _mint(msg.sender, amount);
        
        emit YieldClaimed(msg.sender, amount);
    }

    /**
     * @dev Set daily yield for a user (called by system/owner).
     */
    function setYieldRate(address user, uint256 amount) external onlyOwner {
        dailyYieldRate[user] = amount;
    }
}
