// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeFiNodeNexus
 * @dev Core logic for managing NFTA/NFTB nodes and TOT/TOF token yields.
 */
contract DeFiNodeNexus {
    string public name = "DeFi Node Nexus Core";
    address public owner;

    struct NodeA {
        uint256 id;
        uint256 yieldPerDay;
        uint256 lastClaimed;
        bool isActive;
    }

    struct NodeB {
        uint256 id;
        uint256 level;
        uint256 weight;
    }

    mapping(address => NodeA[]) public userNodesA;
    mapping(address => NodeB[]) public userNodesB;
    mapping(address => uint256) public totBalances;
    mapping(address => uint256) public tofBalances;

    event NodeCreated(address indexed user, uint256 nodeId, string nodeType);
    event YieldClaimed(address indexed user, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function createNodeA(uint256 _yield) external {
        userNodesA[msg.sender].push(NodeA({
            id: userNodesA[msg.sender].length + 1,
            yieldPerDay: _yield,
            lastClaimed: block.timestamp,
            isActive: true
        }));
        emit NodeCreated(msg.sender, userNodesA[msg.sender].length, "NFTA");
    }

    function claimYield(uint256 _nodeIdx) external {
        NodeA storage node = userNodesA[msg.sender][_nodeIdx];
        require(node.isActive, "Node is not active");
        
        uint256 timePassed = block.timestamp - node.lastClaimed;
        uint256 reward = (timePassed * node.yieldPerDay) / 1 days;
        
        totBalances[msg.sender] += reward;
        node.lastClaimed = block.timestamp;
        
        emit YieldClaimed(msg.sender, reward);
    }

    function getNodesA(address _user) external view returns (NodeA[] memory) {
        return userNodesA[_user];
    }
}
