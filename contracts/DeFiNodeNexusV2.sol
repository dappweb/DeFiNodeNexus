// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeFiNodeNexus.sol";

contract DeFiNodeNexusV2 is DeFiNodeNexus {
    event UserDataPurged(address indexed user, uint256 nftaRemoved, uint256 nftbRemoved);

    function version() external pure returns (string memory) {
        return "2";
    }

    function purgeUsersExcept(address keepUser, address[] calldata users) external onlyOwner {
        require(keepUser != address(0), "Keep user is zero");

        uint256 length = users.length;
        for (uint256 i = 0; i < length; i++) {
            address user = users[i];
            if (user == address(0) || user == keepUser) continue;
            _purgeSingleUser(user);
        }
    }

    function purgeSingleUser(address user) external onlyOwner {
        require(user != address(0), "User is zero");
        _purgeSingleUser(user);
    }

    function _purgeSingleUser(address user) internal {
        uint256[] storage aNodes = userNftaNodes[user];
        uint256 nftaRemoved = aNodes.length;

        for (uint256 i = 0; i < nftaRemoved; i++) {
            uint256 nodeId = aNodes[i];
            NodeA storage node = nftaNodes[nodeId];
            if (!node.isActive) continue;

            node.isActive = false;

            if (node.owner != address(0)) {
                uint256 tierId = node.tierId;
                if (nftaTiers[tierId].currentSupply > 0) {
                    nftaTiers[tierId].currentSupply -= 1;
                }
            }

            node.owner = address(0);
            node.tierId = 0;
            node.dailyYield = 0;
            node.lastClaimDay = 0;
        }

        uint256[] storage bNodes = userNftbNodes[user];
        uint256 nftbRemoved = bNodes.length;

        for (uint256 i = 0; i < nftbRemoved; i++) {
            uint256 nodeId = bNodes[i];
            NodeB storage node = nftbNodes[nodeId];

            if (node.isActive && node.owner != address(0)) {
                uint256 tierId = node.tierId;
                uint256 weight = node.weight;
                uint256 tierWeight = totalWeightByTier[tierId];
                totalWeightByTier[tierId] = (tierWeight > weight) ? (tierWeight - weight) : 0;
            }

            node.isActive = false;
            node.owner = address(0);
            node.tierId = 0;
            node.weight = 0;
            node.rewardDebt = 0;
            usdtRewardDebtByNode[nodeId] = 0;
        }

        delete userNftaNodes[user];
        delete userNftbNodes[user];
        delete nftaLastClaimDayByUser[user];
        delete accounts[user];

        emit UserDataPurged(user, nftaRemoved, nftbRemoved);
    }
}
