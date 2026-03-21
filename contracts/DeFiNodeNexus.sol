// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title DeFiNodeNexus
 * @dev Core business logic for managing TOT/TOF tokens and NFT nodes.
 */
contract DeFiNodeNexus is Ownable {
    
    struct NodeA {
        uint256 dailyYield;
        uint256 lastClaim;
        bool isActive;
    }

    mapping(uint256 => NodeA) public nftaNodes;
    mapping(address => uint256[]) public userNodes;

    ERC20 public totToken;
    ERC20 public tofToken;

    event YieldClaimed(address indexed user, uint256 amount);
    event NodeActivated(address indexed user, uint256 nodeId);

    constructor(address _tot, address _tof) Ownable(msg.sender) {
        totToken = ERC20(_tot);
        tofToken = ERC20(_tof);
    }

    function activateNode(uint256 _nodeId, uint256 _yield) external onlyOwner {
        nftaNodes[_nodeId] = NodeA({
            dailyYield: _yield,
            lastClaim: block.timestamp,
            isActive: true
        });
        emit NodeActivated(msg.sender, _nodeId);
    }

    function claimYield(uint256 _nodeId) external {
        NodeA storage node = nftaNodes[_nodeId];
        require(node.isActive, "Node not active");
        
        uint256 timePassed = block.timestamp - node.lastClaim;
        uint256 reward = (timePassed * node.dailyYield) / 1 days;
        
        require(reward > 0, "No reward to claim");
        
        node.lastClaim = block.timestamp;
        require(totToken.transfer(msg.sender, reward), "Transfer failed");
        
        emit YieldClaimed(msg.sender, reward);
    }
}
