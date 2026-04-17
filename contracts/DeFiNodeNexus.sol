// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DeFiNodeNexus
 * @dev Complete business logic for NFTA/NFTB nodes, TOT/TOF tokens, and team referrals.
 *
 * NFTA Purchase Fund Distribution (buyNfta):
 *   30% → Team referral commission (Gen1 10%, Gen2 5%, Gen3-17 1% each)
 *   10% → 0号线 wallet
 *   10% → 社区建设 wallet
 *   10% → 基金会 wallet
 *   40% → 机构 wallet
 *
 * NFTA Yield Rules:
 *   - Daily TOT yield (1.3%-2% of U principal equivalent)
 *   - Use-it-or-lose-it: only 1 day's yield available at a time; missed days are forfeited
 *   - Claiming requires TOF payment (configurable, default 70%)
 *   - Must claim all at once per node
 *
 * TOT Withdrawal:
 *   - Requires TOF fee based on user level (Lv0 10% → Lv5 3%)
 *   - Part of TOF fee is burned
 */
contract DeFiNodeNexus is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    uint256 private constant ACC_PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant MAX_TEAM_DEPTH = 17;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ======================== Structs ========================

    struct NftaTier {
        uint256 price;          // USDT price (with token decimals)
        uint256 dailyYield;     // daily TOT yield (with token decimals)
        uint256 maxSupply;      // max cards for this tier
        uint256 currentSupply;  // minted count
        bool isActive;
    }

    struct NftbTier {
        uint256 price;          // USDT price (with token decimals)
        uint256 weight;         // weight for per-tier dividend distribution
        uint256 maxSupply;      // max cards for this tier (default 2000)
        uint256 usdtMinted;    // count minted via USDT (max maxSupply/2)
        uint256 tofMinted;     // count minted via TOF (max maxSupply/2)
        uint256 dividendBps;   // share of total dividend pool in bps (2000=20%, 3000=30%, 4000=40%)
        bool isActive;
    }

    struct NodeA {
        address owner;
        uint256 tierId;
        uint256 dailyYield;
        uint256 lastClaimDay;   // day number (block.timestamp / 1 days)
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
        uint256 teamCommissionEarned;   // total USDT commission earned
    }

    // ======================== Tokens ========================

    IERC20 public totToken;
    IERC20 public tofToken;
    IERC20 public usdtToken;

    // ======================== Wallets ========================

    address public treasury;            // fallback for unclaimed commission & dust
    address public zeroLineWallet;      // 0号线   10%
    address public communityWallet;     // 社区建设  10%
    address public foundationWallet;    // 基金会   10%
    address public institutionWallet;   // 机构    40%
    address public projectWallet;       // 项目方钱包 (NFTB dividend 10%)

    // ======================== State ========================

    uint256 public nextNftaTierId;
    uint256 public nextNftbTierId;
    uint256 public nextNodeId;
    mapping(uint256 => uint256) public totalWeightByTier;
    mapping(uint256 => uint256) public accDividendPerWeightByTier;
    uint256 public tofBurnBps;           // 5% of TOF fee is burned
    uint256 public tofClaimFeeBps;      // 70% TOF fee when claiming NFTA yield

    // ======================== Mappings ========================

    mapping(uint256 => NftaTier) public nftaTiers;
    mapping(uint256 => NftbTier) public nftbTiers;
    mapping(uint256 => NodeA) public nftaNodes;
    mapping(uint256 => NodeB) public nftbNodes;
    mapping(address => uint256[]) public userNftaNodes;
    mapping(address => uint256[]) public userNftbNodes;
    mapping(address => Account) public accounts;
    uint256 public withdrawFeeBps;
    mapping(address => bool) public isDistributor;  // authorized callers for distributeNftbDividends
    mapping(uint256 => uint256) public accUsdtDividendPerWeightByTier;
    mapping(uint256 => uint256) public usdtRewardDebtByNode;
    uint256 public tofPerUsdt;          // TOF amount per 1 USDT (scaled by 1e18)
    mapping(uint256 => uint256) public predictionFlowBpsByTier;
    mapping(address => uint256) public nftaLastClaimDayByUser;
    mapping(address => bool) public admins;
    address[] private adminList;  // Enumerable admin list
    mapping(address => uint256) private adminIndex;  // admin address => index in adminList
    mapping(address => bool) public managers;
    address[] private managerList;  // Enumerable manager list
    mapping(address => uint256) private managerIndex;  // manager address => index in managerList

    // ======================== Events ========================

    event ReferrerBound(address indexed user, address indexed referrer);
    event NftaTierConfigured(uint256 indexed tierId, uint256 price, uint256 dailyYield, uint256 maxSupply, bool isActive);
    event NftbTierConfigured(uint256 indexed tierId, uint256 price, uint256 weight, uint256 maxSupply, uint256 dividendBps, bool isActive);
    event ProjectWalletUpdated(address indexed newWallet);
    event NftaPurchased(address indexed user, uint256 indexed nodeId, uint256 indexed tierId, uint256 price);
    event NftaCardTransferred(address indexed from, address indexed to, uint256 indexed nodeId);
    event NftbPurchased(address indexed user, uint256 indexed nodeId, uint256 indexed tierId, uint256 price);
    event NftaYieldClaimed(address indexed user, uint256 indexed nodeId, uint256 totAmount, uint256 tofConsumed);
    event NftbDividendClaimed(address indexed user, uint256 indexed nodeId, uint256 amount);
    event NftbUsdtDividendClaimed(address indexed user, uint256 indexed nodeId, uint256 amount);
    event TeamCommissionPaid(address indexed beneficiary, address indexed buyer, uint256 amount, uint256 generation);
    event TotWithdrawn(address indexed user, uint256 totAmount, uint256 tofFee, uint256 burnedTof);
    event DividendRoundFunded(uint256 amount, uint256 newAccDividendPerWeight);
    event UsdtDividendRoundFunded(uint256 amount, uint256 newAccDividendPerWeight);
    event PredictionFlowRateUpdated(uint256 indexed tierId, uint256 bps);
    event PredictionFlowDistributed(uint256 flowAmount, uint256 distributedAmount, uint256 treasuryAmount);
    event RewardPoolFunded(address indexed from, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);
    event WalletsUpdated(address zeroLine, address community, address foundation, address institution);
    event TofBurnRateUpdated(uint256 newBps);
    event TofClaimFeeUpdated(uint256 newBps);
    event TofPerUsdtUpdated(uint256 newRate);
    event DistributorUpdated(address indexed addr, bool status);
    event AdminUpdated(address indexed account, bool enabled);
    event AdminBatchUpdated(uint256 count);
    event ManagerUpdated(address indexed account, bool enabled);
    event ManagerBatchUpdated(uint256 count);
    event UsdtTokenUpdated(address indexed oldToken, address indexed newToken);
    event ReferrerUpdated(address indexed user, address indexed oldReferrer, address indexed newReferrer);

    // ======================== Constructor ========================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _tot, address _tof, address _usdt, address initialOwner) public initializer {
        require(_tot != address(0), "TOT is zero");
        require(_tof != address(0), "TOF is zero");
        require(_usdt != address(0), "USDT is zero");
        require(initialOwner != address(0), "Owner is zero");

        __Ownable_init(initialOwner);

        totToken = IERC20(_tot);
        tofToken = IERC20(_tof);
        usdtToken = IERC20(_usdt);

        treasury = initialOwner;
        zeroLineWallet = initialOwner;
        communityWallet = initialOwner;
        foundationWallet = initialOwner;
        institutionWallet = initialOwner;
        projectWallet = initialOwner;
        nextNftaTierId = 1;
        nextNftbTierId = 1;
        nextNodeId = 1;
        tofBurnBps = 500;
        tofClaimFeeBps = 7000;
        tofPerUsdt = 200e18;
        predictionFlowBpsByTier[1] = 40; // 0.4%
        predictionFlowBpsByTier[2] = 50; // 0.5%
        predictionFlowBpsByTier[3] = 60; // 0.6%

        // Unified withdraw fee (TOF cost per TOT withdrawn)
        withdrawFeeBps = 1000;  // 10%
    }

    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner() || admins[msg.sender], "Not admin");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner() || admins[msg.sender] || managers[msg.sender], "Not authorized");
        _;
    }

    // ================================================================
    //                      PUBLIC FUNCTIONS
    // ================================================================

    /// @notice Bind a referrer (one-time, irreversible).
    function bindReferrer(address referrer) external {
        _bindReferrer(msg.sender, referrer);
    }

    /**
     * @notice Buy an NFTA card with USDT. One per address.
     * @param tierId  The NFTA tier to purchase.
     * @param referrer  Optional referrer address (zero if none).
     *
     * Fund distribution:
     *   30% → 17-generation team referral commission (USDT)
     *   10% → 0号线 wallet
     *   10% → 社区建设 wallet
     *   10% → 基金会 wallet
     *   40% → 机构 wallet
     */
    function buyNfta(uint256 tierId, address referrer) external returns (uint256 nodeId) {
        NftaTier storage tier = nftaTiers[tierId];
        require(tier.isActive, "Tier inactive");
        require(tier.price > 0, "Price is zero");
        require(tier.currentSupply < tier.maxSupply, "Tier sold out");

        _bindReferrerIfNeeded(msg.sender, referrer);

        uint256 price = tier.price;

        // Pull full USDT from buyer into this contract
        usdtToken.safeTransferFrom(msg.sender, address(this), price);

        // 1) Distribute 30% team referral commission
        uint256 teamDistributed = _distributeTeamCommission(msg.sender, price);

        // 2) Fixed wallet distributions
        uint256 zeroLineShare    = (price * 1000) / BASIS_POINTS;  // 10%
        uint256 communityShare   = (price * 1000) / BASIS_POINTS;  // 10%
        uint256 foundationShare  = (price * 1000) / BASIS_POINTS;  // 10%
        uint256 institutionShare = (price * 4000) / BASIS_POINTS;  // 40%

        usdtToken.safeTransfer(zeroLineWallet, zeroLineShare);
        usdtToken.safeTransfer(communityWallet, communityShare);
        usdtToken.safeTransfer(foundationWallet, foundationShare);
        usdtToken.safeTransfer(institutionWallet, institutionShare);

        // 3) Any rounding dust → treasury
        uint256 totalSent = teamDistributed + zeroLineShare + communityShare + foundationShare + institutionShare;
        if (price > totalSent) {
            usdtToken.safeTransfer(treasury, price - totalSent);
        }

        // 4) Mint node
        tier.currentSupply += 1;
        nodeId = _createNftaNode(msg.sender, tierId, tier.dailyYield);

        emit NftaPurchased(msg.sender, nodeId, tierId, price);
    }

    /// @notice Transfer an owned NFTA node to another address.
    function transferNftaCard(address to, uint256 nodeId) external {
        require(to != address(0), "To is zero");

        NodeA storage node = nftaNodes[nodeId];
        address from = node.owner;
        require(node.isActive, "Inactive");
        require(from != address(0), "Node not found");
        require(to != from, "Same owner");
        require(msg.sender == from || msg.sender == owner(), "Not authorized");

        uint256 today = block.timestamp / 1 days;
        bool recipientHadNoNfta = userNftaNodes[to].length == 0;

        _removeNftaNodeFromUser(from, nodeId);
        userNftaNodes[to].push(nodeId);

        node.owner = to;

        accounts[from].totalNodes -= 1;
        accounts[to].totalNodes += 1;

        if (recipientHadNoNfta && nftaLastClaimDayByUser[to] < today) {
            nftaLastClaimDayByUser[to] = today;
        }

        emit NftaCardTransferred(from, to, nodeId);
    }

    /**
     * @notice Buy an NFTB card with USDT.
     * Each tier has maxSupply total cards, half purchasable with USDT.
     * Tiers: Junior (500U), Intermediate (1000U), Advanced (2000U).
     *
     * Fund distribution:
     *   30% → 17-generation team referral commission (USDT)
     *   10% → 0号线 wallet
     *   10% → 社区建设 wallet
     *   10% → 基金会 wallet
     *   40% → 机构 wallet
     */
    function buyNftbWithUsdt(uint256 tierId, address referrer) external returns (uint256 nodeId) {
        NftbTier storage tier = nftbTiers[tierId];
        require(tier.isActive, "Tier inactive");
        require(tier.price > 0, "Price is zero");
        require(tier.usdtMinted < tier.maxSupply / 2, "USDT quota sold out");

        _bindReferrerIfNeeded(msg.sender, referrer);

        uint256 price = tier.price;

        // Pull full USDT from buyer into this contract
        usdtToken.safeTransferFrom(msg.sender, address(this), price);

        // 1) Distribute 30% team referral commission
        uint256 teamDistributed = _distributeTeamCommission(msg.sender, price);

        // 2) Fixed wallet distributions
        uint256 zeroLineShare    = (price * 1000) / BASIS_POINTS;  // 10%
        uint256 communityShare   = (price * 1000) / BASIS_POINTS;  // 10%
        uint256 foundationShare  = (price * 1000) / BASIS_POINTS;  // 10%
        uint256 institutionShare = (price * 4000) / BASIS_POINTS;  // 40%

        usdtToken.safeTransfer(zeroLineWallet, zeroLineShare);
        usdtToken.safeTransfer(communityWallet, communityShare);
        usdtToken.safeTransfer(foundationWallet, foundationShare);
        usdtToken.safeTransfer(institutionWallet, institutionShare);

        // 3) Any rounding dust → treasury
        uint256 totalSent = teamDistributed + zeroLineShare + communityShare + foundationShare + institutionShare;
        if (price > totalSent) {
            usdtToken.safeTransfer(treasury, price - totalSent);
        }

        tier.usdtMinted += 1;
        nodeId = _createNftbNode(msg.sender, tierId, tier.weight);

        emit NftbPurchased(msg.sender, nodeId, tierId, price);
    }

    /**
     * @notice Buy an NFTB card with TOF (equivalent price in TOF tokens).
     * Each tier has maxSupply total cards, half purchasable with TOF.
     */
    function buyNftbWithTof(uint256 tierId, address referrer) external returns (uint256 nodeId) {
        NftbTier storage tier = nftbTiers[tierId];
        require(tier.isActive, "Tier inactive");
        require(tier.price > 0, "Price is zero");
        require(tier.tofMinted < tier.maxSupply / 2, "TOF quota sold out");

        _bindReferrerIfNeeded(msg.sender, referrer);

        uint256 tofCost = (tier.price * tofPerUsdt) / 1e18;
        require(tofCost > 0, "TOF cost is zero");

        tofToken.safeTransferFrom(msg.sender, address(this), tofCost);

        // 1) 30% team referral commission (paid in TOF)
        uint256 teamDistributed = _distributeTeamCommissionTof(msg.sender, tofCost);

        // 2) Fixed wallet distributions (paid in TOF)
        uint256 zeroLineShare    = (tofCost * 1000) / BASIS_POINTS;  // 10%
        uint256 communityShare   = (tofCost * 1000) / BASIS_POINTS;  // 10%
        uint256 foundationShare  = (tofCost * 1000) / BASIS_POINTS;  // 10%
        uint256 institutionShare = (tofCost * 4000) / BASIS_POINTS;  // 40%
        tofToken.safeTransfer(zeroLineWallet, zeroLineShare);
        tofToken.safeTransfer(communityWallet, communityShare);
        tofToken.safeTransfer(foundationWallet, foundationShare);
        tofToken.safeTransfer(institutionWallet, institutionShare);

        // 3) Dust (rounding remainder) → treasury
        uint256 totalSent = teamDistributed + zeroLineShare + communityShare + foundationShare + institutionShare;
        if (tofCost > totalSent) {
            tofToken.safeTransfer(treasury, tofCost - totalSent);
        }

        tier.tofMinted += 1;
        nodeId = _createNftbNode(msg.sender, tierId, tier.weight);

        emit NftbPurchased(msg.sender, nodeId, tierId, tier.price);
    }

    /**
     * @notice Claim today's NFTA yield for one node.
     * Use-it-or-lose-it: exactly 1 day's yield; missed days are forfeited.
     * Requires TOF payment (tofClaimFeeBps% of yield amount).
     */
    function claimNftaYield(uint256 nodeId) public {
        NodeA storage node = nftaNodes[nodeId];
        require(node.owner == msg.sender, "Not owner");
        require(node.isActive, "Inactive");

        _claimNftaYieldForUser(msg.sender);
    }

    function _claimNftaYieldForUser(address user) internal {
        (uint256 reward, uint256 rewardNodeId) = _getHighestActiveNftaYield(user);
        require(reward > 0, "No NFTA nodes");

        uint256 today = block.timestamp / 1 days;
        require(today > nftaLastClaimDayByUser[user], "Already claimed today");

        // TOF fee to claim
        uint256 tofFee = (reward * tofClaimFeeBps) / BASIS_POINTS;
        if (tofFee > 0) {
            tofToken.safeTransferFrom(user, address(this), tofFee);

            uint256 burnAmount = (tofFee * tofBurnBps) / BASIS_POINTS;
            if (burnAmount > 0) {
                tofToken.safeTransfer(BURN_ADDRESS, burnAmount);
            }
            uint256 treasuryTof = tofFee - burnAmount;
            if (treasuryTof > 0) {
                tofToken.safeTransfer(treasury, treasuryTof);
            }
        }

        nftaLastClaimDayByUser[user] = today;
        accounts[user].pendingTot += reward;
        accounts[user].claimedTot += reward;

        nftaNodes[rewardNodeId].lastClaimDay = today;

        emit NftaYieldClaimed(user, rewardNodeId, reward, tofFee);
    }

    /// @notice Claim NFTA yield for caller once per day, using highest active NFTA node only.
    function claimAllNftaYield() external {
        uint256[] storage nodes = userNftaNodes[msg.sender];
        require(nodes.length > 0, "No NFTA nodes");

        _claimNftaYieldForUser(msg.sender);
    }

    function claimNftbDividend(uint256 nodeId) public {
        NodeB storage node = nftbNodes[nodeId];
        require(node.owner == msg.sender, "Not owner");
        require(node.isActive, "Inactive");

        uint256 accumulated = (node.weight * accDividendPerWeightByTier[node.tierId]) / ACC_PRECISION;
        uint256 pending = accumulated - node.rewardDebt;
        require(pending > 0, "No dividend");

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
            if (!node.isActive) continue;

            uint256 accumulated = (node.weight * accDividendPerWeightByTier[node.tierId]) / ACC_PRECISION;
            if (accumulated > node.rewardDebt) {
                claimNftbDividend(nodes[i]);
            }
        }
    }

    function claimNftbUsdtDividend(uint256 nodeId) public {
        NodeB storage node = nftbNodes[nodeId];
        require(node.owner == msg.sender, "Not owner");
        require(node.isActive, "Inactive");

        uint256 accumulated = (node.weight * accUsdtDividendPerWeightByTier[node.tierId]) / ACC_PRECISION;
        uint256 pending = accumulated - usdtRewardDebtByNode[nodeId];
        require(pending > 0, "No dividend");

        usdtRewardDebtByNode[nodeId] = accumulated;
        usdtToken.safeTransfer(msg.sender, pending);

        emit NftbUsdtDividendClaimed(msg.sender, nodeId, pending);
    }

    function claimAllNftbUsdtDividends() external {
        uint256[] storage nodes = userNftbNodes[msg.sender];
        uint256 length = nodes.length;
        require(length > 0, "No NFTB nodes");

        for (uint256 i = 0; i < length; i++) {
            NodeB storage node = nftbNodes[nodes[i]];
            if (!node.isActive) continue;

            uint256 accumulated = (node.weight * accUsdtDividendPerWeightByTier[node.tierId]) / ACC_PRECISION;
            if (accumulated > usdtRewardDebtByNode[nodes[i]]) {
                claimNftbUsdtDividend(nodes[i]);
            }
        }
    }

    /// @notice Withdraw pending TOT. No TOF fee required.
    function withdrawTot(uint256 amount) external {
        require(amount > 0, "Zero amount");
        require(accounts[msg.sender].pendingTot >= amount, "Insufficient TOT");

        accounts[msg.sender].pendingTot -= amount;
        accounts[msg.sender].withdrawnTot += amount;

        totToken.safeTransfer(msg.sender, amount);

        emit TotWithdrawn(msg.sender, amount, 0, 0);
    }

    // ================================================================
    //                       VIEW FUNCTIONS
    // ================================================================

    /// @notice Returns 1 day's yield if claimable today, else 0.
    function pendingNftaYield(uint256 nodeId) public view returns (uint256) {
        NodeA memory node = nftaNodes[nodeId];
        if (!node.isActive || node.owner == address(0)) return 0;

        uint256 today = block.timestamp / 1 days;
        if (today <= nftaLastClaimDayByUser[node.owner]) return 0;

        (uint256 reward,) = _getHighestActiveNftaYield(node.owner);
        return reward;
    }

    function pendingNftbDividend(uint256 nodeId) public view returns (uint256) {
        NodeB memory node = nftbNodes[nodeId];
        if (!node.isActive || node.owner == address(0)) return 0;

        uint256 accumulated = (node.weight * accDividendPerWeightByTier[node.tierId]) / ACC_PRECISION;
        return accumulated - node.rewardDebt;
    }

    function pendingNftbUsdtDividend(uint256 nodeId) public view returns (uint256) {
        NodeB memory node = nftbNodes[nodeId];
        if (!node.isActive || node.owner == address(0)) return 0;

        uint256 accumulated = (node.weight * accUsdtDividendPerWeightByTier[node.tierId]) / ACC_PRECISION;
        return accumulated - usdtRewardDebtByNode[nodeId];
    }

    function getUserNftaNodes(address user) external view returns (uint256[] memory) {
        return userNftaNodes[user];
    }

    function getUserNftbNodes(address user) external view returns (uint256[] memory) {
        return userNftbNodes[user];
    }

    /// @notice Get remaining supply for an NFTA tier.
    function getNftaTierRemaining(uint256 tierId) external view returns (uint256) {
        NftaTier memory tier = nftaTiers[tierId];
        if (tier.currentSupply >= tier.maxSupply) return 0;
        return tier.maxSupply - tier.currentSupply;
    }

    /// @notice Get remaining USDT/TOF supply for an NFTB tier.
    function getNftbTierRemaining(uint256 tierId) external view returns (uint256 usdtRemaining, uint256 tofRemaining) {
        NftbTier memory tier = nftbTiers[tierId];
        uint256 halfSupply = tier.maxSupply / 2;
        usdtRemaining = tier.usdtMinted >= halfSupply ? 0 : halfSupply - tier.usdtMinted;
        tofRemaining  = tier.tofMinted >= halfSupply ? 0 : halfSupply - tier.tofMinted;
    }

    function getAdminCount() external view returns (uint256) {
        return adminList.length;
    }

    function getAdminAt(uint256 index) external view returns (address) {
        require(index < adminList.length, "Index out of bounds");
        return adminList[index];
    }

    function getAdmins(uint256 offset, uint256 limit) external view returns (address[] memory) {
        require(limit > 0, "Limit must be > 0");
        uint256 totalCount = adminList.length;
        if (offset >= totalCount) return new address[](0);
        uint256 end = offset + limit;
        if (end > totalCount) end = totalCount;
        uint256 count = end - offset;
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = adminList[offset + i];
        }
        return result;
    }

    function isAdminAddress(address account) external view returns (bool) {
        return admins[account];
    }

    function getManagerCount() external view returns (uint256) {
        return managerList.length;
    }

    function getManagerAt(uint256 index) external view returns (address) {
        require(index < managerList.length, "Index out of bounds");
        return managerList[index];
    }

    function getManagers(uint256 offset, uint256 limit) external view returns (address[] memory) {
        require(limit > 0, "Limit must be > 0");
        uint256 totalCount = managerList.length;
        if (offset >= totalCount) return new address[](0);
        uint256 end = offset + limit;
        if (end > totalCount) end = totalCount;
        uint256 count = end - offset;
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = managerList[offset + i];
        }
        return result;
    }

    function isManagerAddress(address account) external view returns (bool) {
        return managers[account];
    }

    // ================================================================
    //                       OWNER FUNCTIONS
    // ================================================================

    function configureNftaTier(
        uint256 tierId,
        uint256 price,
        uint256 dailyYield,
        uint256 maxSupply,
        bool isActive
    ) external onlyAuthorized returns (uint256 configuredTierId) {
        require(dailyYield > 0, "Yield is zero");
        require(maxSupply > 0, "MaxSupply is zero");

        configuredTierId = tierId;
        if (configuredTierId == 0) {
            configuredTierId = nextNftaTierId++;
        }

        NftaTier storage existing = nftaTiers[configuredTierId];
        uint256 preservedSupply = existing.currentSupply;

        nftaTiers[configuredTierId] = NftaTier({
            price: price,
            dailyYield: dailyYield,
            maxSupply: maxSupply,
            currentSupply: preservedSupply,
            isActive: isActive
        });

        emit NftaTierConfigured(configuredTierId, price, dailyYield, maxSupply, isActive);
    }

    function configureNftbTier(
        uint256 tierId,
        uint256 price,
        uint256 weight,
        uint256 maxSupply,
        uint256 dividendBps,
        bool isActive
    ) external onlyAuthorized returns (uint256 configuredTierId) {
        require(weight > 0, "Weight is zero");
        require(maxSupply > 0, "MaxSupply is zero");

        configuredTierId = tierId;
        if (configuredTierId == 0) {
            configuredTierId = nextNftbTierId++;
        }

        NftbTier storage existing = nftbTiers[configuredTierId];
        uint256 preservedUsdtMinted = existing.usdtMinted;
        uint256 preservedTofMinted = existing.tofMinted;

        nftbTiers[configuredTierId] = NftbTier({
            price: price,
            weight: weight,
            maxSupply: maxSupply,
            usdtMinted: preservedUsdtMinted,
            tofMinted: preservedTofMinted,
            dividendBps: dividendBps,
            isActive: isActive
        });

        emit NftbTierConfigured(configuredTierId, price, weight, maxSupply, dividendBps, isActive);
    }

    /// @notice Admin registers an NFTA purchase (off-chain payment).
    function registerNftaPurchase(address user, uint256 tierId, address referrer) external onlyAuthorized returns (uint256 nodeId) {
        require(user != address(0), "User is zero");
        NftaTier storage tier = nftaTiers[tierId];
        require(tier.isActive, "Tier inactive");
        require(tier.currentSupply < tier.maxSupply, "Tier sold out");

        _bindReferrerIfNeeded(user, referrer);

        tier.currentSupply += 1;
        nodeId = _createNftaNode(user, tierId, tier.dailyYield);

        emit NftaPurchased(user, nodeId, tierId, tier.price);
    }

    /// @notice Admin batch-registers NFTA purchases (off-chain payment).
    function batchRegisterNftaPurchase(
        address user,
        uint256 tierId,
        uint256 quantity,
        address referrer
    ) external onlyAuthorized returns (uint256 firstNodeId, uint256 lastNodeId) {
        require(user != address(0), "User is zero");
        require(quantity > 0, "Quantity is zero");

        NftaTier storage tier = nftaTiers[tierId];
        require(tier.isActive, "Tier inactive");
        require(tier.currentSupply + quantity <= tier.maxSupply, "Tier sold out");

        _bindReferrerIfNeeded(user, referrer);

        tier.currentSupply += quantity;

        for (uint256 i = 0; i < quantity; i++) {
            uint256 nodeId = _createNftaNode(user, tierId, tier.dailyYield);
            if (i == 0) {
                firstNodeId = nodeId;
            }
            lastNodeId = nodeId;
            emit NftaPurchased(user, nodeId, tierId, tier.price);
        }
    }

    function registerNftbPurchase(address user, uint256 tierId, address referrer) external onlyAuthorized returns (uint256 nodeId) {
        require(user != address(0), "User is zero");
        NftbTier storage tier = nftbTiers[tierId];
        require(tier.isActive, "Tier inactive");
        require(tier.usdtMinted + tier.tofMinted < tier.maxSupply, "Tier sold out");

        _bindReferrerIfNeeded(user, referrer);

        tier.usdtMinted += 1;   // admin registration defaults to USDT slot
        nodeId = _createNftbNode(user, tierId, tier.weight);

        emit NftbPurchased(user, nodeId, tierId, tier.price);
    }

    function fundRewardPool(uint256 amount) external onlyAuthorized {
        require(amount > 0, "Zero");
        totToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardPoolFunded(msg.sender, amount);
    }

    /**
     * @notice Distribute NFTB dividends split by tier.
     * Dividend source: daily pool burns 2.4% for NFTB dividend distribution.
     * 10% → project wallet, then split by tier dividendBps:
     *   Junior (20%), Intermediate (30%), Advanced (40%).
     * All dividends are in TOT.
     */
    function distributeNftbDividends(uint256 amount) external {
        require(msg.sender == owner() || isDistributor[msg.sender], "Not authorized");
        require(amount > 0, "Zero");

        totToken.safeTransferFrom(msg.sender, address(this), amount);

        // 10% to project wallet
        uint256 projectShare = (amount * 1000) / BASIS_POINTS;
        if (projectShare > 0) {
            totToken.safeTransfer(projectWallet, projectShare);
        }

        // Distribute to each tier by dividendBps (20%/30%/40%)
        for (uint256 tid = 1; tid < nextNftbTierId; tid++) {
            NftbTier memory tier = nftbTiers[tid];
            if (!tier.isActive || tier.dividendBps == 0) continue;

            uint256 tierWeight = totalWeightByTier[tid];
            if (tierWeight == 0) continue;

            uint256 tierShare = (amount * tier.dividendBps) / BASIS_POINTS;
            accDividendPerWeightByTier[tid] += (tierShare * ACC_PRECISION) / tierWeight;
        }

        emit DividendRoundFunded(amount, 0);
    }

    function distributeNftbUsdtDividends(uint256 amount) external {
        require(msg.sender == owner() || isDistributor[msg.sender], "Not authorized");
        require(amount > 0, "Zero");

        usdtToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 projectShare = (amount * 1000) / BASIS_POINTS;
        if (projectShare > 0) {
            usdtToken.safeTransfer(projectWallet, projectShare);
        }

        for (uint256 tid = 1; tid < nextNftbTierId; tid++) {
            NftbTier memory tier = nftbTiers[tid];
            if (!tier.isActive || tier.dividendBps == 0) continue;

            uint256 tierWeight = totalWeightByTier[tid];
            if (tierWeight == 0) continue;

            uint256 tierShare = (amount * tier.dividendBps) / BASIS_POINTS;
            accUsdtDividendPerWeightByTier[tid] += (tierShare * ACC_PRECISION) / tierWeight;
        }

        emit UsdtDividendRoundFunded(amount, 0);
    }

    /**
     * @notice Distribute prediction-platform flow (USDT) to NFTB tiers.
     * Rates are configured per tier in bps, default:
     *   - Tier1: 0.4% (40 bps)
     *   - Tier2: 0.5% (50 bps)
     *   - Tier3: 0.6% (60 bps)
     * The undistributed remainder goes to treasury.
     */
    function distributePredictionFlowUsdt(uint256 flowAmount) external {
        require(msg.sender == owner() || isDistributor[msg.sender], "Not authorized");
        require(flowAmount > 0, "Zero");

        usdtToken.safeTransferFrom(msg.sender, address(this), flowAmount);

        uint256 distributed;

        for (uint256 tid = 1; tid < nextNftbTierId; tid++) {
            NftbTier memory tier = nftbTiers[tid];
            if (!tier.isActive) continue;

            uint256 flowRateBps = predictionFlowBpsByTier[tid];
            if (flowRateBps == 0) continue;

            uint256 tierAmount = (flowAmount * flowRateBps) / BASIS_POINTS;
            if (tierAmount == 0) continue;

            uint256 tierWeight = totalWeightByTier[tid];
            if (tierWeight == 0) continue;

            accUsdtDividendPerWeightByTier[tid] += (tierAmount * ACC_PRECISION) / tierWeight;
            distributed += tierAmount;
        }

        uint256 treasuryAmount = flowAmount - distributed;
        if (treasuryAmount > 0) {
            usdtToken.safeTransfer(treasury, treasuryAmount);
        }

        emit PredictionFlowDistributed(flowAmount, distributed, treasuryAmount);
    }

    function setDistributor(address addr, bool status) external onlyOwnerOrAdmin {
        require(addr != address(0), "Zero");
        isDistributor[addr] = status;
        emit DistributorUpdated(addr, status);
    }

    function setTreasury(address addr) external onlyOwnerOrAdmin {
        require(addr != address(0), "Zero");
        treasury = addr;
        emit TreasuryUpdated(addr);
    }

    function setWallets(
        address _zeroLine,
        address _community,
        address _foundation,
        address _institution
    ) external onlyOwnerOrAdmin {
        require(
            _zeroLine != address(0) && _community != address(0)
            && _foundation != address(0) && _institution != address(0),
            "Zero address"
        );
        zeroLineWallet = _zeroLine;
        communityWallet = _community;
        foundationWallet = _foundation;
        institutionWallet = _institution;
        emit WalletsUpdated(_zeroLine, _community, _foundation, _institution);
    }

    function setProjectWallet(address addr) external onlyOwnerOrAdmin {
        require(addr != address(0), "Zero");
        projectWallet = addr;
        emit ProjectWalletUpdated(addr);
    }

    function setTofBurnBps(uint256 bps) external onlyAuthorized {
        require(bps <= BASIS_POINTS, "Too high");
        tofBurnBps = bps;
        emit TofBurnRateUpdated(bps);
    }

    function setTofClaimFeeBps(uint256 bps) external onlyAuthorized {
        require(bps <= BASIS_POINTS, "Too high");
        tofClaimFeeBps = bps;
        emit TofClaimFeeUpdated(bps);
    }

    function setTofPerUsdt(uint256 rate) external onlyAuthorized {
        require(rate > 0, "Zero");
        tofPerUsdt = rate;
        emit TofPerUsdtUpdated(rate);
    }

    function setPredictionFlowRateBps(uint256 tierId, uint256 bps) external onlyAuthorized {
        require(tierId > 0 && tierId < nextNftbTierId, "Invalid tier");
        require(bps <= BASIS_POINTS, "Too high");
        predictionFlowBpsByTier[tierId] = bps;
        emit PredictionFlowRateUpdated(tierId, bps);
    }

    function setWithdrawFeeBps(uint256 feeBps) external onlyAuthorized {
        require(feeBps <= BASIS_POINTS, "Too high");
        withdrawFeeBps = feeBps;
    }

    function setAdmin(address account, bool enabled) external onlyOwner {
        require(account != address(0), "Zero");
        bool wasAdmin = admins[account];
        admins[account] = enabled;
        
        if (enabled && !wasAdmin) {
            adminIndex[account] = adminList.length;
            adminList.push(account);
        } else if (!enabled && wasAdmin) {
            uint256 idx = adminIndex[account];
            if (idx < adminList.length - 1) {
                address lastAdmin = adminList[adminList.length - 1];
                adminList[idx] = lastAdmin;
                adminIndex[lastAdmin] = idx;
            }
            adminList.pop();
            delete adminIndex[account];
        }
        
        emit AdminUpdated(account, enabled);
    }

    function setAdmins(address[] calldata accounts_, bool[] calldata enabled_) external onlyOwner {
        uint256 len = accounts_.length;
        require(len == enabled_.length, "Length mismatch");
        for (uint256 i = 0; i < len; i++) {
            address account = accounts_[i];
            require(account != address(0), "Zero");
            bool wasAdmin = admins[account];
            admins[account] = enabled_[i];
            
            if (enabled_[i] && !wasAdmin) {
                adminIndex[account] = adminList.length;
                adminList.push(account);
            } else if (!enabled_[i] && wasAdmin) {
                uint256 idx = adminIndex[account];
                if (idx < adminList.length - 1) {
                    address lastAdmin = adminList[adminList.length - 1];
                    adminList[idx] = lastAdmin;
                    adminIndex[lastAdmin] = idx;
                }
                adminList.pop();
                delete adminIndex[account];
            }
            
            emit AdminUpdated(account, enabled_[i]);
        }
        emit AdminBatchUpdated(len);
    }

    function setManager(address account, bool enabled) external onlyOwnerOrAdmin {
        require(account != address(0), "Zero");
        bool wasManager = managers[account];
        managers[account] = enabled;
        
        if (enabled && !wasManager) {
            managerIndex[account] = managerList.length;
            managerList.push(account);
        } else if (!enabled && wasManager) {
            uint256 idx = managerIndex[account];
            if (idx < managerList.length - 1) {
                address lastManager = managerList[managerList.length - 1];
                managerList[idx] = lastManager;
                managerIndex[lastManager] = idx;
            }
            managerList.pop();
            delete managerIndex[account];
        }
        
        emit ManagerUpdated(account, enabled);
    }

    function setManagers(address[] calldata accounts_, bool[] calldata enabled_) external onlyOwnerOrAdmin {
        uint256 len = accounts_.length;
        require(len == enabled_.length, "Length mismatch");
        for (uint256 i = 0; i < len; i++) {
            address account = accounts_[i];
            require(account != address(0), "Zero");
            bool wasManager = managers[account];
            managers[account] = enabled_[i];
            
            if (enabled_[i] && !wasManager) {
                managerIndex[account] = managerList.length;
                managerList.push(account);
            } else if (!enabled_[i] && wasManager) {
                uint256 idx = managerIndex[account];
                if (idx < managerList.length - 1) {
                    address lastManager = managerList[managerList.length - 1];
                    managerList[idx] = lastManager;
                    managerIndex[lastManager] = idx;
                }
                managerList.pop();
                delete managerIndex[account];
            }
            
            emit ManagerUpdated(account, enabled_[i]);
        }
        emit ManagerBatchUpdated(len);
    }

    function setUsdtToken(address newUsdt) external onlyOwnerOrAdmin {
        require(newUsdt != address(0), "Zero");
        address oldToken = address(usdtToken);
        usdtToken = IERC20(newUsdt);
        emit UsdtTokenUpdated(oldToken, newUsdt);
    }

    /**
     * @notice Owner-only emergency operation to rebind or clear a user's referrer.
     * @dev Use newReferrer = address(0) to cut an existing referral chain.
     *      This function only updates direct referral pointers/counters.
     */
    function forceSetReferrer(address user, address newReferrer) external onlyOwner {
        require(user != address(0), "User is zero");
        require(newReferrer != user, "Self referral");

        if (newReferrer != address(0)) {
            _ensureNoReferralCycle(user, newReferrer);
        }

        address oldReferrer = accounts[user].referrer;
        if (oldReferrer == newReferrer) {
            return;
        }

        if (oldReferrer != address(0) && accounts[oldReferrer].directReferrals > 0) {
            accounts[oldReferrer].directReferrals -= 1;
        }

        accounts[user].referrer = newReferrer;

        if (newReferrer != address(0)) {
            accounts[newReferrer].directReferrals += 1;
        }

        emit ReferrerUpdated(user, oldReferrer, newReferrer);
    }

    // ================================================================
    //                      INTERNAL FUNCTIONS
    // ================================================================

    function _createNftaNode(address user, uint256 tierId, uint256 dailyYield) internal returns (uint256 nodeId) {
        uint256 today = block.timestamp / 1 days;
        if (userNftaNodes[user].length == 0 && nftaLastClaimDayByUser[user] < today) {
            nftaLastClaimDayByUser[user] = today;
        }

        nodeId = nextNodeId++;
        nftaNodes[nodeId] = NodeA({
            owner: user,
            tierId: tierId,
            dailyYield: dailyYield,
            lastClaimDay: today,
            isActive: true
        });

        userNftaNodes[user].push(nodeId);
        accounts[user].totalNodes += 1;
        _increaseUplineTeamNodes(user, 1);
    }

    function _createNftbNode(address user, uint256 tierId, uint256 weight) internal returns (uint256 nodeId) {
        nodeId = nextNodeId++;
        nftbNodes[nodeId] = NodeB({
            owner: user,
            tierId: tierId,
            weight: weight,
            rewardDebt: (weight * accDividendPerWeightByTier[tierId]) / ACC_PRECISION,
            isActive: true
        });

        usdtRewardDebtByNode[nodeId] = (weight * accUsdtDividendPerWeightByTier[tierId]) / ACC_PRECISION;

        totalWeightByTier[tierId] += weight;
        userNftbNodes[user].push(nodeId);
        accounts[user].totalNodes += 1;
        _increaseUplineTeamNodes(user, 1);
    }

    function _removeNftaNodeFromUser(address user, uint256 nodeId) internal {
        uint256[] storage nodes = userNftaNodes[user];
        uint256 length = nodes.length;

        for (uint256 i = 0; i < length; i++) {
            if (nodes[i] == nodeId) {
                nodes[i] = nodes[length - 1];
                nodes.pop();
                return;
            }
        }

        revert("Node not in owner list");
    }

    function _getHighestActiveNftaYield(address user) internal view returns (uint256 reward, uint256 rewardNodeId) {
        uint256[] storage nodes = userNftaNodes[user];
        uint256 length = nodes.length;

        for (uint256 i = 0; i < length; i++) {
            uint256 nodeId = nodes[i];
            NodeA memory node = nftaNodes[nodeId];
            if (!node.isActive || node.owner != user) continue;

            if (node.dailyYield > reward) {
                reward = node.dailyYield;
                rewardNodeId = nodeId;
            }
        }
    }

    /**
     * @dev Distribute 30% team referral commission in USDT.
     *   Gen 1 (直推):  10%
     *   Gen 2 (间推):  5%
     *   Gen 3-17:     1% each (15 generations)
     *   Total = 10% + 5% + 15×1% = 30%
     *
     * If no upline exists for a generation, that share goes to treasury.
     * @return totalDistributed  Actual USDT amount distributed.
     */
    function _distributeTeamCommission(address buyer, uint256 price) internal returns (uint256 totalDistributed) {
        address current = accounts[buyer].referrer;

        for (uint256 gen = 1; gen <= MAX_TEAM_DEPTH; gen++) {
            uint256 bps;
            if (gen == 1)      bps = 1000;   // 10%
            else if (gen == 2) bps = 500;    // 5%
            else               bps = 100;    // 1%

            uint256 share = (price * bps) / BASIS_POINTS;
            if (share == 0) continue;

            if (current != address(0)) {
                usdtToken.safeTransfer(current, share);
                accounts[current].teamCommissionEarned += share;
                emit TeamCommissionPaid(current, buyer, share, gen);
                current = accounts[current].referrer;
            } else {
                usdtToken.safeTransfer(treasury, share);
            }

            totalDistributed += share;
        }
    }

    /// @dev Same as _distributeTeamCommission but pays in TOF (for buyNftbWithTof)
    function _distributeTeamCommissionTof(address buyer, uint256 tofAmount) internal returns (uint256 totalDistributed) {
        address current = accounts[buyer].referrer;

        for (uint256 gen = 1; gen <= MAX_TEAM_DEPTH; gen++) {
            uint256 bps;
            if (gen == 1)      bps = 1000;   // 10%
            else if (gen == 2) bps = 500;    // 5%
            else               bps = 100;    // 1%

            uint256 share = (tofAmount * bps) / BASIS_POINTS;
            if (share == 0) continue;

            if (current != address(0)) {
                tofToken.safeTransfer(current, share);
                current = accounts[current].referrer;
            } else {
                tofToken.safeTransfer(treasury, share);
            }

            totalDistributed += share;
        }
    }

    function _bindReferrerIfNeeded(address user, address referrer) internal {
        if (user == owner()) {
            return;
        }

        if (accounts[user].referrer == address(0) && referrer != address(0) && referrer != user) {
            _bindReferrer(user, referrer);
        }
    }

    function _bindReferrer(address user, address referrer) internal {
        require(user != address(0), "User is zero");
        require(user != owner(), "Owner is root");
        require(referrer != address(0), "Referrer is zero");
        require(referrer != user, "Self referral");
        require(accounts[user].referrer == address(0), "Already bound");

        _ensureNoReferralCycle(user, referrer);

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

    function _ensureNoReferralCycle(address user, address referrer) internal view {
        address current = referrer;

        // Matching commission depth (17) keeps this check bounded and inexpensive.
        for (uint256 depth = 0; depth <= MAX_TEAM_DEPTH && current != address(0); depth++) {
            require(current != user, "Referral cycle");
            current = accounts[current].referrer;
        }
    }

    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {
        newImplementation;
    }
}
