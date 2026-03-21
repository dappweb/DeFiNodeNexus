
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeFiNodeNexus
 * @dev 用于管理 TOT/TOF 代币和 NFTA 收益节点的业务逻辑合约。
 */
contract DeFiNodeNexus {
    string public name = "DeFi Node Nexus";
    
    struct Node {
        string nodeId;
        address owner;
        uint256 yieldPerDay;
        uint256 lastClaim;
        bool active;
    }

    mapping(string => Node) public nftaNodes;
    mapping(address => uint256) public totBalances;
    mapping(address => uint256) public tofBalances;

    event NodeRegistered(string nodeId, address owner, uint256 yieldPerDay);
    event YieldClaimed(string nodeId, address owner, uint256 amount);

    function registerNode(string memory _nodeId, uint256 _yieldPerDay) public {
        require(!nftaNodes[_nodeId].active, "Node already registered");
        nftaNodes[_nodeId] = Node({
            nodeId: _nodeId,
            owner: msg.sender,
            yieldPerDay: _yieldPerDay,
            lastClaim: block.timestamp,
            active: true
        });
        emit NodeRegistered(_nodeId, msg.sender, _yieldPerDay);
    }

    function claimYield(string memory _nodeId) public {
        Node storage node = nftaNodes[_nodeId];
        require(node.active, "Node not active");
        require(node.owner == msg.sender, "Not node owner");

        uint256 timePassed = block.timestamp - node.lastClaim;
        uint256 claimable = (timePassed * node.yieldPerDay) / 1 days;
        
        require(claimable > 0, "No yield to claim");

        node.lastClaim = block.timestamp;
        totBalances[msg.sender] += claimable;

        emit YieldClaimed(_nodeId, msg.sender, claimable);
    }
}
