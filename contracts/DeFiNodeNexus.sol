// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeFiNodeNexus
 * @dev Core business logic for TOT/TOF tokens and NFTA yield nodes.
 */
contract DeFiNodeNexus is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    constructor() ERC20("Total Optimization Token", "TOT") Ownable(msg.sender) {
        _mint(msg.sender, MAX_SUPPLY / 10); // Initial ecosystem liquidity
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
}

contract NFTANode is ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;
    mapping(uint256 => uint256) public nodeYieldRate;

    constructor() ERC721("NFTA Yield Node", "NFTA") Ownable(msg.sender) {}

    function mintNode(address to, uint256 yieldRate) external onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        nodeYieldRate[tokenId] = yieldRate;
    }
}
