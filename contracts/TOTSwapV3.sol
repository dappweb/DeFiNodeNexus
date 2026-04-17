// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TOTSwap.sol";

interface IUniswapV2RouterLike {
    function factory() external view returns (address);

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IUniswapV2FactoryLike {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2PairLike {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

contract TOTSwapV3 is TOTSwap {
    using SafeERC20 for IERC20;

    uint256 private constant V3_BASIS_POINTS = 10_000;
    uint256 private constant V3_PRICE_PRECISION = 1e18;

    address public dexRouter;
    address public dexPair;
    address public dexFactory;
    bool public externalDexEnabled;
    bool public swapPaused;
    mapping(address => bool) public admins;
    mapping(address => bool) public managers;
    uint256 public deflationPool; // TOT accumulated for deflation in external DEX mode

    event DexRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event DexPairUpdated(address indexed oldPair, address indexed newPair);
    event DexFactoryUpdated(address indexed oldFactory, address indexed newFactory);
    event ExternalDexModeUpdated(bool enabled);
    event SwapPausedUpdated(bool paused);

    function version() external pure returns (string memory) {
        return "3";
    }

    function setDexRouter(address router) external onlyOwner {
        require(router != address(0), "Zero");

        if (dexFactory != address(0)) {
            require(IUniswapV2RouterLike(router).factory() == dexFactory, "Router/factory mismatch");
        }

        address oldRouter = dexRouter;
        dexRouter = router;
        emit DexRouterUpdated(oldRouter, router);
    }

    function setDexPair(address pair) external onlyOwner {
        require(pair != address(0), "Zero");
        _validatePairMatchesTokens(pair);

        if (dexFactory != address(0)) {
            require(IUniswapV2FactoryLike(dexFactory).getPair(address(totToken), address(usdtToken)) == pair, "Factory/pair mismatch");
        }

        address oldPair = dexPair;
        dexPair = pair;
        emit DexPairUpdated(oldPair, pair);
    }

    function setDexFactory(address factory) external onlyOwner {
        require(factory != address(0), "Zero");

        if (dexPair != address(0)) {
            require(IUniswapV2FactoryLike(factory).getPair(address(totToken), address(usdtToken)) == dexPair, "Factory/pair mismatch");
        }
        if (dexRouter != address(0)) {
            require(IUniswapV2RouterLike(dexRouter).factory() == factory, "Router/factory mismatch");
        }

        address oldFactory = dexFactory;
        dexFactory = factory;
        emit DexFactoryUpdated(oldFactory, factory);
    }

    function setExternalDexEnabled(bool enabled) external onlyOwner {
        if (enabled) {
            _requireExternalDexConfigured();
        }
        externalDexEnabled = enabled;
        emit ExternalDexModeUpdated(enabled);
    }

    function setSwapPaused(bool paused) external onlyOwner {
        swapPaused = paused;
        emit SwapPausedUpdated(paused);
    }

    function getDexReserves() public view returns (uint256 totR, uint256 usdtR) {
        if (!externalDexEnabled || dexPair == address(0)) {
            return (totReserve, usdtReserve);
        }

        IUniswapV2PairLike pair = IUniswapV2PairLike(dexPair);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        address token0 = pair.token0();

        if (token0 == address(totToken)) {
            return (uint256(reserve0), uint256(reserve1));
        }
        return (uint256(reserve1), uint256(reserve0));
    }

    function getRouterConfig() external view returns (address router, address pair, address factory, bool enabled, bool paused) {
        return (dexRouter, dexPair, dexFactory, externalDexEnabled, swapPaused);
    }

    function getCurrentPrice() public view override returns (uint256) {
        if (!externalDexEnabled) {
            return super.getCurrentPrice();
        }

        (uint256 totR, uint256 usdtR) = getDexReserves();
        if (totR == 0) return 0;
        return (usdtR * V3_PRICE_PRECISION) / totR;
    }

    function quoteBuy(uint256 usdtAmount) public view override returns (uint256 totOut, uint256 fee) {
        if (!externalDexEnabled) {
            return super.quoteBuy(usdtAmount);
        }
        if (usdtAmount == 0) {
            return (0, 0);
        }

        uint256 grossTotOut = _getDexAmountsOut(usdtAmount, _buyPath());
        fee = (grossTotOut * buyFeeBps) / V3_BASIS_POINTS;
        totOut = grossTotOut - fee;
    }

    function quoteSell(uint256 totAmount) public view override returns (uint256 usdtOut, uint256 sellFee) {
        if (!externalDexEnabled) {
            return super.quoteSell(totAmount);
        }
        if (totAmount == 0) {
            return (0, 0);
        }

        sellFee = (totAmount * sellFeeBps) / V3_BASIS_POINTS;
        uint256 totAfterFee = totAmount - sellFee;
        usdtOut = _getDexAmountsOut(totAfterFee, _sellPath());
    }

    function timeUntilNextDeflation() public view override returns (uint256) {
        if (!externalDexEnabled) {
            return super.timeUntilNextDeflation();
        }
        // In external DEX mode, still respect the 4-hour interval
        uint256 nextTime = lastDeflationTime + DEFLATION_INTERVAL;
        if (block.timestamp >= nextTime) return 0;
        return nextTime - block.timestamp;
    }

    function buyTot(uint256 usdtAmount, uint256 minTotOut) public override {
        if (!externalDexEnabled) {
            super.buyTot(usdtAmount, minTotOut);
            return;
        }

        require(!swapPaused, "Swap paused");
        require(usdtAmount > 0, "Zero amount");
        _requireExternalDexConfigured();

        (uint256 quotedNetTotOut,) = quoteBuy(usdtAmount);
        require(quotedNetTotOut > 0, "Insufficient output");

        uint256 today = block.timestamp / 1 days;
        require(dailyBought[msg.sender][today] + quotedNetTotOut <= maxDailyBuy, "Daily buy limit exceeded");

        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);
        _approveExact(usdtToken, dexRouter, usdtAmount);

        uint256 minGrossTotOut = _grossUpNetAmount(minTotOut, buyFeeBps);
        uint256[] memory amounts = IUniswapV2RouterLike(dexRouter).swapExactTokensForTokens(
            usdtAmount,
            minGrossTotOut,
            _buyPath(),
            address(this),
            block.timestamp + 15 minutes
        );

        uint256 grossTotOut = amounts[amounts.length - 1];
        uint256 fee = (grossTotOut * buyFeeBps) / V3_BASIS_POINTS;
        uint256 totToUser = grossTotOut - fee;
        require(totToUser >= minTotOut, "Slippage exceeded");

        // Split fee: half to dividend pool, half to deflation pool
        uint256 deflationShare = fee / 2;
        uint256 dividendShare = fee - deflationShare;
        nftbDividendPool += dividendShare;
        deflationPool += deflationShare;

        dailyBought[msg.sender][today] += totToUser;
        userTotCost[msg.sender] += usdtAmount;
        userTotBought[msg.sender] += totToUser;

        totToken.safeTransfer(msg.sender, totToUser);
        _tryDistribute();

        emit TotBought(msg.sender, usdtAmount, totToUser, fee);
    }

    function sellTot(uint256 totAmount, uint256 minUsdtOut) public override {
        if (!externalDexEnabled) {
            super.sellTot(totAmount, minUsdtOut);
            return;
        }

        require(!swapPaused, "Swap paused");
        require(totAmount > 0, "Zero amount");
        _requireExternalDexConfigured();

        uint256 balance = totToken.balanceOf(msg.sender);
        uint256 maxSell = (balance * maxSellBps) / V3_BASIS_POINTS;
        require(totAmount <= maxSell, "Exceeds 50% of balance");

        uint256 sellFee = (totAmount * sellFeeBps) / V3_BASIS_POINTS;
        uint256 totToSwap = totAmount - sellFee;

        totToken.safeTransferFrom(msg.sender, address(this), totAmount);
        _approveExact(totToken, dexRouter, totToSwap);

        uint256 quotedUsdtOut = _getDexAmountsOut(totToSwap, _sellPath());
        uint256 quotedProfitTax = _calculateExternalProfitTaxUsdt(msg.sender, quotedUsdtOut);
        uint256 minGrossUsdtOut = minUsdtOut + quotedProfitTax;

        uint256[] memory amounts = IUniswapV2RouterLike(dexRouter).swapExactTokensForTokens(
            totToSwap,
            minGrossUsdtOut,
            _sellPath(),
            address(this),
            block.timestamp + 15 minutes
        );

        uint256 grossUsdtOut = amounts[amounts.length - 1];
        uint256 profitTax = _calculateExternalProfitTaxUsdt(msg.sender, grossUsdtOut);
        require(grossUsdtOut > profitTax, "Tax exceeds output");

        uint256 usdtOut = grossUsdtOut - profitTax;
        require(usdtOut >= minUsdtOut, "Slippage exceeded");

        // Split sell fee: half to dividend pool, half to deflation pool
        uint256 sellDeflationShare = sellFee / 2;
        uint256 sellDividendShare = sellFee - sellDeflationShare;
        nftbDividendPool += sellDividendShare;
        deflationPool += sellDeflationShare;
        nftbUsdtDividendPool += profitTax;
        _reduceCostBasis(msg.sender, totAmount);

        usdtToken.safeTransfer(msg.sender, usdtOut);
        _tryDistribute();
        _tryDistributeUsdt();

        emit TotSold(msg.sender, totAmount, usdtOut, sellFee, profitTax);
    }

    function addLiquidity(uint256 totAmount, uint256 usdtAmount) public override onlyOwner {
        if (externalDexEnabled) {
            revert("Disabled in external DEX mode");
        }
        super.addLiquidity(totAmount, usdtAmount);
    }

    function removeLiquidity(uint256 totAmount, uint256 usdtAmount) public override onlyOwner {
        if (externalDexEnabled) {
            revert("Disabled in external DEX mode");
        }
        super.removeLiquidity(totAmount, usdtAmount);
    }

    function deflate() public override {
        if (externalDexEnabled) {
            _tryDeflateExternal();
        } else {
            super.deflate();
        }
    }

    /// @notice Deflation in external DEX mode: burn half of deflationPool, other half to dividend pool.
    function _tryDeflateExternal() internal {
        if (deflationPool == 0) return;
        if (block.timestamp < lastDeflationTime + DEFLATION_INTERVAL) return;

        uint256 amount = deflationPool;
        deflationPool = 0;

        lastDeflationTime = block.timestamp;

        uint256 halfBurn = amount / 2;
        uint256 halfDividend = amount - halfBurn;

        if (halfBurn > 0) {
            totToken.safeTransfer(BURN_ADDRESS, halfBurn);
        }
        nftbDividendPool += halfDividend;

        emit Deflated(halfBurn, halfDividend, 1, block.timestamp);
    }

    function _validatePairMatchesTokens(address pair) internal view {
        IUniswapV2PairLike pairLike = IUniswapV2PairLike(pair);
        address token0 = pairLike.token0();
        address token1 = pairLike.token1();

        bool matches =
            (token0 == address(totToken) && token1 == address(usdtToken)) ||
            (token0 == address(usdtToken) && token1 == address(totToken));
        require(matches, "Pair token mismatch");
    }

    function _requireExternalDexConfigured() internal view {
        require(dexRouter != address(0), "Router not set");
        require(dexPair != address(0), "Pair not set");
    }

    function _getDexAmountsOut(uint256 amountIn, address[] memory path) internal view returns (uint256) {
        _requireExternalDexConfigured();
        uint256[] memory amounts = IUniswapV2RouterLike(dexRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }

    function _buyPath() internal view returns (address[] memory path) {
        path = new address[](2);
        path[0] = address(usdtToken);
        path[1] = address(totToken);
    }

    function _sellPath() internal view returns (address[] memory path) {
        path = new address[](2);
        path[0] = address(totToken);
        path[1] = address(usdtToken);
    }

    function _approveExact(IERC20 token, address spender, uint256 amount) internal {
        _approveOptionalReturn(token, spender, 0);
        _approveOptionalReturn(token, spender, amount);
    }

    function _approveOptionalReturn(IERC20 token, address spender, uint256 amount) private {
        (bool success, bytes memory returndata) =
            address(token).call(abi.encodeWithSelector(IERC20.approve.selector, spender, amount));
        require(success, "Approve failed");
        if (returndata.length > 0) {
            require(abi.decode(returndata, (bool)), "Approve returned false");
        }
    }

    function _isAdmin(address account) internal view override returns (bool) {
        return admins[account];
    }

    function _setAdmin(address account, bool enabled) internal override {
        admins[account] = enabled;
    }

    function _isManager(address account) internal view override returns (bool) {
        return managers[account];
    }

    function _setManager(address account, bool enabled) internal override {
        managers[account] = enabled;
    }

    function _grossUpNetAmount(uint256 netAmount, uint256 feeBps) internal pure returns (uint256) {
        if (netAmount == 0) return 0;
        uint256 denominator = V3_BASIS_POINTS - feeBps;
        return (netAmount * V3_BASIS_POINTS + denominator - 1) / denominator;
    }

    function _calculateExternalProfitTaxUsdt(address user, uint256 grossUsdtOut) internal view returns (uint256) {
        if (userTotBought[user] == 0 || userTotCost[user] == 0) return 0;

        uint256 avgPrice = (userTotCost[user] * V3_PRICE_PRECISION) / userTotBought[user];
        uint256 currentPrice = getCurrentPrice();
        if (currentPrice <= avgPrice) return 0;

        uint256 profitRatio = ((currentPrice - avgPrice) * V3_PRICE_PRECISION) / currentPrice;
        uint256 profitUsdt = (grossUsdtOut * profitRatio) / V3_PRICE_PRECISION;
        return (profitUsdt * profitTaxBps) / V3_BASIS_POINTS;
    }
}
