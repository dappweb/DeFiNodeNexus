const hre = require('hardhat');

async function main() {
  const recipient = '0x7123a25d205190e6844712cb18e39d6dd5316143';
  const amount = hre.ethers.parseUnits('1000', 18);

  const totAddress = process.env.TOT_TOKEN_ADDRESS;
  const tofAddress = process.env.TOF_TOKEN_ADDRESS;
  const usdtAddress = process.env.USDT_TOKEN_ADDRESS;

  if (!totAddress || !tofAddress || !usdtAddress) {
    throw new Error('Missing token address in env');
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const list = [['TOT', totAddress], ['TOF', tofAddress], ['USDT', usdtAddress]];
  for (let i=0;i<list.length;i++) {
    const name = list[i][0];
    const addr = list[i][1];
    const token = await hre.ethers.getContractAt('TOTToken', addr);
    console.log('>>', name, addr, '->', recipient);
    try {
      const tx = await token.mint(recipient, amount);
      const receipt = await tx.wait();
      console.log('- minted ' + name + ' tx:', receipt.transactionHash);
    } catch (err) {
      console.log('- mint ' + name + ' failed, try transfer (deployer balance)', err.message || err);
      const balance = await token.balanceOf(deployer.address);
      if (balance < amount) {
        throw new Error(name + ' insufficient balance to transfer');
      }
      const tx2 = await token.transfer(recipient, amount);
      const receipt2 = await tx2.wait();
      console.log('- transferred ' + name + ' tx:', receipt2.transactionHash);
    }
  }
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
