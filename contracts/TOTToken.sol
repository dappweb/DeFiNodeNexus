// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";

/**
 * @title TOTToken
 * @dev Deployable TOT ERC20 token with capped supply and owner mint controls.
 */
contract TOTToken is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public maxSupply;

    event Airdrop(address indexed operator, uint256 recipients, uint256 totalAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 initialSupply_,
        address initialOwner
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        __Ownable_init(initialOwner);

        require(initialOwner != address(0), "Owner is zero");
        require(maxSupply_ > 0, "Max supply is zero");
        require(initialSupply_ <= maxSupply_, "Initial exceeds max");

        maxSupply = maxSupply_;
        if (initialSupply_ > 0) {
            _mint(initialOwner, initialSupply_);
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

    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {
        newImplementation;
    }
}
