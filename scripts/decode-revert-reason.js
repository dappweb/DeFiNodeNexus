#!/usr/bin/env node
/**
 * Get actual revert reason using eth_call with try/catch
 */
const {ethers} = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://rpc.cncchainpro.com');
  
  const DEPLOYER = '0x744447d8580EB900b199e852C132F626247a36F7';
  const SWAP = '0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC';
  const USDT = '0xf54cC0F6CE272125c39C45A8141b84989A8765f4';
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     Decode Actual Revert Reason                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // First, check what the quote returns
  const QUOTE_ABI = ['function quoteBuy(uint256 usdtAmount) public view returns (uint256, uint256)'];
  const quoteIface = new ethers.Interface(QUOTE_ABI);
  
  const amount = ethers.parseUnits('0.1', 18);
  const quoteCalldata = quoteIface.encodeFunctionData('quoteBuy', [amount]);
  
  console.log('Step 1: Check quoteBuy result');
  try {
    const quoteResult = await provider.call({
      to: SWAP,
      data: quoteCalldata,
    });
    const [netOut, fee] = quoteIface.decodeFunctionResult('quoteBuy', quoteResult);
    console.log(`✅quoteBuy returned: ${ethers.formatUnits(netOut, 18)} TOT`);
    console.log(`Fee: ${ethers.formatUnits(fee, 18)} TOT\n`);
  } catch (err) {
    console.log(`❌ quoteBuy failed: ${err.message}\n`);
  }

  // Now try to call buyTot and capture the exact error
  console.log('Step 2: Attempt buyTot call');
  
  const BUY_ABI = ['function buyTot(uint256 usdtAmount, uint256 minTotOut) external'];
  const buyIface = new ethers.Interface(BUY_ABI);
  
  const minOut = ethers.parseUnits('50', 18);
  const buyCalldata = buyIface.encodeFunctionData('buyTot', [amount, minOut]);
  
  try {
    const result = await provider.call({
      from: DEPLOYER,
      to: SWAP,
      data: buyCalldata,
    });
    console.log('✅ Call succeeded (unexpected!)');
  } catch (err) {
    console.log(`❌ Call reverted with error:`);
    console.log(`   Code: ${err.code}`);
    console.log(`   Message: ${err.message}`);
    
    if (err.data) {
      console.log(`   Data: ${err.data}`);
      
      // Try to decode if it's a standard Error(string)
      if (err.data.startsWith('0x08c379a0')) {
        try {
          const params = err.data.slice(10);
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + params);
          console.log(`   Revert Message: "${decoded[0]}"`);
        } catch (e) {
          console.log('   Could not decode revert message');
        }
      } else if (err.data.startsWith('0x4e487b71')) {
        try {
          const params = err.data.slice(10);
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], '0x' + params);
          console.log(`   Panic Code: ${decoded[0]}`);
        } catch (e) {
          console.log('   Could not decode panic');
        }
      }
    }
  }
  
  console.log('\nStep 3: Check state requirements\n');
  
  const STATE_ABI = [
    'function swapPaused() public view returns (bool)',
    'function externalDexEnabled() public view returns (bool)',
    'function totReserve() public view returns (uint256)',
    'function usdtReserve() public view returns (uint256)',
    'function getDailyBoughtAmount(address user) public view returns (uint256)',
    'function maxDailyBuy() public view returns (uint256)',
  ];
  
  const swap = new ethers.Contract(SWAP, STATE_ABI, provider);
  
  const [swapPaused, extDex, totRes, usdtRes, dailyBought, maxDaily] = await Promise.all([
    swap.swapPaused(),
    swap.externalDexEnabled(),
    swap.totReserve(),
    swap.usdtReserve(),
    swap.getDailyBoughtAmount(DEPLOYER),
    swap.maxDailyBuy(),
  ]);
  
  console.log(`Swap Paused: ${swapPaused ? '🚫 YES' : '✅ NO'}`);
  console.log(`External DEX: ${extDex ? '✅ YES' : '❌ NO'}`);
  console.log(`TOT Reserve: ${ethers.formatUnits(totRes, 18)}`);
  console.log(`USDT Reserve: ${ethers.formatUnits(usdtRes, 18)}`);
  console.log(`Daily Bought: ${ethers.formatUnits(dailyBought, 18)} / ${ethers.formatUnits(maxDaily, 18)}`);
  
  if (swapPaused) {
    console.log('\n⚠️  Swap is PAUSED - this will cause failure!');
  }
  if (!extDex) {
    console.log('\n⚠️  External DEX is DISABLED - may cause issues!');
  }
  if (totRes === BigInt(0) || usdtRes === BigInt(0)) {
    console.log('\n⚠️  Internal pool is EMPTY - cannot use internal swap!');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
