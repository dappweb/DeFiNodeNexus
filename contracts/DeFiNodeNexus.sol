// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DeFiNodeNexus
 * @dev Core business logic for managing TOT/TOF tokens and NFTA/NFTB node rewards.
 *
 * Business model implemented in this contract:
 * - Owner configures NFTA and NFTB tiers.
 * - Owner registers successful off-chain purchases on-chain.
 * - NFTA generates linear daily TOT yield.
 * - NFTB receives TOT dividends from owner-funded distribution rounds.
 * - Users may bind a referrer once.
 * - Team levels are derived from direct referrals and total team nodes.
 * - Team bonuses accrue in TOT when downline NFTA yield is claimed.
 * - TOT withdrawals consume TOF, and part of TOF is burned.
 */
contract DeFiNodeNexus is Ownable {
    using SafeERC20 for IERC20;

    uint256 private constant ACC_PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant MAX_TEAM_DEPTH = 5;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    struct NftaTier {
        uint256 price;
        uint256 dailyYield;
        bool isActive;
    }

    struct NftbTier {
        uint256 price;
        uint256 weight;
        bool isActive;
    }

    struct NodeA {
        address owner;
        uint256 tierId;
        uint256 dailyYield;
        uint256 lastClaim;
        bool isActive;
    }

    struct NodeB {
        address owner;
        uint256 tierId;
        uint256 weight;
        uint256 rewardDebt;
        bool isActive;
    }

    struct Account {
        address referrer;
        uint256 pendingTot;
        uint256 claimedTot;
        uint256 withdrawnTot;
        uint256 totalNodes;
        uint256 directReferrals;
        uint256 teamNodes;
    }

    IERC20 public immutable totToken;
    IERC20 public immutable tofToken;
    IERC20 public immutable usdtToken;

    address public treasury;
    uint256 public nextNftaTierId = 1;
    uint256 public nextNftbTierId = 1;
    uint256 public nextNodeId = 1;
    uint256 public totalNftbWeight;
    uint256 public accTotDividendPerWeight;
    uint256 public tofBurnBps = 500;

    mapping(uint256 => NftaTier) public nftaTiers;
    mapping(uint256 => NftbTier) public nftbTiers;
    mapping(uint256 => NodeA) public nftaNodes;
    mapping(uint256 => NodeB) public nftbNodes;
    mapping(address => uint256[]) public userNftaNodes;
    mapping(address => uint256[]) public userNftbNodes;
    mapping(address => Account) public accounts;
    mapping(uint8 => uint256) public levelBonusBps;
    mapping(uint8 => uint256) public withdrawFeeBpsByLevel;

    event ReferrerBound(address indexed user, address indexed referrer);
    event NftaTierConfigured(uint256 indexed tierId, uint256 price, uint256 dailyYield, bool isActive);
    event NftbTierConfigured(uint256 indexed tierId, uint256 price, uint256 weight, bool isActive);
    event NftaPurchased(address indexed user, uint256 indexed nodeId, uint256 indexed tierId, uint256 price);
    event NftbPurchased(address indexed user, uint256 indexed nodeId, uint256 indexed tierId, uint256 price);
    event NftaYieldClaimed(address indexed user, uint256 indexed nodeId, uint256 amount);
    event NftbDividendClaimed(address indexed user, uint256 indexed nodeId, uint256 amount);
    event TeamBonusAccrued(address indexed beneficiary, address indexed sourceUser, uint256 amount, uint8 level);
    event TotWithdrawn(address indexed user, uint256 totAmount, uint256 tofFee, uint256 burnedTof);
    event DividendRoundFunded(uint256 amount, uint256 newAccDividendPerWeight);
    event RewardPoolFunded(address indexed from, uint256 amount);
    event TreasuryUpdated(address indexed treasury);
    event TofBurnRateUpdated(uint256 tofBurnBps);

    constructor(address _tot, address _tof, address _usdt) Ownable(msg.sender) {
        require(_tot != address(0), "TOT token is zero");
        require(_tof != address(0), "TOF token is zero");
        require(_usdt != address(0), "USDT token is zero");

        totToken = IERC20(_tot);
        tofToken = IERC20(_tof);
        usdtToken = IERC20(_usdt);
        treasury = msg.sender;

        levelBonusBps[1] = 300;
        levelBonusBps[2] = 500;
        levelBonusBps[3] = 800;
        levelBonusBps[4] = 1200;
        levelBonusBps[5] = 1800;

        withdrawFeeBpsByLevel[0] = 1000;
        withdrawFeeBpsByLevel[1] = 800;
        withdrawFeeBpsByLevel[2] = 650;
        withdrawFeeBpsByLevel[3] = 500;
        withdrawFeeBpsByLevel[4] = 400;
        withdrawFeeBpsByLevel[5] = 300;
    }

    function bindReferrer(address referrer) external {
        _bindReferrer(msg.sender, referrer);
    }

    function configureNftaTier(
        uint256 tierId,
        uint256 price,
        uint256 dailyYield,
        bool isActive
    ) external onlyOwner returns (uint256 configuredTierId) {
        require(dailyYield > 0, "Daily yield is zero");

        configuredTierId = tierId;
        if (configuredTierId == 0) {
            configuredTierId = nextNftaTierId++;
        }

        nftaTiers[configuredTierId] = NftaTier({
            price: price,
            dailyYield: dailyYield,
            isActive: isActive
        });

        emit NftaTierConfigured(configuredTierId, price, dailyYield, isActive);
    }

    function configureNftbTier(
        uint256 tierId,
        uint256 price,
        uint256 weight,
        bool isActive
    ) external onlyOwner returns (uint256 configuredTierId) {
        require(weight > 0, "Weight is zero");

        configuredTierId = tierId;
        if (configuredTierId == 0) {
            configuredTierId = nextNftbTierId++;
        }

        nftbTiers[configuredTierId] = NftbTier({
            price: price,
            weight: weight,
            isActive: isActive
        });

        emit NftbTierConfigured(configuredTierId, price, weight, isActive);
    }

    function registerNftaPurchase(address user, uint256 tierId, address referrer) external onlyOwner returns (uint256 nodeId) {
        require(user != address(0), "User is zero");

        NftaTier memory tier = nftaTiers[tierId];
        require(tier.isActive, "NFTA tier inactive");

        _bindReferrerIfNeeded(user, referrer);

        nodeId = _createNftaNode(user, tierId, tier.dailyYield);

        emit NftaPurchased(user, nodeId, tierId, tier.price);
    }

    function buyNfta(uint256 tierId, address referrer) external returns (uint256 nodeId) {
        NftaTier memory tier = nftaTiers[tierId];
        require(tier.isActive, "NFTA tier inactive");
        require(tier.price > 0, "NFTA tier price is zero");
        require(userNftaNodes[msg.sender].length == 0, "Only one NFTA allowed");

        _bindReferrerIfNeeded(msg.sender, referrer);

        usdtToken.safeTransferFrom(msg.sender, treasury, tier.price);

        nodeId = _createNftaNode(msg.sender, tierId, tier.dailyYield);

        emit NftaPurchased(msg.sender, nodeId, tierId, tier.price);
    }

    function _createNftaNode(address user, uint256 tierId, uint256 dailyYield) internal returns (uint256 nodeId) {
        require(user != address(0), "User is zero");

        nodeId = nextNodeId++;
        nftaNodes[nodeId] = NodeA({
            owner: user,
            tierId: tierId,
            dailyYield: dailyYield,
            lastClaim: block.timestamp,
            isActive: true
        });

        userNftaNodes[user].push(nodeId);
        accounts[user].totalNodes += 1;
        _increaseUplineTeamNodes(user, 1);
    }

    function registerNftbPurchase(address user, uint256 tierId, address referrer) external onlyOwner returns (uint256 nodeId) {
        require(user != address(0), "User is zero");

        NftbTier memory tier = nftbTiers[tierId];
        require(tier.isActive, "NFTB tier inactive");

        _bindReferrerIfNeeded(user, referrer);

        nodeId = nextNodeId++;
        nftbNodes[nodeId] = NodeB({
            owner: user,
            tierId: tierId,
            weight: tier.weight,
            rewardDebt: (tier.weight * accTotDividendPerWeight) / ACC_PRECISION,
            isActive: true
        });

        totalNftbWeight += tier.weight;
        userNftbNodes[user].push(nodeId);
        accounts[user].totalNodes += 1;
        _increaseUplineTeamNodes(user, 1);

        emit NftbPurchased(user, nodeId, tierId, tier.price);
    }

    function fundRewardPool(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount is zero");
        totToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardPoolFunded(msg.sender, amount);
    }

    function distributeNftbDividends(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount is zero");
        require(totalNftbWeight > 0, "No NFTB weight");

        totToken.safeTransferFrom(msg.sender, address(this), amount);
        accTotDividendPerWeight += (amount * ACC_PRECISION) / totalNftbWeight;

        emit DividendRoundFunded(amount, accTotDividendPerWeight);
    }

    function claimNftaYield(uint256 nodeId) public {
        NodeA storage node = nftaNodes[nodeId];
        require(node.owner == msg.sender, "Not node owner");
        require(node.isActive, "Node inactive");

        uint256 reward = pendingNftaYield(nodeId);
        require(reward > 0, "No reward to claim");

        node.lastClaim = block.timestamp;
        accounts[msg.sender].pendingTot += reward;
        accounts[msg.sender].claimedTot += reward;

        _accrueTeamBonuses(msg.sender, reward);

        emit NftaYieldClaimed(msg.sender, nodeId, reward);
    }

    function claimAllNftaYield() external {
        uint256[] storage nodes = userNftaNodes[msg.sender];
        uint256 length = nodes.length;
        require(length > 0, "No NFTA nodes");

        for (uint256 i = 0; i < length; i++) {
            if (nftaNodes[nodes[i]].isActive && pendingNftaYield(nodes[i]) > 0) {
                claimNftaYield(nodes[i]);
            }
        }
    }

    function claimNftbDividend(uint256 nodeId) public {
        NodeB storage node = nftbNodes[nodeId];
        require(node.owner == msg.sender, "Not node owner");
        require(node.isActive, "Node inactive");

        uint256 accumulated = (node.weight * accTotDividendPerWeight) / ACC_PRECISION;
        uint256 pending = accumulated - node.rewardDebt;
        require(pending > 0, "No dividend to claim");

        node.rewardDebt = accumulated;
        accounts[msg.sender].pendingTot += pending;
        accounts[msg.sender].claimedTot += pending;

        emit NftbDividendClaimed(msg.sender, nodeId, pending);
    }

    function claimAllNftbDividends() external {
        uint256[] storage nodes = userNftbNodes[msg.sender];
        uint256 length = nodes.length;
        require(length > 0, "No NFTB nodes");

        for (uint256 i = 0; i < length; i++) {
            NodeB storage node = nftbNodes[nodes[i]];
            if (!node.isActive) {
                continue;
            }

            uint256 accumulated = (node.weight * accTotDividendPerWeight) / ACC_PRECISION;
            if (accumulated > node.rewardDebt) {
                claimNftbDividend(nodes[i]);
            }
        }
    }

    function withdrawTot(uint256 amount) external {
        require(amount > 0, "Amount is zero");
        require(accounts[msg.sender].pendingTot >= amount, "Insufficient pending TOT");

        uint8 level = getUserLevel(msg.sender);
        uint256 feeBps = withdrawFeeBpsByLevel[level];
        uint256 tofFee = (amount * feeBps) / BASIS_POINTS;
        uint256 burnedTof;

        accounts[msg.sender].pendingTot -= amount;
        accounts[msg.sender].withdrawnTot += amount;

        if (tofFee > 0) {
            tofToken.safeTransferFrom(msg.sender, address(this), tofFee);

            burnedTof = (tofFee * tofBurnBps) / BASIS_POINTS;
            if (burnedTof > 0) {
                tofToken.safeTransfer(BURN_ADDRESS, burnedTof);
            }

            uint256 treasuryShare = tofFee - burnedTof;
            if (treasuryShare > 0) {
                tofToken.safeTransfer(treasury, treasuryShare);
            }
        }

        totToken.safeTransfer(msg.sender, amount);

        emit TotWithdrawn(msg.sender, amount, tofFee, burnedTof);
    }

    function pendingNftaYield(uint256 nodeId) public view returns (uint256) {
        NodeA memory node = nftaNodes[nodeId];
        if (!node.isActive || node.owner == address(0)) {
            return 0;
        }

        uint256 timePassed = block.timestamp - node.lastClaim;
        return (timePassed * node.dailyYield) / 1 days;
    }

    function pendingNftbDividend(uint256 nodeId) public view returns (uint256) {
        NodeB memory node = nftbNodes[nodeId];
        if (!node.isActive || node.owner == address(0)) {
            return 0;
        }

        uint256 accumulated = (node.weight * accTotDividendPerWeight) / ACC_PRECISION;
        return accumulated - node.rewardDebt;
    }

    function getUserLevel(address user) public view returns (uint8) {
        Account memory account = accounts[user];

        if (account.directReferrals >= 50 && account.teamNodes >= 100) {
            return 5;
        }
        if (account.directReferrals >= 30 && account.teamNodes >= 60) {
            return 4;
        }
        if (account.directReferrals >= 15 && account.teamNodes >= 30) {
            return 3;
        }
        if (account.directReferrals >= 8 && account.teamNodes >= 15) {
            return 2;
        }
        if (account.directReferrals >= 3 && account.teamNodes >= 5) {
            return 1;
        }
        return 0;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury is zero");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setTofBurnBps(uint256 newTofBurnBps) external onlyOwner {
        require(newTofBurnBps <= BASIS_POINTS, "Burn too high");
        tofBurnBps = newTofBurnBps;
        emit TofBurnRateUpdated(newTofBurnBps);
    }

    function setLevelBonusBps(uint8 level, uint256 bonusBps) external onlyOwner {
        require(level <= 5, "Invalid level");
        require(bonusBps <= BASIS_POINTS, "Bonus too high");
        levelBonusBps[level] = bonusBps;
    }

    function setWithdrawFeeBps(uint8 level, uint256 feeBps) external onlyOwner {
        require(level <= 5, "Invalid level");
        require(feeBps <= BASIS_POINTS, "Fee too high");
        withdrawFeeBpsByLevel[level] = feeBps;
    }

    function _bindReferrerIfNeeded(address user, address referrer) internal {
        if (accounts[user].referrer == address(0) && referrer != address(0) && referrer != user) {
            _bindReferrer(user, referrer);
        }
    }

    function _bindReferrer(address user, address referrer) internal {
        require(user != address(0), "User is zero");
        require(referrer != address(0), "Referrer is zero");
        require(referrer != user, "Self referrer");
        require(accounts[user].referrer == address(0), "Referrer already set");

        accounts[user].referrer = referrer;
        accounts[referrer].directReferrals += 1;

        emit ReferrerBound(user, referrer);
    }

    function _increaseUplineTeamNodes(address user, uint256 amount) internal {
        address current = accounts[user].referrer;

        for (uint256 depth = 0; depth < MAX_TEAM_DEPTH && current != address(0); depth++) {
            accounts[current].teamNodes += amount;
            current = accounts[current].referrer;
        }
    }

    function _accrueTeamBonuses(address user, uint256 baseReward) internal {
        address current = accounts[user].referrer;

        for (uint256 depth = 0; depth < MAX_TEAM_DEPTH && current != address(0); depth++) {
            uint8 level = getUserLevel(current);
            uint256 bonusBps = levelBonusBps[level];

            if (bonusBps > 0) {
                uint256 bonus = (baseReward * bonusBps) / BASIS_POINTS;
                if (bonus > 0) {
                    accounts[current].pendingTot += bonus;
                    accounts[current].claimedTot += bonus;
                    emit TeamBonusAccrued(current, user, bonus, level);
                }
            }

            current = accounts[current].referrer;
        }
    }
}
