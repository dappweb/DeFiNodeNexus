// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
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
contract DeFiNodeNexus is Ownable {
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
        uint256 price;
        uint256 weight;
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

    IERC20 public immutable totToken;
    IERC20 public immutable tofToken;
    IERC20 public immutable usdtToken;

    // ======================== Wallets ========================

    address public treasury;            // fallback for unclaimed commission & dust
    address public zeroLineWallet;      // 0号线   10%
    address public communityWallet;     // 社区建设  10%
    address public foundationWallet;    // 基金会   10%
    address public institutionWallet;   // 机构    40%

    // ======================== State ========================

    uint256 public nextNftaTierId = 1;
    uint256 public nextNftbTierId = 1;
    uint256 public nextNodeId = 1;
    uint256 public totalNftbWeight;
    uint256 public accTotDividendPerWeight;
    uint256 public tofBurnBps = 500;           // 5% of TOF fee is burned
    uint256 public tofClaimFeeBps = 7000;      // 70% TOF fee when claiming NFTA yield

    // ======================== Mappings ========================

    mapping(uint256 => NftaTier) public nftaTiers;
    mapping(uint256 => NftbTier) public nftbTiers;
    mapping(uint256 => NodeA) public nftaNodes;
    mapping(uint256 => NodeB) public nftbNodes;
    mapping(address => uint256[]) public userNftaNodes;
    mapping(address => uint256[]) public userNftbNodes;
    mapping(address => Account) public accounts;
    mapping(uint8 => uint256) public withdrawFeeBpsByLevel;

    // ======================== Events ========================

    event ReferrerBound(address indexed user, address indexed referrer);
    event NftaTierConfigured(uint256 indexed tierId, uint256 price, uint256 dailyYield, uint256 maxSupply, bool isActive);
    event NftbTierConfigured(uint256 indexed tierId, uint256 price, uint256 weight, bool isActive);
    event NftaPurchased(address indexed user, uint256 indexed nodeId, uint256 indexed tierId, uint256 price);
    event NftbPurchased(address indexed user, uint256 indexed nodeId, uint256 indexed tierId, uint256 price);
    event NftaYieldClaimed(address indexed user, uint256 indexed nodeId, uint256 totAmount, uint256 tofConsumed);
    event NftbDividendClaimed(address indexed user, uint256 indexed nodeId, uint256 amount);
    event TeamCommissionPaid(address indexed beneficiary, address indexed buyer, uint256 amount, uint256 generation);
    event TotWithdrawn(address indexed user, uint256 totAmount, uint256 tofFee, uint256 burnedTof);
    event DividendRoundFunded(uint256 amount, uint256 newAccDividendPerWeight);
    event RewardPoolFunded(address indexed from, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);
    event WalletsUpdated(address zeroLine, address community, address foundation, address institution);
    event TofBurnRateUpdated(uint256 newBps);
    event TofClaimFeeUpdated(uint256 newBps);

    // ======================== Constructor ========================

    constructor(address _tot, address _tof, address _usdt) Ownable(msg.sender) {
        require(_tot != address(0), "TOT is zero");
        require(_tof != address(0), "TOF is zero");
        require(_usdt != address(0), "USDT is zero");

        totToken = IERC20(_tot);
        tofToken = IERC20(_tof);
        usdtToken = IERC20(_usdt);

        treasury = msg.sender;
        zeroLineWallet = msg.sender;
        communityWallet = msg.sender;
        foundationWallet = msg.sender;
        institutionWallet = msg.sender;

        // Withdraw fee by user level (TOF cost per TOT withdrawn)
        withdrawFeeBpsByLevel[0] = 1000;  // Lv0  10%
        withdrawFeeBpsByLevel[1] = 800;   // Lv1  8%
        withdrawFeeBpsByLevel[2] = 650;   // Lv2  6.5%
        withdrawFeeBpsByLevel[3] = 500;   // Lv3  5%
        withdrawFeeBpsByLevel[4] = 400;   // Lv4  4%
        withdrawFeeBpsByLevel[5] = 300;   // Lv5  3%
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
        require(userNftaNodes[msg.sender].length == 0, "Only one NFTA allowed");
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

    /**
     * @notice Claim today's NFTA yield for one node.
     * Use-it-or-lose-it: exactly 1 day's yield; missed days are forfeited.
     * Requires TOF payment (tofClaimFeeBps% of yield amount).
     */
    function claimNftaYield(uint256 nodeId) public {
        NodeA storage node = nftaNodes[nodeId];
        require(node.owner == msg.sender, "Not owner");
        require(node.isActive, "Inactive");

        uint256 today = block.timestamp / 1 days;
        require(today > node.lastClaimDay, "Already claimed today");

        uint256 reward = node.dailyYield;

        // TOF fee to claim
        uint256 tofFee = (reward * tofClaimFeeBps) / BASIS_POINTS;
        if (tofFee > 0) {
            tofToken.safeTransferFrom(msg.sender, address(this), tofFee);

            uint256 burnAmount = (tofFee * tofBurnBps) / BASIS_POINTS;
            if (burnAmount > 0) {
                tofToken.safeTransfer(BURN_ADDRESS, burnAmount);
            }
            uint256 treasuryTof = tofFee - burnAmount;
            if (treasuryTof > 0) {
                tofToken.safeTransfer(treasury, treasuryTof);
            }
        }

        node.lastClaimDay = today;
        accounts[msg.sender].pendingTot += reward;
        accounts[msg.sender].claimedTot += reward;

        emit NftaYieldClaimed(msg.sender, nodeId, reward, tofFee);
    }

    /// @notice Claim all NFTA yields for the caller. Must have enough TOF for all nodes.
    function claimAllNftaYield() external {
        uint256[] storage nodes = userNftaNodes[msg.sender];
        uint256 length = nodes.length;
        require(length > 0, "No NFTA nodes");

        uint256 today = block.timestamp / 1 days;
        for (uint256 i = 0; i < length; i++) {
            NodeA storage node = nftaNodes[nodes[i]];
            if (node.isActive && node.lastClaimDay < today) {
                claimNftaYield(nodes[i]);
            }
        }
    }

    function claimNftbDividend(uint256 nodeId) public {
        NodeB storage node = nftbNodes[nodeId];
        require(node.owner == msg.sender, "Not owner");
        require(node.isActive, "Inactive");

        uint256 accumulated = (node.weight * accTotDividendPerWeight) / ACC_PRECISION;
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

            uint256 accumulated = (node.weight * accTotDividendPerWeight) / ACC_PRECISION;
            if (accumulated > node.rewardDebt) {
                claimNftbDividend(nodes[i]);
            }
        }
    }

    /// @notice Withdraw pending TOT. Requires TOF fee based on user level.
    function withdrawTot(uint256 amount) external {
        require(amount > 0, "Zero amount");
        require(accounts[msg.sender].pendingTot >= amount, "Insufficient TOT");

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

    // ================================================================
    //                       VIEW FUNCTIONS
    // ================================================================

    /// @notice Returns 1 day's yield if claimable today, else 0.
    function pendingNftaYield(uint256 nodeId) public view returns (uint256) {
        NodeA memory node = nftaNodes[nodeId];
        if (!node.isActive || node.owner == address(0)) return 0;

        uint256 today = block.timestamp / 1 days;
        if (today <= node.lastClaimDay) return 0;

        return node.dailyYield;
    }

    function pendingNftbDividend(uint256 nodeId) public view returns (uint256) {
        NodeB memory node = nftbNodes[nodeId];
        if (!node.isActive || node.owner == address(0)) return 0;

        uint256 accumulated = (node.weight * accTotDividendPerWeight) / ACC_PRECISION;
        return accumulated - node.rewardDebt;
    }

    function getUserLevel(address user) public view returns (uint8) {
        Account memory a = accounts[user];
        if (a.directReferrals >= 50 && a.teamNodes >= 100) return 5;
        if (a.directReferrals >= 30 && a.teamNodes >= 60)  return 4;
        if (a.directReferrals >= 15 && a.teamNodes >= 30)  return 3;
        if (a.directReferrals >= 8  && a.teamNodes >= 15)  return 2;
        if (a.directReferrals >= 3  && a.teamNodes >= 5)   return 1;
        return 0;
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

    // ================================================================
    //                       OWNER FUNCTIONS
    // ================================================================

    function configureNftaTier(
        uint256 tierId,
        uint256 price,
        uint256 dailyYield,
        uint256 maxSupply,
        bool isActive
    ) external onlyOwner returns (uint256 configuredTierId) {
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

    /// @notice Admin registers an NFTA purchase (off-chain payment).
    function registerNftaPurchase(address user, uint256 tierId, address referrer) external onlyOwner returns (uint256 nodeId) {
        require(user != address(0), "User is zero");
        NftaTier storage tier = nftaTiers[tierId];
        require(tier.isActive, "Tier inactive");
        require(tier.currentSupply < tier.maxSupply, "Tier sold out");

        _bindReferrerIfNeeded(user, referrer);

        tier.currentSupply += 1;
        nodeId = _createNftaNode(user, tierId, tier.dailyYield);

        emit NftaPurchased(user, nodeId, tierId, tier.price);
    }

    function registerNftbPurchase(address user, uint256 tierId, address referrer) external onlyOwner returns (uint256 nodeId) {
        require(user != address(0), "User is zero");
        NftbTier memory tier = nftbTiers[tierId];
        require(tier.isActive, "Tier inactive");

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
        require(amount > 0, "Zero");
        totToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardPoolFunded(msg.sender, amount);
    }

    function distributeNftbDividends(uint256 amount) external onlyOwner {
        require(amount > 0, "Zero");
        require(totalNftbWeight > 0, "No weight");

        totToken.safeTransferFrom(msg.sender, address(this), amount);
        accTotDividendPerWeight += (amount * ACC_PRECISION) / totalNftbWeight;

        emit DividendRoundFunded(amount, accTotDividendPerWeight);
    }

    function setTreasury(address addr) external onlyOwner {
        require(addr != address(0), "Zero");
        treasury = addr;
        emit TreasuryUpdated(addr);
    }

    function setWallets(
        address _zeroLine,
        address _community,
        address _foundation,
        address _institution
    ) external onlyOwner {
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

    function setTofBurnBps(uint256 bps) external onlyOwner {
        require(bps <= BASIS_POINTS, "Too high");
        tofBurnBps = bps;
        emit TofBurnRateUpdated(bps);
    }

    function setTofClaimFeeBps(uint256 bps) external onlyOwner {
        require(bps <= BASIS_POINTS, "Too high");
        tofClaimFeeBps = bps;
        emit TofClaimFeeUpdated(bps);
    }

    function setWithdrawFeeBps(uint8 level, uint256 feeBps) external onlyOwner {
        require(level <= 5, "Invalid level");
        require(feeBps <= BASIS_POINTS, "Too high");
        withdrawFeeBpsByLevel[level] = feeBps;
    }

    // ================================================================
    //                      INTERNAL FUNCTIONS
    // ================================================================

    function _createNftaNode(address user, uint256 tierId, uint256 dailyYield) internal returns (uint256 nodeId) {
        nodeId = nextNodeId++;
        nftaNodes[nodeId] = NodeA({
            owner: user,
            tierId: tierId,
            dailyYield: dailyYield,
            lastClaimDay: block.timestamp / 1 days,
            isActive: true
        });

        userNftaNodes[user].push(nodeId);
        accounts[user].totalNodes += 1;
        _increaseUplineTeamNodes(user, 1);
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

    function _bindReferrerIfNeeded(address user, address referrer) internal {
        if (accounts[user].referrer == address(0) && referrer != address(0) && referrer != user) {
            _bindReferrer(user, referrer);
        }
    }

    function _bindReferrer(address user, address referrer) internal {
        require(user != address(0), "User is zero");
        require(referrer != address(0), "Referrer is zero");
        require(referrer != user, "Self referral");
        require(accounts[user].referrer == address(0), "Already bound");

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
}
