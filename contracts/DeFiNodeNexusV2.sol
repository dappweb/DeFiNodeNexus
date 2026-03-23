// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeFiNodeNexus.sol";

contract DeFiNodeNexusV2 is DeFiNodeNexus {
    function version() external pure returns (string memory) {
        return "2";
    }
}
