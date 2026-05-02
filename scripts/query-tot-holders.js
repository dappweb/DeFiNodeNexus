const hre = require("hardhat");

async function main() {
  console.log("📊 CNC 链上 TOT 代币持有人分布");
  console.log("═══════════════════════════════════════════");
  
  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();
  
  console.log(`网络: ${network.name} (${network.chainId})`);
  console.log("");
  
  const TOT_ADDRESS = "0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA";
  const code = await provider.getCode(TOT_ADDRESS);
  
  if (code === "0x") {
    console.log(`❌ TOT 合约未部署于 ${TOT_ADDRESS}`);
    console.log("\n系统信息：");
    console.log(`  • 当前网络: ${network.name}`);
    console.log(`  • 链 ID: ${network.chainId}`);
    console.log("\n可能原因：");
    console.log("  1. 代币未在该链上实际部署");
    console.log("  2. 地址配置不正确");
    console.log("  3. 使用了本地测试网络（Hardhat）而非实际链");
    return;
  }
  
  console.log(`✅ TOT 合约存在`);
  
  // 查询 Transfer 事件
  const erc20ABI = [
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ];
  
  const iface = hre.ethers.Interface.from(erc20ABI);
  
  console.log("\n📡 扫描 Transfer 事件...");
  const currentBlock = await provider.getBlockNumber();
  const scanRange = 100000;
  const startBlock = Math.max(0, currentBlock - scanRange);
  
  console.log(`扫描块范围: ${startBlock} ~ ${currentBlock}`);
  
  const transferTopic = hre.ethers.id("Transfer(address,address,uint256)");
  const logs = await provider.getLogs({
    address: TOT_ADDRESS,
    topics: [transferTopic],
    fromBlock: startBlock,
    toBlock: currentBlock
  });
  
  console.log(`✅ 发现 ${logs.length} 个 Transfer 事件\n`);
  
  // 追踪余额
  const balances = {};
  
  for (const log of logs) {
    try {
      const parsed = iface.parseLog(log);
      const from = parsed.args[0];
      const to = parsed.args[1];
      const value = parsed.args[2];
      
      if (from !== hre.ethers.ZeroAddress) {
        balances[from] = (balances[from] || 0n) - value;
      }
      if (to !== hre.ethers.ZeroAddress) {
        balances[to] = (balances[to] || 0n) + value;
      }
    } catch (e) {
      // 忽略解析错误
    }
  }
  
  // 获取正余额的持有者
  const holders = Object.entries(balances)
    .filter(([_, bal]) => bal > 0n)
    .sort((a, b) => Number(b[1] - a[1]));
  
  console.log("🏆 TOT 代币持有人分布 TOP 30");
  console.log("─────────────────────────────────────────────");
  console.log(`排名 | 地址 | 余额 (TOT)`);
  console.log("─────────────────────────────────────────────");
  
  let totalHeld = 0n;
  for (let i = 0; i < Math.min(30, holders.length); i++) {
    const [addr, balance] = holders[i];
    totalHeld += balance;
    const formatted = hre.ethers.formatUnits(balance, 18);
    console.log(`${String(i + 1).padStart(3)} | ${addr.slice(0, 6)}...${addr.slice(-4)} | ${formatted.padStart(15)}`);
  }
  
  console.log("─────────────────────────────────────────────");
  console.log(`\n📊 统计信息:`);
  console.log(`  • 总持有者数: ${holders.length}`);
  console.log(`  • TOP 30 总持量: ${hre.ethers.formatUnits(totalHeld, 18)} TOT`);
  console.log(`  • 事件扫描范围: ${startBlock} ~ ${currentBlock}`);
}

main().catch(console.error);
