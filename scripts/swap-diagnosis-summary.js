#!/usr/bin/env node
/**
 * Swap Failure Analysis and Diagnostic Report
 */
require("../env_conf");
const { ethers } = require("ethers");

async function main() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║        SWAP 兑换失败诊断报告 & 解决方案                      ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const RPC_URL = process.env.CNC_RPC_URL;
  const SWAP_ADDRESS = process.env.SWAP_ADDRESS;
  const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
  const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS;
  const TOT_ADDRESS = process.env.TOT_TOKEN_ADDRESS;
  const DEX_ROUTER = process.env.SWAP_DEX_ROUTER_ADDRESS;

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  const deployer = wallet.address;

  console.log("📋 诊断信息:\n");
  console.log(`账户:      ${deployer}`);
  console.log(`SWAP合约:  ${SWAP_ADDRESS}`);
  console.log(`RPC:       ${RPC_URL}\n`);

  // Diagnosis
  const SWAP_ABI = [
    "function swapPaused() public view returns (bool)",
    "function version() public view returns (string memory)",
    "function externalDexEnabled() public view returns (bool)",
    "function dexRouter() public view returns (address)",
    "function dexPair() public view returns (address)",
  ];

  const ERC20_ABI = [
    "function balanceOf(address) public view returns (uint256)",
    "function allowance(address owner, address spender) public view returns (uint256)",
  ];

  const swap = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);

  const [swapPaused, version, extDex, router, pair, usdtBal, allowance] = 
    await Promise.all([
      swap.swapPaused(),
      swap.version(),
      swap.externalDexEnabled(),
      swap.dexRouter(),
      swap.dexPair(),
      usdt.balanceOf(deployer),
      usdt.allowance(deployer, SWAP_ADDRESS),
    ]);

  console.log("🔍 检查项:\n");
  console.log(`✅ 合约版本:       ${version} (V${version})`);
  console.log(`${swapPaused ? "🚫" : "✅"} Swap状态:        ${swapPaused ? "已暂停" : "正常"}`);
  console.log(`${extDex ? "✅" : "❌"} 外部DEX:        ${extDex ? "启用" : "禁用"}`);
  console.log(`✅ DEX路由:        ${router !== ethers.ZeroAddress ? "已配置" : "未配置"}`);
  console.log(`✅ DEX对:          ${pair !== ethers.ZeroAddress ? "已配置" : "未配置"}`);
  console.log(`✅ USDT余额:      ${ethers.formatUnits(usdtBal, 18)} USDT`);
  console.log(`✅ USDT授权:      ${ethers.formatUnits(allowance, 18)} USDT\n`);

  // Problems detected
  console.log("💡 问题分析:\n");
  
  let issues = [];
  
  if (swapPaused) {
    issues.push({
      issue: "Swap已暂停",
      severity: "CRITICAL",
      fix: "合约所有者需要调用 setSwapPaused(false) 来恢复"
    });
  }

  if (!extDex) {
    issues.push({
      issue: "外部DEX未启用",
      severity: "CRITICAL",
      fix: "合约所有者需要调用 setExternalDexEnabled(true)"
    });
  }

  if (router === ethers.ZeroAddress) {
    issues.push({
      issue: "DEX路由未配置",
      severity: "CRITICAL",
      fix: "合约所有者需要调用 setDexRouter(0x...)"
    });
  }

  if (pair === ethers.ZeroAddress) {
    issues.push({
      issue: "DEX对未配置",
      severity: "CRITICAL",
      fix: "合约所有者需要调用 setDexPair(0x...)"
    });
  }

  if (usdtBal < ethers.parseUnits("0.1", 18)) {
    issues.push({
      issue: "USDT余额不足",
      severity: "HIGH",
      fix: `需要至少 0.1 USDT，当前: ${ethers.formatUnits(usdtBal, 18)}`
    });
  }

  if (allowance < ethers.parseUnits("0.1", 18)) {
    issues.push({
      issue: "USDT授权不足",
      severity: "HIGH",
      fix: "运行: pnpm exec node scripts/test-usdt-transfer.js 来授权"
    });
  }

  if (issues.length === 0) {
    console.log("✅ 所有检查通过 - 配置看起来正常\n");
    console.log("⚠️  但交易仍然失败，这可能是:\n");
    console.log("  1. 智能合约内部的问题");
    console.log("  2. RPC端点的问题");
    console.log("  3. Gas估算问题\n");
  } else {
    console.log(`⚠️  检测到 ${issues.length} 个问题:\n`);
    issues.forEach((item, idx) => {
      console.log(`${idx + 1}. [${item.severity}] ${item.issue}`);
      console.log(`   修复: ${item.fix}\n`);
    });
  }

  // Known issue from commits
  console.log("📌 已知问题 (从最近的提交):\n");
  console.log("根据代码历史，最近有多个Approve相关的修复:");
  console.log("- Fix: approve reset-to-0 before re-approve (Tether-style USDT)");
  console.log("- Fix: catch getWithdrawTofFee revert");
  console.log("- Fix: use viem walletClient.writeContract for approve\n");

  console.log("💬 建议的解决方案:");
  console.log("1. 清空allowance然后重新approve:");
  console.log("   pnpm exec node scripts/test-usdt-transfer.js\n");
  console.log("2. 使用前端界面而不是直接脚本:\n");
  console.log("   - 访问 https://truth-oracle.example.com (实际地址)\n");
  console.log("3. 如果仍然失败，检查:");
  console.log("   - 浏览器控制台的错误信息");
  console.log("   - 钱包连接状态");
  console.log("   - 网络选择是否正确\n");

  console.log("📊 诊断脚本:");
  console.log("- scripts/test-swap-contract.js    : 测试合约接口");
  console.log("- scripts/check-dex-config.js      : 检查DEX配置");
  console.log("- scripts/test-dex-router.js       : 测试DEX路由");
  console.log("- scripts/test-usdt-transfer.js    : 测试USDT转账");
  console.log("- scripts/full-swap-diagnosis.js  : 完整诊断\n");

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║           请运行诊断脚本来获取更详细的信息                      ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
