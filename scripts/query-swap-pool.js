const hre = require("hardhat");

async function main() {
  const provider = hre.ethers.provider;
  const SWAP_ADDRESS = "0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC";
  
  console.log("📊 TOTSwap 流动性池查询");
  console.log("═══════════════════════════════════════════\n");
  
  // 检查合约是否存在
  const code = await provider.getCode(SWAP_ADDRESS);
  if (code === "0x") {
    console.log("❌ TOTSwap 合约未部署");
    return;
  }
  
  console.log(`✅ TOTSwap 合约存在`);
  console.log(`地址: ${SWAP_ADDRESS}\n`);
  
  // 获取合约 ABI
  const swapFactory = await hre.ethers.getContractFactory("TOTSwapV3");
  const swap = new hre.ethers.Contract(SWAP_ADDRESS, swapFactory.interface, provider);
  
  try {
    // 查询池子信息
    const totReserve = await swap.totReserve.staticCall();
    const usdtReserve = await swap.usdtReserve.staticCall();
    
    console.log("💧 流动性池储备量");
    console.log("─────────────────────────────────────────────");
    console.log(`TOT 储备:  ${hre.ethers.formatUnits(totReserve, 18).padStart(15)} TOT`);
    console.log(`USDT 储备: ${hre.ethers.formatUnits(usdtReserve, 6).padStart(15)} USDT`);
    
    // 计算流动性价值（以 USDT 计）
    const totReserveUSD = Number(usdtReserve) / Number(10**6); // USDT 转换为数值
    console.log(`\n💰 流动性总值: ${totReserveUSD.toFixed(2)} USD（基于 USDT 储备）`);
    
    // 计算价格
    if (totReserve > 0n && usdtReserve > 0n) {
      const pricePerTOT = Number(usdtReserve * BigInt(10**12)) / Number(totReserve); // 调整精度
      console.log(`\n📈 价格信息`);
      console.log("─────────────────────────────────────────────");
      console.log(`TOT 价格: ${pricePerTOT.toFixed(6)} USDT/TOT`);
      console.log(`USDT 价格: ${(1 / pricePerTOT).toFixed(6)} TOT/USDT`);
    }
    
    // 查询配置参数
    console.log(`\n⚙️ 池子配置`);
    console.log("─────────────────────────────────────────────");
    
    try {
      const maxDailyBuy = await swap.maxDailyBuy.staticCall();
      console.log(`最大日购限额: ${hre.ethers.formatUnits(maxDailyBuy, 18)} TOT`);
    } catch (e) {
      // 可能没有此字段
    }
    
    try {
      const buyFeeRate = await swap.buyFeeRate.staticCall();
      console.log(`买入费率: ${buyFeeRate}%`);
    } catch (e) {
      // 可能没有此字段
    }
    
    try {
      const sellFeeRate = await swap.sellFeeRate.staticCall();
      console.log(`卖出费率: ${sellFeeRate}%`);
    } catch (e) {
      // 可能没有此字段
    }
    
  } catch (e) {
    console.log(`\n⚠️  合约调用失败`);
    console.log(`错误: ${e.message.split('\n')[0]}`);
  }
}

main().catch(console.error);
