// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title TOTToken
 * @dev Deployable TOT ERC20 token with capped supply and owner mint controls.
 */
contract TOTToken is ERC20, ERC20Burnable, Ownable {
    uint256 public immutable maxSupply;

    event Airdrop(address indexed operator, uint256 recipients, uint256 totalAmount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 initialSupply_,
        address initialOwner
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(initialOwner != address(0), "Owner is zero");
        require(maxSupply_ > 0, "Max supply is zero");
        require(initialSupply_ <= maxSupply_, "Initial exceeds max");

        maxSupply = maxSupply_;
        if (initialSupply_ > 0) {
            _mint(initialOwner, initialSupply_);
        }

        if (initialOwner != msg.sender) {
            transferOwnership(initialOwner);
        }
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "To is zero");
        require(totalSupply() + amount <= maxSupply, "Cap exceeded");
        _mint(to, amount);
    }

    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Length mismatch");

        uint256 total;
        uint256 length = recipients.length;
        for (uint256 i = 0; i < length; i++) {
            require(recipients[i] != address(0), "Recipient is zero");
            total += amounts[i];
        }

        require(totalSupply() + total <= maxSupply, "Cap exceeded");

        for (uint256 i = 0; i < length; i++) {
            _mint(recipients[i], amounts[i]);
        }

        emit Airdrop(msg.sender, length, total);
    }
}
