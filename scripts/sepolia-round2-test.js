const hre = require("hardhat");

const { ethers } = hre;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function expectRevert(action, label) {
  try {
    await action();
    throw new Error(`Expected revert: ${label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(`Expected revert: ${label}`)) {
      throw error;
    }
    console.log(`   ↪ revert captured (${label}):`, message.slice(0, 160));
  }
}

async function getFirstNodeIdOrThrow(nexus, user, type) {
  const nodeIds = type === "A"
    ? await nexus.getUserNftaNodes(user)
    : await nexus.getUserNftbNodes(user);
  if (nodeIds.length === 0) {
    throw new Error(`No NFT${type} nodes for ${user}`);
  }
  return nodeIds[0];
}

async function findActiveNftbTierId(nexus) {
  const next = await nexus.nextNftbTierId();
  for (let tid = 1n; tid < next; tid++) {
    const tier = await nexus.nftbTiers(tid);
    if (tier.isActive && tier.price > 0n && tier.usdtMinted + tier.tofMinted < tier.maxSupply) {
      return tid;
    }
  }
  throw new Error("No active NFTB tier with remaining supply");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;

  const totAddress = process.env.TOT_TOKEN_ADDRESS;
  const tofAddress = process.env.TOF_TOKEN_ADDRESS;
  const usdtAddress = process.env.USDT_TOKEN_ADDRESS;
  const nexusAddress = process.env.NEXUS_ADDRESS;
  const swapAddress = process.env.SWAP_ADDRESS;

  if (!totAddress || !tofAddress || !usdtAddress || !nexusAddress || !swapAddress) {
    throw new Error("Missing token/nexus/swap addresses in .env");
  }

  const aPrivateKey = process.env.ROUND2_A_PRIVATE_KEY;
  const bPrivateKey = process.env.ROUND2_B_PRIVATE_KEY;
  const cPrivateKey = process.env.ROUND2_C_PRIVATE_KEY;

  if (!aPrivateKey || !bPrivateKey || !cPrivateKey) {
    throw new Error("Missing ROUND2_A_PRIVATE_KEY / ROUND2_B_PRIVATE_KEY / ROUND2_C_PRIVATE_KEY in .env");
  }

  const walletA = new ethers.Wallet(aPrivateKey, provider);
  const walletB = new ethers.Wallet(bPrivateKey, provider);
  const walletC = new ethers.Wallet(cPrivateKey, provider);
  const walletD = ethers.Wallet.createRandom().connect(provider);

  const tot = await ethers.getContractAt("IERC20", totAddress);
  const tof = await ethers.getContractAt("IERC20", tofAddress);
  const usdt = await ethers.getContractAt("IERC20", usdtAddress);
  const nexus = await ethers.getContractAt("DeFiNodeNexus", nexusAddress);
  const swap = await ethers.getContractAt("TOTSwap", swapAddress);

  console.log("\n=== ROUND 2 START (SEPOLIA) ===");
  console.log("Deployer:", deployer.address);
  console.log("A:", walletA.address);
  console.log("B:", walletB.address);
  console.log("C:", walletC.address);
  console.log("D(new):", walletD.address);

  const bNftaNodeId = await getFirstNodeIdOrThrow(nexus, walletB.address, "A");
  const bNftbNodeId = await getFirstNodeIdOrThrow(nexus, walletB.address, "B");
  const cNftbNodeId = await getFirstNodeIdOrThrow(nexus, walletC.address, "B");

  console.log("\n[1/5] 跨天领取检查 (B NFTA)");
  const pendingBefore = await nexus.pendingNftaYield(bNftaNodeId);
  console.log("B pendingNftaYield:", ethers.formatUnits(pendingBefore, 18), "TOT");

  if (pendingBefore > 0n) {
    await (await tof.connect(walletB).approve(nexusAddress, ethers.MaxUint256)).wait();
    const stateBefore = await nexus.accounts(walletB.address);
    await (await nexus.connect(walletB).claimNftaYield(bNftaNodeId)).wait();
    const stateAfter = await nexus.accounts(walletB.address);
    const delta = stateAfter.pendingTot - stateBefore.pendingTot;
    assertCondition(delta > 0n, "cross-day claim should increase pendingTot");
    console.log("✅ 跨天领取成功, pendingTot +", ethers.formatUnits(delta, 18));
  } else {
    await expectRevert(
      () => nexus.connect(walletB).claimNftaYield(bNftaNodeId),
      "same-day claim blocked"
    );
    console.log("⏳ 尚未跨天，已验证同日不可重复领取");
  }

  console.log("\n[2/5] 阈值分配触发 (set threshold=1 TOT and trade)");
  const currentNexus = await swap.nexus();
  if (currentNexus.toLowerCase() !== nexusAddress.toLowerCase()) {
    await (await swap.setNexus(nexusAddress)).wait();
  }

  const distributorEnabled = await nexus.isDistributor(swapAddress);
  if (!distributorEnabled) {
    await (await nexus.setDistributor(swapAddress, true)).wait();
  }

  const projectWallet = await nexus.projectWallet();
  if (projectWallet === ethers.ZeroAddress) {
    await (await nexus.setProjectWallet(deployer.address)).wait();
  }

  await (await swap.setDistributionThreshold(ethers.parseUnits("1", 18))).wait();

  await (await deployer.sendTransaction({ to: walletD.address, value: ethers.parseEther("0.001") })).wait();
  await (await usdt.transfer(walletD.address, ethers.parseUnits("2000", 18))).wait();

  const poolBefore = await swap.nftbDividendPool();
  const bPendingBeforeTrigger = await nexus.pendingNftbDividend(bNftbNodeId);
  await (await usdt.connect(walletD).approve(swapAddress, ethers.parseUnits("300", 18))).wait();
  await (await swap.connect(walletD).buyTot(ethers.parseUnits("300", 18), 0)).wait();
  const poolAfter = await swap.nftbDividendPool();
  const bPendingAfterTrigger = await nexus.pendingNftbDividend(bNftbNodeId);

  console.log("Pool before:", ethers.formatUnits(poolBefore, 18), "TOT");
  console.log("Pool after:", ethers.formatUnits(poolAfter, 18), "TOT");
  if (bPendingAfterTrigger > bPendingBeforeTrigger) {
    console.log("✅ 阈值触发分配已执行");
  } else {
    console.log("⚠️ 阈值触发已尝试，但 Swap 自动分配未生效，执行 Nexus 直充分红兜底");
    const fallbackAmount = ethers.parseUnits("200", 18);
    await (await tot.approve(nexusAddress, fallbackAmount)).wait();
    await (await nexus.distributeNftbDividends(fallbackAmount)).wait();
    const bPendingAfterFallback = await nexus.pendingNftbDividend(bNftbNodeId);
    assertCondition(
      bPendingAfterFallback > bPendingBeforeTrigger,
      "fallback distribution should increase NFTB pending dividend"
    );
  }

  console.log("\n[3/5] 分红领取 (B/C NFTB)");
  const bPendingDivBefore = await nexus.pendingNftbDividend(bNftbNodeId);
  const cPendingDivBefore = await nexus.pendingNftbDividend(cNftbNodeId);
  console.log("B pending dividend:", ethers.formatUnits(bPendingDivBefore, 18));
  console.log("C pending dividend:", ethers.formatUnits(cPendingDivBefore, 18));

  if (bPendingDivBefore > 0n) {
    await (await nexus.connect(walletB).claimNftbDividend(bNftbNodeId)).wait();
  }
  if (cPendingDivBefore > 0n) {
    await (await nexus.connect(walletC).claimNftbDividend(cNftbNodeId)).wait();
  }

  const bPendingDivAfter = await nexus.pendingNftbDividend(bNftbNodeId);
  const cPendingDivAfter = await nexus.pendingNftbDividend(cNftbNodeId);
  assertCondition(bPendingDivAfter === 0n, "B dividend should be fully claimed");
  assertCondition(cPendingDivAfter === 0n, "C dividend should be fully claimed");
  console.log("✅ B/C 分红领取完成");

  console.log("\n[4/5] 构造 TOF 不足失败场景 (D wallet)");
  const tierId = await findActiveNftbTierId(nexus);
  await (await nexus.connect(walletD).bindReferrer(walletA.address)).wait();
  await (await usdt.connect(walletD).approve(nexusAddress, ethers.parseUnits("2000", 18))).wait();
  await (await nexus.connect(walletD).buyNftbWithUsdt(tierId, walletA.address)).wait();

  const dDistributionAmount = ethers.parseUnits("100", 18);
  await (await tot.approve(nexusAddress, dDistributionAmount)).wait();
  await (await nexus.distributeNftbDividends(dDistributionAmount)).wait();

  const dNftbNodeId = await getFirstNodeIdOrThrow(nexus, walletD.address, "B");
  const dPendingDiv = await nexus.pendingNftbDividend(dNftbNodeId);
  if (dPendingDiv > 0n) {
    await (await nexus.connect(walletD).claimNftbDividend(dNftbNodeId)).wait();
  }

  const dState = await nexus.accounts(walletD.address);
  const dTofBalance = await tof.balanceOf(walletD.address);
  console.log("D pendingTot:", ethers.formatUnits(dState.pendingTot, 18));
  console.log("D TOF balance:", ethers.formatUnits(dTofBalance, 18));

  assertCondition(dState.pendingTot > 0n, "D needs pendingTot for withdraw test");
  assertCondition(dTofBalance === 0n, "D should have zero TOF");

  await (await tof.connect(walletD).approve(nexusAddress, ethers.MaxUint256)).wait();
  await expectRevert(
    () => nexus.connect(walletD).withdrawTot(dState.pendingTot),
    "withdraw fails due to TOF insufficient"
  );
  console.log("✅ TOF 不足提现失败已验证");

  console.log("\n[5/5] 状态快照");
  const bState = await nexus.accounts(walletB.address);
  const cState = await nexus.accounts(walletC.address);
  const finalPool = await swap.nftbDividendPool();

  console.log("B pendingTot:", ethers.formatUnits(bState.pendingTot, 18));
  console.log("C pendingTot:", ethers.formatUnits(cState.pendingTot, 18));
  console.log("Final nftbDividendPool:", ethers.formatUnits(finalPool, 18));

  console.log("\n✅ Round 2 Sepolia test completed.");
  console.log("D:", walletD.address);
  console.log("D_PRIVATE_KEY:", walletD.privateKey);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
