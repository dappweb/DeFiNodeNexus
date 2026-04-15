const hre = require('hardhat');
const ethers = hre.ethers;

async function main() {
  const proxyAddr = '0x6D862Bc5E9486C89c959905D18760204851f6203';
  const expectedImpl = '0x4479d75E575B4C987Beb1b017EF7464aF760624D';
  const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

  console.log('\n📋 升级验证报告');
  console.log('='.repeat(60));

  // 获取当前实现地址
  const implSlot = await ethers.provider.getStorage(proxyAddr, IMPLEMENTATION_SLOT);
  const currentImpl = '0x' + implSlot.slice(-40);

  // 获取合约实例并测试新函数
  const contract = await ethers.getContractAt('DeFiNodeNexus', proxyAddr);

  console.log('✅ 代理信息');
  console.log(`   Proxy address:     ${proxyAddr}`);
  console.log(`   Current impl:      ${currentImpl}`);
  console.log(`   Expected impl:     ${expectedImpl}`);
  console.log(`   Match:             ${currentImpl.toLowerCase() === expectedImpl.toLowerCase() ? '✅ YES' : '❌ NO'}`);

  console.log('\n✅ 测试新查询函数');
  try {
    // 测试 getAdminCount
    const adminCount = await contract.getAdminCount();
    console.log(`   getAdminCount():   ${adminCount.toString()}`);

    // 测试 isAdminAddress  
    const testAddr = '0x0000000000000000000000000000000000000000';
    const isAdmin = await contract.isAdminAddress(testAddr);
    console.log(`   isAdminAddress():  ✅ 函数可调用 (ZeroAddress is admin: ${isAdmin})`);

    // 测试 getAdmins
    const admins = await contract.getAdmins(0, 100);
    console.log(`   getAdmins():       ✅ 函数可调用 (returned ${admins.length} admins)`);

    console.log('\n✅ 升级验证完成！所有新函数正常工作');
  } catch (error) {
    console.error('\n❌ 函数调用失败:', error.message);
  }

  console.log('='.repeat(60));
  console.log('\n📚 后续任务清单:');
  console.log('  [ ] 在 Blockscout 检查代理: https://explorer.testnet.cncchainpro.com/address/0x6D862Bc5E9486C89c959905D18760204851f6203');
  console.log('  [ ] 更新前端管理面板 UI 使用 getAdmins()');
  console.log('  [ ] 重建前端: npm run build');
  console.log('  [ ] 部署前端: npm run deploy');

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
