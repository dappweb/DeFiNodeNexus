// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TOTToken.sol";

contract TOTTokenV2 is TOTToken {
    function version() external pure returns (string memory) {
        return "2";
    }
}
