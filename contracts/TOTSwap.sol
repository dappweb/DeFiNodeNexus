// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TOTSwap
 * @dev Internal TOT/USDT swap pool with built-in business rules (Chapter 2).
 *
 * Pool:
 *   - 6% of TOT total supply seeded as initial liquidity (底池).
 *   - Constant-product AMM (x * y = k).
 *
 * Fees:
 *   - Buy  TOT: 1% fee (in TOT) → NFTB dividend pool.
 *   - Sell TOT: 5% fee (in TOT) → NFTB dividend pool.
 *   - Profit tax on sell: 10% of profit portion (in USDT) → NFTB USDT dividend pool.
 *   - Accumulated fees auto-distribute to NFTB holders every 10,000 tokens.
 *
 * Deflation (§2.3):
 *   - Every 4 hours, 0.8% of TOT reserve is removed.
 *   - Half (0.4%) burned, half (0.4%) → NFTB dividend pool.
 *   - Daily total: 4.8% deflation (2.4% burn + 2.4% NFTB dividend).
 *
 * Limits:
 *   - §2.4: Each sell ≤ 50% of sender's TOT balance.
 *   - §2.5: Each address can buy ≤ 10,000 TOT per 24 hours.
 */
contract TOTSwap is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant PRICE_PRECISION = 1e18;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ======================== Tokens ========================

    IERC20 public totToken;
    IERC20 public usdtToken;

    // ======================== AMM Reserves ========================

    uint256 public totReserve;
    uint256 public usdtReserve;

    // ======================== Fee Config ========================

    uint256 public buyFeeBps;    // 1%   buy fee
    uint256 public sellFeeBps;   // 5%   sell fee
    uint256 public profitTaxBps; // 10%  profit tax (admin adjustable)

    // ======================== NFTB Dividend Pool ========================

    uint256 public nftbDividendPool;
    uint256 public distributionThreshold; // 10,000 TOT triggers distribution

    // ======================== External Contract ========================

    address public nexus; // DeFiNodeNexus contract address

    // ======================== Deflation ========================

    uint256 public lastDeflationTime;
    uint256 public constant DEFLATION_INTERVAL = 4 hours;
    uint256 public deflationBps;       // 0.8% per 4-hour interval
    uint256 public constant MAX_DEFLATION_CATCHUP = 6; // max 6 intervals (24h) per call

    // ======================== User Tracking ========================

    /// @dev Cost basis tracking for profit tax calculation.
    mapping(address => uint256) public userTotCost;    // total USDT spent buying TOT
    mapping(address => uint256) public userTotBought;  // total TOT received from buys

    /// @dev Daily buy limit tracking.
    mapping(address => mapping(uint256 => uint256)) public dailyBought;
    uint256 public maxDailyBuy; // §2.5: 10,000 TOT per 24h

    /// @dev Sell limit: max percentage of balance per sell.
    uint256 public maxSellBps; // §2.4: 50%
    uint256 public nftbUsdtDividendPool;
    uint256 public usdtDistributionThreshold; // 10,000 USDT triggers distribution

    // ======================== Events ========================

    event TotBought(address indexed buyer, uint256 usdtIn, uint256 totOut, uint256 fee);
    event TotSold(address indexed seller, uint256 totIn, uint256 usdtOut, uint256 sellFee, uint256 profitTax);
    event Deflated(uint256 burned, uint256 toDividend, uint256 intervals, uint256 timestamp);
    event DividendsDistributed(uint256 amount);
    event UsdtDividendsDistributed(uint256 amount);
    event LiquidityAdded(uint256 totAmount, uint256 usdtAmount);
    event LiquidityRemoved(uint256 totAmount, uint256 usdtAmount);
    event NexusUpdated(address indexed newNexus);
    event AdminUpdated(address indexed account, bool enabled);
    event AdminBatchUpdated(uint256 count);
    event ManagerUpdated(address indexed account, bool enabled);
    event ManagerBatchUpdated(uint256 count);
    event UsdtTokenUpdated(address indexed oldToken, address indexed newToken);

    // ======================== Constructor ========================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _tot, address _usdt, address initialOwner) public initializer {
        require(_tot != address(0) && _usdt != address(0), "Zero address");
        require(initialOwner != address(0), "Owner is zero");

        __Ownable_init(initialOwner);

        totToken = IERC20(_tot);
        usdtToken = IERC20(_usdt);
        buyFeeBps = 100;
        sellFeeBps = 500;
        profitTaxBps = 1000;
        distributionThreshold = 10_000e18;
        usdtDistributionThreshold = 10_000e18;
        deflationBps = 80;
        maxDailyBuy = 10_000e18;
        maxSellBps = 5000;
        lastDeflationTime = block.timestamp;
    }

    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner() || _isAdmin(msg.sender), "Not admin");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner() || _isAdmin(msg.sender) || _isManager(msg.sender), "Not authorized");
        _;
    }

    function transferOwnership(address newOwner) public override {
        require(msg.sender == owner() || _isAdmin(msg.sender), "Not admin");
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _isAdmin(address account) internal view virtual returns (bool) {
        account;
        return false;
    }

    function _isManager(address account) internal view virtual returns (bool) {
        account;
        return false;
    }

    function _setAdmin(address account, bool enabled) internal virtual {
        account;
        enabled;
    }

    function _setManager(address account, bool enabled) internal virtual {
        account;
        enabled;
    }

    // ================================================================
    //                     CORE: BUY TOT
    // ================================================================

    /**
     * @notice Buy TOT with USDT.
     * @param usdtAmount  Amount of USDT to spend.
     * @param minTotOut   Minimum TOT to receive (slippage protection).
     *
     * Flow:
     *   1. Calculate TOT output via constant-product AMM.
     *   2. Deduct 1% buy fee (in TOT) → nftbDividendPool.
     *   3. Check 24h buy limit ≤ maxDailyBuy.
     *   4. Update user cost basis for profit tax tracking.
     *   5. Auto-trigger distribution & deflation if due.
     */
    function buyTot(uint256 usdtAmount, uint256 minTotOut) public virtual {
        require(usdtAmount > 0, "Zero amount");
        require(totReserve > 0 && usdtReserve > 0, "Pool empty");

        // AMM: constant product
        uint256 totOut = _getAmountOut(usdtAmount, usdtReserve, totReserve);
        require(totOut > 0, "Insufficient output");

        // 1% buy fee in TOT
        uint256 fee = (totOut * buyFeeBps) / BASIS_POINTS;
        uint256 totToUser = totOut - fee;

        require(totToUser >= minTotOut, "Slippage exceeded");

        // §2.5: 24h buy limit
        uint256 today = block.timestamp / 1 days;
        require(dailyBought[msg.sender][today] + totToUser <= maxDailyBuy, "Daily buy limit exceeded");
        dailyBought[msg.sender][today] += totToUser;

        // Pull USDT from buyer
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);

        // Update reserves
        usdtReserve += usdtAmount;
        totReserve -= totOut;

        // Fee to dividend pool
        nftbDividendPool += fee;

        // Track cost basis (for future profit tax on sell)
        userTotCost[msg.sender] += usdtAmount;
        userTotBought[msg.sender] += totToUser;

        // Transfer TOT to buyer
        totToken.safeTransfer(msg.sender, totToUser);

        // Auto maintenance
        _tryDeflate();
        _tryDistribute();

        emit TotBought(msg.sender, usdtAmount, totToUser, fee);
    }

    // ================================================================
    //                     CORE: SELL TOT
    // ================================================================

    /**
     * @notice Sell TOT for USDT.
     * @param totAmount   Amount of TOT to sell.
     * @param minUsdtOut  Minimum USDT to receive (slippage protection).
     *
     * Flow:
     *   1. Check sell ≤ 50% of sender's TOT balance.
     *   2. Deduct 5% sell fee (in TOT) → nftbDividendPool.
    *   3. Calculate profit tax on gains (10% of profit in USDT).
    *   4. Swap remaining TOT for USDT via AMM.
     *   5. Update user cost basis.
     *   6. Auto-trigger distribution & deflation if due.
     */
    function sellTot(uint256 totAmount, uint256 minUsdtOut) public virtual {
        require(totAmount > 0, "Zero amount");
        require(totReserve > 0 && usdtReserve > 0, "Pool empty");

        // §2.4: sell ≤ 50% of balance
        uint256 balance = totToken.balanceOf(msg.sender);
        uint256 maxSell = (balance * maxSellBps) / BASIS_POINTS;
        require(totAmount <= maxSell, "Exceeds 50% of balance");

        // 5% sell fee in TOT
        uint256 sellFee = (totAmount * sellFeeBps) / BASIS_POINTS;
        uint256 totToSwap = totAmount - sellFee;

        // AMM: calculate USDT output
        uint256 grossUsdtOut = _getAmountOut(totToSwap, totReserve, usdtReserve);
        require(grossUsdtOut > 0, "Insufficient output");

        // Profit tax (§2.2): 10% of profit portion in USDT
        uint256 profitTax = _calculateProfitTaxUsdt(msg.sender, grossUsdtOut);
        require(grossUsdtOut > profitTax, "Tax exceeds output");

        uint256 usdtOut = grossUsdtOut - profitTax;
        require(usdtOut >= minUsdtOut, "Slippage exceeded");

        // Pull TOT from seller
        totToken.safeTransferFrom(msg.sender, address(this), totAmount);

        // Update reserves (sell fee TOT stays outside AMM reserves; full gross USDT leaves the pool)
        totReserve += totToSwap;
        usdtReserve -= grossUsdtOut;

        // TOT fee to TOT dividend pool; USDT profit tax to USDT dividend pool
        nftbDividendPool += sellFee;
        nftbUsdtDividendPool += profitTax;

        // Reduce user cost basis proportionally
        _reduceCostBasis(msg.sender, totAmount);

        // Transfer USDT to seller
        usdtToken.safeTransfer(msg.sender, usdtOut);

        // Auto maintenance
        _tryDeflate();
        _tryDistribute();
        _tryDistributeUsdt();

        emit TotSold(msg.sender, totAmount, usdtOut, sellFee, profitTax);
    }

    // ================================================================
    //                     DEFLATION (§2.3)
    // ================================================================

    /**
     * @notice Trigger deflation if ≥ 4 hours have passed.
     *         Anyone can call this (incentivized by cheaper subsequent txs).
     *
     * Per 4-hour interval:
     *   - 0.8% of totReserve removed.
     *   - Half (0.4%) burned permanently.
     *   - Half (0.4%) added to NFTB dividend pool.
     *
     * Catches up for missed intervals (max 6 = 24 hours).
     */
    function deflate() public virtual {
        _tryDeflate();
    }

    function _tryDeflate() internal {
        if (totReserve == 0) return;
        if (block.timestamp < lastDeflationTime + DEFLATION_INTERVAL) return;

        uint256 elapsed = block.timestamp - lastDeflationTime;
        uint256 intervals = elapsed / DEFLATION_INTERVAL;
        if (intervals == 0) return;

        // Cap to prevent excessive gas usage
        if (intervals > MAX_DEFLATION_CATCHUP) {
            intervals = MAX_DEFLATION_CATCHUP;
        }

        uint256 totalBurned;
        uint256 totalDividend;

        for (uint256 i = 0; i < intervals; i++) {
            uint256 deflationAmount = (totReserve * deflationBps) / BASIS_POINTS;
            if (deflationAmount == 0) break;

            uint256 halfBurn = deflationAmount / 2;
            uint256 halfDividend = deflationAmount - halfBurn;

            totReserve -= deflationAmount;
            totalBurned += halfBurn;
            totalDividend += halfDividend;
        }

        // Update timestamp (advance by processed intervals only)
        lastDeflationTime += intervals * DEFLATION_INTERVAL;

        // Execute burn
        if (totalBurned > 0) {
            totToken.safeTransfer(BURN_ADDRESS, totalBurned);
        }

        // Accumulate to dividend pool
        nftbDividendPool += totalDividend;

        emit Deflated(totalBurned, totalDividend, intervals, block.timestamp);
    }

    // ================================================================
    //                 NFTB DIVIDEND DISTRIBUTION
    // ================================================================

    /**
     * @notice Auto-distribute accumulated fees when pool ≥ threshold.
     *         Calls DeFiNodeNexus.distributeNftbDividends(amount).
     *         Requires nexus to be set and TOT approved.
     */
    function _tryDistribute() internal {
        if (nftbDividendPool < distributionThreshold) return;
        if (nexus == address(0)) return;

        uint256 amount = nftbDividendPool;
        nftbDividendPool = 0;

        // Approve and call nexus
        totToken.approve(nexus, amount);

        // IDeFiNodeNexus(nexus).distributeNftbDividends(amount) expects
        // to pull TOT from msg.sender (this contract).
        (bool success,) = nexus.call(
            abi.encodeWithSignature("distributeNftbDividends(uint256)", amount)
        );

        if (!success) {
            // If distribution fails, return to pool for next attempt
            nftbDividendPool += amount;
            return;
        }

        emit DividendsDistributed(amount);
    }

    function _tryDistributeUsdt() internal {
        if (nftbUsdtDividendPool < usdtDistributionThreshold) return;
        if (nexus == address(0)) return;

        uint256 amount = nftbUsdtDividendPool;
        nftbUsdtDividendPool = 0;

        usdtToken.approve(nexus, amount);

        (bool success,) = nexus.call(
            abi.encodeWithSignature("distributeNftbUsdtDividends(uint256)", amount)
        );

        if (!success) {
            nftbUsdtDividendPool += amount;
            return;
        }

        emit UsdtDividendsDistributed(amount);
    }

    /// @notice Force distribution even if below threshold (owner only).
    function forceDistribute() external onlyOwnerOrAdmin {
        require(nftbDividendPool > 0 || nftbUsdtDividendPool > 0, "Pool empty");
        require(nexus != address(0), "Nexus not set");

        if (nftbDividendPool > 0) {
            uint256 amount = nftbDividendPool;
            nftbDividendPool = 0;

            totToken.approve(nexus, amount);

            (bool successTot,) = nexus.call(
                abi.encodeWithSignature("distributeNftbDividends(uint256)", amount)
            );
            require(successTot, "TOT distribution failed");

            emit DividendsDistributed(amount);
        }

        if (nftbUsdtDividendPool > 0) {
            uint256 usdtAmount = nftbUsdtDividendPool;
            nftbUsdtDividendPool = 0;

            usdtToken.approve(nexus, usdtAmount);

            (bool successUsdt,) = nexus.call(
                abi.encodeWithSignature("distributeNftbUsdtDividends(uint256)", usdtAmount)
            );
            require(successUsdt, "USDT distribution failed");

            emit UsdtDividendsDistributed(usdtAmount);
        }
    }

    // ================================================================
    //                      INTERNAL HELPERS
    // ================================================================

    /// @dev Constant-product AMM output calculation.
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256) {
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) return 0;

        uint256 numerator = amountIn * reserveOut;
        uint256 denominator = reserveIn + amountIn;
        return numerator / denominator;
    }

    /**
     * @dev Calculate profit tax for a sell.
     *
     * Steps:
     *   1. Compute user's avg buy price = userTotCost / userTotBought.
     *   2. Compute current pool price   = usdtReserve / totReserve.
     *   3. If current > avg → profit exists.
     *   4. profitRatio = (current - avg) / current.
     *   5. profitTot = totAmount × profitRatio.
     *   6. tax = profitTot × profitTaxBps / 10000.
     */
    function _calculateProfitTaxUsdt(address user, uint256 grossUsdtOut) internal view returns (uint256) {
        if (userTotBought[user] == 0 || userTotCost[user] == 0) return 0;

        // avg buy price (USDT per TOT, scaled by PRICE_PRECISION)
        uint256 avgPrice = (userTotCost[user] * PRICE_PRECISION) / userTotBought[user];

        // current price
        uint256 currentPrice = (usdtReserve * PRICE_PRECISION) / totReserve;

        // no profit → no tax
        if (currentPrice <= avgPrice) return 0;

        // profit ratio
        uint256 profitRatio = ((currentPrice - avgPrice) * PRICE_PRECISION) / currentPrice;

        // profit portion of USDT proceeds
        uint256 profitUsdt = (grossUsdtOut * profitRatio) / PRICE_PRECISION;

        // tax on profit portion in USDT
        return (profitUsdt * profitTaxBps) / BASIS_POINTS;
    }

    /// @dev Reduce user cost basis proportionally after a sell.
    function _reduceCostBasis(address user, uint256 totSold) internal {
        if (userTotBought[user] == 0) return;

        if (totSold >= userTotBought[user]) {
            // Sold more than tracked (user may have TOT from other sources)
            userTotCost[user] = 0;
            userTotBought[user] = 0;
        } else {
            uint256 costReduction = (userTotCost[user] * totSold) / userTotBought[user];
            userTotCost[user] -= costReduction;
            userTotBought[user] -= totSold;
        }
    }

    // ================================================================
    //                       VIEW FUNCTIONS
    // ================================================================

    /// @notice Current TOT price in USDT (scaled by 1e18).
    function getCurrentPrice() public view virtual returns (uint256) {
        if (totReserve == 0) return 0;
        return (usdtReserve * PRICE_PRECISION) / totReserve;
    }

    /// @notice User's average buy price (scaled by 1e18).
    function getUserAvgPrice(address user) external view returns (uint256) {
        if (userTotBought[user] == 0) return 0;
        return (userTotCost[user] * PRICE_PRECISION) / userTotBought[user];
    }

    /// @notice How much TOT the user has bought today.
    function getDailyBoughtAmount(address user) external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        return dailyBought[user][today];
    }

    /// @notice Max TOT the user can sell in a single transaction.
    function getMaxSellAmount(address user) external view returns (uint256) {
        uint256 balance = totToken.balanceOf(user);
        return (balance * maxSellBps) / BASIS_POINTS;
    }

    /// @notice Seconds until next deflation is possible.
    function timeUntilNextDeflation() public view virtual returns (uint256) {
        uint256 nextTime = lastDeflationTime + DEFLATION_INTERVAL;
        if (block.timestamp >= nextTime) return 0;
        return nextTime - block.timestamp;
    }

    /// @notice Simulated buy output (before fees).
    function quoteBuy(uint256 usdtAmount) public view virtual returns (uint256 totOut, uint256 fee) {
        totOut = _getAmountOut(usdtAmount, usdtReserve, totReserve);
        fee = (totOut * buyFeeBps) / BASIS_POINTS;
        totOut -= fee;
    }

    /// @notice Simulated sell output (before profit tax).
    function quoteSell(uint256 totAmount) public view virtual returns (uint256 usdtOut, uint256 sellFee) {
        sellFee = (totAmount * sellFeeBps) / BASIS_POINTS;
        uint256 totAfterFee = totAmount - sellFee;
        usdtOut = _getAmountOut(totAfterFee, totReserve, usdtReserve);
    }

    // ================================================================
    //                       OWNER FUNCTIONS
    // ================================================================

    /// @notice Add liquidity to the pool (owner seeds 6% TOT + matching USDT).
    function addLiquidity(uint256 totAmount, uint256 usdtAmount) public virtual onlyAuthorized {
        require(totAmount > 0 && usdtAmount > 0, "Zero");

        totToken.safeTransferFrom(msg.sender, address(this), totAmount);
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);

        totReserve += totAmount;
        usdtReserve += usdtAmount;

        emit LiquidityAdded(totAmount, usdtAmount);
    }

    /// @notice Remove liquidity (emergency, owner only).
    function removeLiquidity(uint256 totAmount, uint256 usdtAmount) public virtual onlyOwnerOrAdmin {
        require(totAmount <= totReserve && usdtAmount <= usdtReserve, "Exceeds reserve");

        totReserve -= totAmount;
        usdtReserve -= usdtAmount;

        if (totAmount > 0) totToken.safeTransfer(msg.sender, totAmount);
        if (usdtAmount > 0) usdtToken.safeTransfer(msg.sender, usdtAmount);

        emit LiquidityRemoved(totAmount, usdtAmount);
    }

    function setNexus(address _nexus) external onlyOwnerOrAdmin {
        require(_nexus != address(0), "Zero");
        nexus = _nexus;
        emit NexusUpdated(_nexus);
    }

    function setBuyFeeBps(uint256 bps) external onlyAuthorized {
        require(bps <= 1000, "Max 10%");
        buyFeeBps = bps;
    }

    function setSellFeeBps(uint256 bps) external onlyAuthorized {
        require(bps <= 2000, "Max 20%");
        sellFeeBps = bps;
    }

    function setProfitTaxBps(uint256 bps) external onlyAuthorized {
        require(bps <= 5000, "Max 50%");
        profitTaxBps = bps;
    }

    function setDistributionThreshold(uint256 threshold) external onlyAuthorized {
        require(threshold > 0, "Zero");
        distributionThreshold = threshold;
    }

    function setUsdtDistributionThreshold(uint256 threshold) external onlyAuthorized {
        require(threshold > 0, "Zero");
        usdtDistributionThreshold = threshold;
    }

    function setMaxDailyBuy(uint256 amount) external onlyAuthorized {
        maxDailyBuy = amount;
    }

    function setMaxSellBps(uint256 bps) external onlyAuthorized {
        require(bps <= BASIS_POINTS, "Too high");
        maxSellBps = bps;
    }

    function setDeflationBps(uint256 bps) external onlyAuthorized {
        require(bps <= 1000, "Max 10%");
        deflationBps = bps;
    }

    function setAdmin(address account, bool enabled) external onlyOwnerOrAdmin {
        require(account != address(0), "Zero");
        _setAdmin(account, enabled);
        emit AdminUpdated(account, enabled);
    }

    function setAdmins(address[] calldata accounts_, bool[] calldata enabled_) external onlyOwnerOrAdmin {
        uint256 len = accounts_.length;
        require(len == enabled_.length, "Length mismatch");
        for (uint256 i = 0; i < len; i++) {
            address account = accounts_[i];
            require(account != address(0), "Zero");
            _setAdmin(account, enabled_[i]);
            emit AdminUpdated(account, enabled_[i]);
        }
        emit AdminBatchUpdated(len);
    }

    function setManager(address account, bool enabled) external onlyOwnerOrAdmin {
        require(account != address(0), "Zero");
        _setManager(account, enabled);
        emit ManagerUpdated(account, enabled);
    }

    function setManagers(address[] calldata accounts_, bool[] calldata enabled_) external onlyOwnerOrAdmin {
        uint256 len = accounts_.length;
        require(len == enabled_.length, "Length mismatch");
        for (uint256 i = 0; i < len; i++) {
            address account = accounts_[i];
            require(account != address(0), "Zero");
            _setManager(account, enabled_[i]);
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

    /// @notice Emergency withdraw tokens stuck in the contract.
    function emergencyWithdraw(address token, uint256 amount) external onlyOwnerOrAdmin {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    function _authorizeUpgrade(address newImplementation) internal view override {
        require(msg.sender == owner() || _isAdmin(msg.sender), "Not admin");
        newImplementation;
    }
}
