
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TOTToken is ERC20, Ownable {
    constructor() ERC20("TOT Token", "TOT") Ownable(msg.sender) {
        _mint(msg.sender, 1000000000 * 10**decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

contract TOFToken is ERC20, Ownable {
    constructor() ERC20("TOF Token", "TOF") Ownable(msg.sender) {
        _mint(msg.sender, 10000000 * 10**decimals());
    }

    function burn(address from, uint256 amount) public {
        _burn(from, amount);
    }
}

contract NFTANode is ERC721, Ownable {
    uint256 private _nextTokenId;
    mapping(uint256 => uint256) public yieldPerDay;

    constructor() ERC721("NFTA Node", "NFTA") Ownable(msg.sender) {}

    function mint(address to, uint256 yield) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        yieldPerDay[tokenId] = yield;
    }
}

contract DeFiNodeNexus is Ownable {
    TOTToken public tot;
    TOFToken public tof;
    NFTANode public nfta;

    uint256 public constant WITHDRAW_FEE_TOF = 5 * 10**18; // 5 TOF

    event YieldWithdrawn(address indexed user, uint256 amount);

    constructor(address _tot, address _tof, address _nfta) Ownable(msg.sender) {
        tot = TOTToken(_tot);
        tof = TOFToken(_tof);
        nfta = NFTANode(_nfta);
    }

    function withdrawYield(uint256 tokenId) public {
        require(nfta.ownerOf(tokenId) == msg.sender, "Not owner");
        
        // Burn TOF as consumption fee
        tof.burn(msg.sender, WITHDRAW_FEE_TOF);
        
        uint256 yield = nfta.yieldPerDay(tokenId);
        tot.mint(msg.sender, yield * 10**18);
        
        emit YieldWithdrawn(msg.sender, yield);
    }
}
