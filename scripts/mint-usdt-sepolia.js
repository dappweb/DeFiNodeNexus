const hre = require("hardhat");

function parseCsv(value) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const usdtAddress = process.env.USDT_TOKEN_ADDRESS;
  const recipientsCsv = process.env.USDT_MINT_RECIPIENTS || "";
  const amountsCsv = process.env.USDT_MINT_AMOUNTS || "";

  if (!privateKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY in .env");
  }
  if (!rpcUrl) {
    throw new Error("Missing SEPOLIA_RPC_URL in .env");
  }
  if (!usdtAddress) {
    throw new Error("Missing USDT_TOKEN_ADDRESS in .env");
  }
  if (!recipientsCsv || !amountsCsv) {
    throw new Error("Missing USDT_MINT_RECIPIENTS or USDT_MINT_AMOUNTS in .env");
  }

  const recipients = parseCsv(recipientsCsv);
  const amounts = parseCsv(amountsCsv);
  if (recipients.length !== amounts.length) {
    throw new Error("USDT_MINT_RECIPIENTS and USDT_MINT_AMOUNTS length mismatch");
  }

  const [deployer] = await hre.ethers.getSigners();
  const usdt = await hre.ethers.getContractAt("TOTToken", usdtAddress);
  const maxSupply = await usdt.maxSupply();
  let totalSupply = await usdt.totalSupply();

  console.log("Minter account:", deployer.address);
  console.log("USDT token:", usdtAddress);
  console.log("Mint count:", recipients.length);

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const amount = hre.ethers.parseUnits(amounts[i], 18);

    if (totalSupply + amount <= maxSupply) {
      const tx = await usdt.mint(recipient, amount);
      await tx.wait();
      totalSupply += amount;
      console.log(`Minted ${amounts[i]} USDT to ${recipient}`);
      continue;
    }

    const balance = await usdt.balanceOf(deployer.address);
    if (balance < amount) {
      throw new Error(
        `Cap reached and deployer balance insufficient for transfer: need ${amounts[i]} USDT`
      );
    }

    const tx = await usdt.transfer(recipient, amount);
    await tx.wait();
    console.log(`Transferred ${amounts[i]} USDT to ${recipient} (cap already reached)`);
  }

  console.log("USDT mint completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
