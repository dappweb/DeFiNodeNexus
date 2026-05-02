const hre = require("hardhat");

async function main() {
  const provider = hre.ethers.provider;
  const TOT_ADDRESS = "0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA";
  
  console.log("📊 TOT 代币详细分布分析");
  console.log("═══════════════════════════════════════════\n");
  
  // 获取当前块和网络信息
  const currentBlock = await provider.getBlockNumber();
  console.log(`当前区块: ${currentBlock}`);
  console.log(`开始扫描整个合约历史...\n`);
  
  // 从最早开始扫描
  const transferTopic = hre.ethers.id("Transfer(address,address,uint256)");
  const iface = hre.ethers.Interface.from([
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ]);
  
  // 分段查询以避免超出限制
  const STEP = 50000;
  const balances = {};
  let totalEvents = 0;
  
  for (let startBlock = 0; startBlock < currentBlock; startBlock += STEP) {
    const endBlock = Math.min(startBlock + STEP - 1, currentBlock);
    
    try {
      const logs = await provider.getLogs({
        address: TOT_ADDRESS,
        topics: [transferTopic],
        fromBlock: startBlock,
        toBlock: endBlock
      });
      
      totalEvents += logs.length;
      
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
          // 忽略
        }
      }
      
      if (logs.length > 0) {
        console.log(`  块 ${startBlock.toString().padStart(7)}-${endBlock.toString().padStart(7)}: ${logs.length} 个事件`);
      }
    } catch (e) {
      console.log(`  块 ${startBlock}-${endBlock}: 查询失败`);
    }
  }
  
  console.log(`\n✅ 总事件数: ${totalEvents}\n`);
  
  // 分析余额
  const holders = Object.entries(balances)
    .filter(([_, bal]) => bal > 0n)
    .sort((a, b) => Number(b[1] - a[1]));
  
  console.log("🏆 完整持有人分布");
  console.log("─────────────────────────────────────────────");
  
  let totalSupply = 0n;
  for (const [_, bal] of holders) {
    totalSupply += bal;
  }
  
  // 计算 TOP 10
  let top10Total = 0n;
  for (let i = 0; i < Math.min(10, holders.length); i++) {
    top10Total += holders[i][1];
  }
  
  console.log(`排名 | 地址 | 余额 (TOT) | 占比`);
  console.log("─────────────────────────────────────────────");
  
  for (let i = 0; i < Math.min(20, holders.length); i++) {
    const [addr, balance] = holders[i];
    const pct = totalSupply > 0n ? Number(balance * 10000n / totalSupply) / 100 : 0;
    
    console.log(`${String(i + 1).padStart(3)} | ${addr.slice(0, 6)}...${addr.slice(-4)} | ${hre.ethers.formatUnits(balance, 18).padStart(10)} | ${pct.toFixed(2)}%`);
  }
  
  console.log("─────────────────────────────────────────────");
  console.log(`\n📊 统计数据:`);
  console.log(`  • 持有者总数: ${holders.length}`);
  console.log(`  • 总流通量: ${hre.ethers.formatUnits(totalSupply, 18)} TOT`);
  if (holders.length > 0) {
    console.log(`  • TOP 10 占比: ${(Number(top10Total) * 100 / Number(totalSupply)).toFixed(2)}%`);
  }
  console.log(`  • 扫描块范围: 0 ~ ${currentBlock}`);
}

main().catch(console.error);
