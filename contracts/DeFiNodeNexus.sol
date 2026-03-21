// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeFiNodeNexus
 * @dev Core business logic for TOT/TOF tokens and NFTA yield node management.
 * This contract handles node registration, yield calculations, and consumption logic.
 */
contract DeFiNodeNexus {
    string public constant name = "DeFi Node Nexus Core";
    
    struct Node {
        string nodeId;
        address owner;
        uint256 lastClaimTimestamp;
        uint256 yieldPerDay; // In TOT decimals
        bool isActive;
    }

    mapping(string => Node) public nftaNodes;
    mapping(address => uint256) public totBalances;
    mapping(address => uint256) public tofBalances;

    event NodeRegistered(string indexed nodeId, address indexed owner, uint256 yieldPerDay);
    event YieldClaimed(string indexed nodeId, address indexed owner, uint256 amount);
    event TofConsumed(address indexed user, uint256 amount, string reason);

    /**
     * @dev Simulates registering an NFTA node.
     */
    function registerNode(string memory _nodeId, uint256 _yieldPerDay) external {
        require(nftaNodes[_nodeId].owner == address(0), "Node already registered");
        
        nftaNodes[_nodeId] = Node({
            nodeId: _nodeId,
            owner: msg.sender,
            lastClaimTimestamp: block.timestamp,
            yieldPerDay: _yieldPerDay,
            isActive: true
        });

        emit NodeRegistered(_nodeId, msg.sender, _yieldPerDay);
    }

    /**
     * @dev Simulates claiming TOT yield. Consumes TOF as fee.
     */
    function claimYield(string memory _nodeId) external {
        Node storage node = nftaNodes[_nodeId];
        require(node.owner == msg.sender, "Not the owner");
        require(node.isActive, "Node is not active");

        uint256 timeElapsed = block.timestamp - node.lastClaimTimestamp;
        uint256 yieldAmount = (node.yieldPerDay * timeElapsed) / 1 days;
        
        // Simulate TOF consumption (e.g., 5% of yield value in TOF)
        uint256 tofFee = yieldAmount / 20; 
        require(tofBalances[msg.sender] >= tofFee, "Insufficient TOF balance");

        tofBalances[msg.sender] -= tofFee;
        totBalances[msg.sender] += yieldAmount;
        node.lastClaimTimestamp = block.timestamp;

        emit YieldClaimed(_nodeId, msg.sender, yieldAmount);
        emit TofConsumed(msg.sender, tofFee, "Yield Withdrawal Fee");
    }

    /**
     * @dev Simple faucet for testing in Sepolia.
     */
    function testnetFaucet() external {
        totBalances[msg.sender] += 1000 * 10**18;
        tofBalances[msg.sender] += 100 * 10**18;
    }
}
