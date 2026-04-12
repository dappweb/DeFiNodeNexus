const hre = require("hardhat");

async function verifyDeploy() {
  const nexusAddr = "0xE4536231F8aA8589dc83a53797c8d412B9a0957B";
  const swapAddr = "0xbb90415bb460E11Bf64014a7f333A3733ab5b06b";

  console.log("=== 部署验证 ===\n");

  // Verify NEXUS
  const nexus = await hre.ethers.getContractAt("DeFiNodeNexus", nexusAddr);
  const owner = await nexus.owner();
  
  console.log("✅ DeFiNodeNexus:");
  console.log("   地址:", nexusAddr);
  console.log("   Owner:", owner);

  // Verify NFTA Tiers
  const tier1 = await nexus.nftaTiers(1);
  const tier2 = await nexus.nftaTiers(2);
  console.log("\n✅ NFTA 节点配置:");
  console.log("   Tier 1:", hre.ethers.formatUnits(tier1.price, 18), "USDT, 日息", hre.ethers.formatUnits(tier1.dailyYield, 18), "TOT, 上限", tier1.maxSupply.toString());
  console.log("   Tier 2:", hre.ethers.formatUnits(tier2.price, 18), "USDT, 日息", hre.ethers.formatUnits(tier2.dailyYield, 18), "TOT, 上限", tier2.maxSupply.toString());

  // Verify NFTB Tiers
  const btier1 = await nexus.nftbTiers(1);
  const btier2 = await nexus.nftbTiers(2);
  const btier3 = await nexus.nftbTiers(3);
  console.log("\n✅ NFTB 节点配置:");
  console.log("   Tier 1:", hre.ethers.formatUnits(btier1.price, 18), "USDT, 权重", btier1.weight.toString(), ", 分红", btier1.dividendBps.toString(), "bps");
  console.log("   Tier 2:", hre.ethers.formatUnits(btier2.price, 18), "USDT, 权重", btier2.weight.toString(), ", 分红", btier2.dividendBps.toString(), "bps");  
  console.log("   Tier 3:", hre.ethers.formatUnits(btier3.price, 18), "USDT, 权重", btier3.weight.toString(), ", 分红", btier3.dividendBps.toString(), "bps");

  // Verify SWAP
  const swap = await hre.ethers.getContractAt("TOTSwapV3", swapAddr);
  const swapOwner = await swap.owner();
  const nexusLinked = await swap.nexus();
  console.log("\n✅ TOTSwap配置:");
  console.log("   地址:", swapAddr);
  console.log("   Owner:", swapOwner);
  console.log("   Nexus 链接:", nexusLinked);
  
  console.log("\n✅ 部署验证完成！");
}

verifyDeploy().catch(e => console.error(e));
