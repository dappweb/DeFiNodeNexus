// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
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
 *   - Profit tax on sell: 10% of profit portion (in TOT) → NFTB dividend pool.
 *   - Accumulated fees auto-distribute to NFTB holders every 10,000 TOT.
 *
 * Deflation (§2.3):
 *   - Every 4 hours, 0.8% of TOT reserve is removed.
 *   - Half (0.4%) burned, half (0.4%) → NFTB dividend pool.
 *   - Daily total: 4.8% deflation (2.4% burn + 2.4% NFTB dividend).
 *
 * Limits:
 *   - §2.4: Each sell ≤ 50% of sender's TOT balance.
 *   - §2.5: Each address can buy ≤ 100,000 TOT per 24 hours.
 */
contract TOTSwap is Ownable {
    using SafeERC20 for IERC20;

    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant PRICE_PRECISION = 1e18;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ======================== Tokens ========================

    IERC20 public immutable totToken;
    IERC20 public immutable usdtToken;

    // ======================== AMM Reserves ========================

    uint256 public totReserve;
    uint256 public usdtReserve;

    // ======================== Fee Config ========================

    uint256 public buyFeeBps  = 100;    // 1%   buy fee
    uint256 public sellFeeBps = 500;    // 5%   sell fee
    uint256 public profitTaxBps = 1000; // 10%  profit tax (admin adjustable)

    // ======================== NFTB Dividend Pool ========================

    uint256 public nftbDividendPool;
    uint256 public distributionThreshold = 10_000e18; // 10,000 TOT triggers distribution

    // ======================== External Contract ========================

    address public nexus; // DeFiNodeNexus contract address

    // ======================== Deflation ========================

    uint256 public lastDeflationTime;
    uint256 public constant DEFLATION_INTERVAL = 4 hours;
    uint256 public deflationBps = 80;       // 0.8% per 4-hour interval
    uint256 public constant MAX_DEFLATION_CATCHUP = 6; // max 6 intervals (24h) per call

    // ======================== User Tracking ========================

    /// @dev Cost basis tracking for profit tax calculation.
    mapping(address => uint256) public userTotCost;    // total USDT spent buying TOT
    mapping(address => uint256) public userTotBought;  // total TOT received from buys

    /// @dev Daily buy limit tracking.
    mapping(address => mapping(uint256 => uint256)) public dailyBought;
    uint256 public maxDailyBuy = 100_000e18; // §2.5: 100,000 TOT per 24h

    /// @dev Sell limit: max percentage of balance per sell.
    uint256 public maxSellBps = 5000; // §2.4: 50%

    // ======================== Events ========================

    event TotBought(address indexed buyer, uint256 usdtIn, uint256 totOut, uint256 fee);
    event TotSold(address indexed seller, uint256 totIn, uint256 usdtOut, uint256 sellFee, uint256 profitTax);
    event Deflated(uint256 burned, uint256 toDividend, uint256 intervals, uint256 timestamp);
    event DividendsDistributed(uint256 amount);
    event LiquidityAdded(uint256 totAmount, uint256 usdtAmount);
    event LiquidityRemoved(uint256 totAmount, uint256 usdtAmount);
    event NexusUpdated(address indexed newNexus);

    // ======================== Constructor ========================

    constructor(address _tot, address _usdt) Ownable(msg.sender) {
        require(_tot != address(0) && _usdt != address(0), "Zero address");
        totToken = IERC20(_tot);
        usdtToken = IERC20(_usdt);
        lastDeflationTime = block.timestamp;
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
     *   3. Check 24h buy limit ≤ 100,000 TOT.
     *   4. Update user cost basis for profit tax tracking.
     *   5. Auto-trigger distribution & deflation if due.
     */
    function buyTot(uint256 usdtAmount, uint256 minTotOut) external {
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
     *   3. Calculate profit tax on gains (10% of profit in TOT).
     *   4. Swap remaining TOT for USDT via AMM.
     *   5. Update user cost basis.
     *   6. Auto-trigger distribution & deflation if due.
     */
    function sellTot(uint256 totAmount, uint256 minUsdtOut) external {
        require(totAmount > 0, "Zero amount");
        require(totReserve > 0 && usdtReserve > 0, "Pool empty");

        // §2.4: sell ≤ 50% of balance
        uint256 balance = totToken.balanceOf(msg.sender);
        uint256 maxSell = (balance * maxSellBps) / BASIS_POINTS;
        require(totAmount <= maxSell, "Exceeds 50% of balance");

        // 5% sell fee in TOT
        uint256 sellFee = (totAmount * sellFeeBps) / BASIS_POINTS;
        uint256 totAfterFee = totAmount - sellFee;

        // Profit tax (§2.2): 10% of profit portion in TOT
        uint256 profitTax = _calculateProfitTax(msg.sender, totAfterFee);
        uint256 totToSwap = totAfterFee - profitTax;

        // AMM: calculate USDT output
        uint256 usdtOut = _getAmountOut(totToSwap, totReserve, usdtReserve);
        require(usdtOut > 0, "Insufficient output");
        require(usdtOut >= minUsdtOut, "Slippage exceeded");

        // Pull TOT from seller
        totToken.safeTransferFrom(msg.sender, address(this), totAmount);

        // Update reserves (only the swapped portion enters the pool)
        totReserve += totToSwap;
        usdtReserve -= usdtOut;

        // Fees + profitTax to dividend pool
        nftbDividendPool += sellFee + profitTax;

        // Reduce user cost basis proportionally
        _reduceCostBasis(msg.sender, totAmount);

        // Transfer USDT to seller
        usdtToken.safeTransfer(msg.sender, usdtOut);

        // Auto maintenance
        _tryDeflate();
        _tryDistribute();

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
    function deflate() external {
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

    /// @notice Force distribution even if below threshold (owner only).
    function forceDistribute() external onlyOwner {
        require(nftbDividendPool > 0, "Pool empty");
        require(nexus != address(0), "Nexus not set");

        uint256 amount = nftbDividendPool;
        nftbDividendPool = 0;

        totToken.approve(nexus, amount);

        (bool success,) = nexus.call(
            abi.encodeWithSignature("distributeNftbDividends(uint256)", amount)
        );
        require(success, "Distribution failed");

        emit DividendsDistributed(amount);
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
    function _calculateProfitTax(
        address user,
        uint256 totAmount
    ) internal view returns (uint256) {
        if (userTotBought[user] == 0 || userTotCost[user] == 0) return 0;

        // avg buy price (USDT per TOT, scaled by PRICE_PRECISION)
        uint256 avgPrice = (userTotCost[user] * PRICE_PRECISION) / userTotBought[user];

        // current price
        uint256 currentPrice = (usdtReserve * PRICE_PRECISION) / totReserve;

        // no profit → no tax
        if (currentPrice <= avgPrice) return 0;

        // profit ratio
        uint256 profitRatio = ((currentPrice - avgPrice) * PRICE_PRECISION) / currentPrice;

        // profit portion of TOT being sold
        uint256 profitTot = (totAmount * profitRatio) / PRICE_PRECISION;

        // 10% tax on profit portion
        return (profitTot * profitTaxBps) / BASIS_POINTS;
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
    function getCurrentPrice() external view returns (uint256) {
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
    function timeUntilNextDeflation() external view returns (uint256) {
        uint256 nextTime = lastDeflationTime + DEFLATION_INTERVAL;
        if (block.timestamp >= nextTime) return 0;
        return nextTime - block.timestamp;
    }

    /// @notice Simulated buy output (before fees).
    function quoteBuy(uint256 usdtAmount) external view returns (uint256 totOut, uint256 fee) {
        totOut = _getAmountOut(usdtAmount, usdtReserve, totReserve);
        fee = (totOut * buyFeeBps) / BASIS_POINTS;
        totOut -= fee;
    }

    /// @notice Simulated sell output (before profit tax).
    function quoteSell(uint256 totAmount) external view returns (uint256 usdtOut, uint256 sellFee) {
        sellFee = (totAmount * sellFeeBps) / BASIS_POINTS;
        uint256 totAfterFee = totAmount - sellFee;
        usdtOut = _getAmountOut(totAfterFee, totReserve, usdtReserve);
    }

    // ================================================================
    //                       OWNER FUNCTIONS
    // ================================================================

    /// @notice Add liquidity to the pool (owner seeds 6% TOT + matching USDT).
    function addLiquidity(uint256 totAmount, uint256 usdtAmount) external onlyOwner {
        require(totAmount > 0 && usdtAmount > 0, "Zero");

        totToken.safeTransferFrom(msg.sender, address(this), totAmount);
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);

        totReserve += totAmount;
        usdtReserve += usdtAmount;

        emit LiquidityAdded(totAmount, usdtAmount);
    }

    /// @notice Remove liquidity (emergency, owner only).
    function removeLiquidity(uint256 totAmount, uint256 usdtAmount) external onlyOwner {
        require(totAmount <= totReserve && usdtAmount <= usdtReserve, "Exceeds reserve");

        totReserve -= totAmount;
        usdtReserve -= usdtAmount;

        if (totAmount > 0) totToken.safeTransfer(msg.sender, totAmount);
        if (usdtAmount > 0) usdtToken.safeTransfer(msg.sender, usdtAmount);

        emit LiquidityRemoved(totAmount, usdtAmount);
    }

    function setNexus(address _nexus) external onlyOwner {
        require(_nexus != address(0), "Zero");
        nexus = _nexus;
        emit NexusUpdated(_nexus);
    }

    function setBuyFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        buyFeeBps = bps;
    }

    function setSellFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 2000, "Max 20%");
        sellFeeBps = bps;
    }

    function setProfitTaxBps(uint256 bps) external onlyOwner {
        require(bps <= 5000, "Max 50%");
        profitTaxBps = bps;
    }

    function setDistributionThreshold(uint256 threshold) external onlyOwner {
        require(threshold > 0, "Zero");
        distributionThreshold = threshold;
    }

    function setMaxDailyBuy(uint256 amount) external onlyOwner {
        maxDailyBuy = amount;
    }

    function setMaxSellBps(uint256 bps) external onlyOwner {
        require(bps <= BASIS_POINTS, "Too high");
        maxSellBps = bps;
    }

    function setDeflationBps(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        deflationBps = bps;
    }

    /// @notice Emergency withdraw tokens stuck in the contract.
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
