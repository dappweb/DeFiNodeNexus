const { ethers } = require("hardhat");

async function main() {
  const contractAddress = process.env.NEXUS_ADDRESS;
  if (!contractAddress) {
    console.error("Please set NEXUS_ADDRESS environment variable");
    process.exit(1);
  }

  const nexus = await ethers.getContractAt("DeFiNodeNexus", contractAddress);

  console.log("\n========== 获取所有用户推荐关系 ==========\n");

  // 获取合约中存储的所有事件来查找用户
  const filter = nexus.filters.ReferrerBound();
  const events = await nexus.queryFilter(filter);

  const usersSet = new Set();
  events.forEach((event) => {
    usersSet.add(event.args.user);
    usersSet.add(event.args.referrer);
  });

  const users = Array.from(usersSet);

  console.log(`发现 ${users.length} 个用户\n`);

  // 创建用户数据映射
  const userData = new Map();

  for (const user of users) {
    const account = await nexus.accounts(user);
    const level = await nexus.getUserLevel(user);

    userData.set(user, {
      address: user,
      referrer: account.referrer,
      directReferrals: Number(account.directReferrals),
      level: Number(level),
      totalNodes: Number(account.totalNodes),
      pendingTot: ethers.formatUnits(account.pendingTot, 18),
      claimedTot: ethers.formatUnits(account.claimedTot, 18),
      withdrawnTot: ethers.formatUnits(account.withdrawnTot, 18),
    });
  }

  // 构建推荐树
  console.log("========== 推荐关系树 ==========\n");

  // 查找顶级推荐人（没有推荐人的用户）
  const topUsers = Array.from(userData.entries()).filter(
    ([_, data]) => data.referrer === ethers.ZeroAddress
  );

  function printTree(userAddress, indent = 0) {
    const data = userData.get(userAddress);
    if (!data) return;

    const indentStr = "  ".repeat(indent);
    console.log(
      `${indentStr}├── ${userAddress.substring(0, 10)}... (Lv${data.level}, 直推: ${data.directReferrals})`
    );

    // 找出这个用户的所有下级
    const subordinates = Array.from(userData.entries()).filter(
      ([_, d]) => d.referrer === userAddress
    );

    subordinates.forEach(([addr, _]) => {
      printTree(addr, indent + 1);
    });
  }

  // 首先打印没有推荐人的用户
  console.log("顶级用户 (没有推荐人):");
  topUsers.forEach(([addr, data]) => {
    printTree(addr);
  });

  // 生成用户列表表格
  console.log("\n========== 用户详细信息 ==========\n");
  console.log("钱包地址".padEnd(42) + "推荐人".padEnd(42) + "等级  直推  总节点");
  console.log("─".repeat(130));

  Array.from(userData.entries())
    .sort((a, b) => Number(b[1].directReferrals) - Number(a[1].directReferrals))
    .forEach(([addr, data]) => {
      const referrerDisplay = data.referrer === ethers.ZeroAddress ? "无" : data.referrer.substring(0, 10) + "...";
      console.log(
        addr.padEnd(42) +
        referrerDisplay.padEnd(42) +
        `${data.level}`.padEnd(6) +
        `${data.directReferrals}`.padEnd(6) +
        `${data.totalNodes}`
      );
    });

  // 统计信息
  console.log("\n========== 统计 ==========\n");
  console.log(`总用户数: ${users.length}`);
  
  const levelCounts = new Map();
  for (let i = 0; i <= 5; i++) {
    levelCounts.set(i, 0);
  }
  
  userData.forEach((data) => {
    levelCounts.set(data.level, (levelCounts.get(data.level) || 0) + 1);
  });

  console.log("用户等级分布:");
  for (let i = 0; i <= 5; i++) {
    console.log(`  Lv${i}: ${levelCounts.get(i)} 人`);
  }

  const totalDirectReferrals = Array.from(userData.values()).reduce(
    (sum, data) => sum + data.directReferrals,
    0
  );
  console.log(`总直推人数: ${totalDirectReferrals}`);

  const totalPendingTot = Array.from(userData.values()).reduce(
    (sum, data) => sum + parseFloat(data.pendingTot),
    0
  );
  console.log(`待领取 TOT 总额: ${totalPendingTot.toFixed(2)}`);

  const totalClaimedTot = Array.from(userData.values()).reduce(
    (sum, data) => sum + parseFloat(data.claimedTot),
    0
  );
  console.log(`已领取 TOT 总额: ${totalClaimedTot.toFixed(2)}`);

  // 输出 JSON 格式的数据
  console.log("\n========== JSON 导出 ==========\n");
  const jsonOutput = {
    timestamp: new Date().toISOString(),
    totalUsers: users.length,
    users: Array.from(userData.entries()).map(([addr, data]) => ({
      address: addr,
      referrer: data.referrer === ethers.ZeroAddress ? null : data.referrer,
      level: data.level,
      directReferrals: data.directReferrals,
      totalNodes: data.totalNodes,
      pendingTot: data.pendingTot,
      claimedTot: data.claimedTot,
      withdrawnTot: data.withdrawnTot,
    })),
    statistics: {
      totalUsers: users.length,
      totalDirectReferrals,
      totalPendingTot: totalPendingTot.toFixed(2),
      totalClaimedTot: totalClaimedTot.toFixed(2),
      levelDistribution: Object.fromEntries(levelCounts),
    },
  };

  console.log(JSON.stringify(jsonOutput, null, 2));

  // 保存到文件
  const fs = require("fs");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `referral-report-${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n数据已保存到: ${filename}`);
}

main().catch(console.error);
