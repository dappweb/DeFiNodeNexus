// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TOTSwap.sol";

contract TOTSwapV2 is TOTSwap {
    function version() external pure returns (string memory) {
        return "2";
    }
}
