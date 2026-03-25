// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

/**
 * @title TOFToken
 * @dev Non-transferable-by-default utility token.
 *      - Mint source is restricted to prediction minter.
 *      - User-to-user transfers are blocked unless one side is whitelisted.
 */
contract TOFToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public maxSupply;
    address public predictionMinter;
    mapping(address => bool) public transferWhitelist;

    event PredictionMinterUpdated(address indexed newMinter);
    event TransferWhitelistUpdated(address indexed account, bool status);

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
        __Ownable_init(initialOwner);

        require(initialOwner != address(0), "Owner is zero");
        require(maxSupply_ > 0, "Max supply is zero");
        require(initialSupply_ <= maxSupply_, "Initial exceeds max");

        maxSupply = maxSupply_;
        predictionMinter = initialOwner;

        transferWhitelist[initialOwner] = true;
        transferWhitelist[address(this)] = true;

        if (initialSupply_ > 0) {
            _mint(initialOwner, initialSupply_);
        }
    }

    modifier onlyPredictionMinter() {
        require(msg.sender == predictionMinter, "Only prediction minter");
        _;
    }

    function setPredictionMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "Zero");
        predictionMinter = newMinter;
        transferWhitelist[newMinter] = true;
        emit PredictionMinterUpdated(newMinter);
    }

    function setTransferWhitelist(address account, bool status) external onlyOwner {
        require(account != address(0), "Zero");
        transferWhitelist[account] = status;
        emit TransferWhitelistUpdated(account, status);
    }

    function mintFromPrediction(address to, uint256 amount) external onlyPredictionMinter {
        require(to != address(0), "To is zero");
        require(totalSupply() + amount <= maxSupply, "Cap exceeded");
        _mint(to, amount);
    }

    function airdropFromPrediction(address[] calldata recipients, uint256[] calldata amounts) external onlyPredictionMinter {
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
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            require(transferWhitelist[from] || transferWhitelist[to], "TOF non-transferable");
        }
        super._update(from, to, value);
    }

    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {
        newImplementation;
    }
}
