// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TOTToken is ERC20 {
    constructor() ERC20("TOT Yield Token", "TOT") {
        _mint(msg.sender, 1000000000 * 10**decimals());
    }
}

contract TOFToken is ERC20 {
    constructor() ERC20("TOF Utility Token", "TOF") {
        _mint(msg.sender, 10000000 * 10**decimals());
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}

contract NFTANode is ERC721Enumerable, Ownable {
    uint256 public nextNodeId;
    mapping(uint256 => uint256) public yieldPerDay;

    constructor() ERC721("NFTA Yield Node", "NFTA") Ownable(msg.sender) {}

    function mintNode(address to, uint256 _yield) public onlyOwner {
        uint256 tokenId = nextNodeId++;
        _safeMint(to, tokenId);
        yieldPerDay[tokenId] = _yield;
    }
}

contract DeFiNodeNexus is Ownable {
    TOTToken public tot;
    TOFToken public tof;
    NFTANode public nfta;

    constructor(address _tot, address _tof, address _nfta) Ownable(msg.sender) {
        tot = TOTToken(_tot);
        tof = TOFToken(_tof);
        nfta = NFTANode(_nfta);
    }

    function withdrawYield(uint256 nodeId) public {
        // Business logic for consuming TOF and minting TOT
        uint256 cost = 10 * 10**18; // 10 TOF
        tof.transferFrom(msg.sender, address(this), cost);
        tof.burn(cost);
        
        uint256 reward = nfta.yieldPerDay(nodeId) * 10**18;
        tot.transfer(msg.sender, reward);
    }
}
