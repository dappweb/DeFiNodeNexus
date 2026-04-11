# 初始化 DeFiNodeNexus 的 2 NFTA + 3 NFTB Tier 数据

## 前置条件

1. 合约地址: `0x6D862Bc5E9486C89c957905D18760204851f6203`
2. Owner 地址: `0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b`
3. RPC URL: `https://rpc.cncchainpro.com`
4. 网络: CNC Mainnet (Chain ID: 50716)

## 初始化规格

### NFTA Tier (2个)

- **Tier 1**: 500 USDT, 6.5 TOT/日, 最大 10000 张, 激活
- **Tier 2**: 1000 USDT, 20 TOT/日, 最大 5000 张, 激活

### NFTB Tier (3个)

- **Tier 1**: 500 USDT, 权重 1, 20% 分红, 最大 2000 张, 激活
- **Tier 2**: 1000 USDT, 权重 2, 30% 分红, 最大 2000 张, 激活
- **Tier 3**: 2000 USDT, 权重 3, 40% 分红, 最大 2000 张, 激活

## 方案 1: 用脚本初始化（需要 OWNER_PRIVATE_KEY）

```bash
# 设置 Owner 私钥并执行脚本
OWNER_PRIVATE_KEY=<你的私钥> node scripts/init-tiers.js

# 脚本会:
# 1. 验证签名者是合约 Owner
# 2. 检查当前链上 tier 数量
# 3. 提交 5 笔交易（2 configureNftaTier + 3 configureNftbTier）
# 4. 等待所有交易确认
# 5. 验证最终状态
```

## 方案 2: 通过 Admin UI 初始化（Web3 钱包）

1. 用 Owner 钱包 (0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b) 访问:

   ```
   https://t1.test2dapp.xyz/admin
   ```

2. 点击 "连接钱包" 按钮，选择 MetaMask 或其他 Web3 钱包

3. 切换到 CNC Mainnet (Chain ID 50716)

4. 在 **Tier 管理** 面板中找到黄色提示框

5. 点击 "一键初始化到链上" 按钮

6. 在钱包中签署 5 笔交易

## 方案 3: 从硬标签文本创建交易（高级）

如果需要手动创建交易，可以使用 ethers.js：

```javascript
const { ethers } = require("ethers");

const PROVIDER = new ethers.JsonRpcProvider(
  "https://rpc.cncchainpro.com",
  50716,
);
const NEXUS_ADDRESS = "0x6D862Bc5E9486C89c959905D18760204851f6203";

const ABI = [
  "function configureNftaTier(uint256 tierId, uint256 price, uint256 dailyYield, uint256 maxSupply, bool isActive) external returns (uint256)",
  "function configureNftbTier(uint256 tierId, uint256 price, uint256 weight, uint256 maxSupply, uint256 dividendBps, bool isActive) external returns (uint256)",
];

// 以 Owner 身份连接
const signer = new ethers.Wallet(OWNER_PRIVATE_KEY, PROVIDER);
const nexus = new ethers.Contract(NEXUS_ADDRESS, ABI, signer);

// 初始化示例
const wad = (v) => ethers.parseUnits(v, 18);

// 配置 NFTA Tier 1
await nexus.configureNftaTier(
  0, // tierId
  wad("500"), // price (500 USDT)
  wad("6.5"), // dailyYield
  "10000", // maxSupply
  true, // isActive
);
```

## 验证初始化成功

执行脚本后，可以验证链上状态：

```bash
# 检查当前 tier 数量
node -e "
const { ethers } = require('ethers');
const p = new ethers.JsonRpcProvider('https://rpc.cncchainpro.com', 50716);
const c = new ethers.Contract('0x6D862Bc5E9486C89c959905D18760204851f6203', [
  'function nextNftaTierId() view returns (uint256)',
  'function nextNftbTierId() view returns (uint256)',
], p);
(async () => {
  const [nextA, nextB] = await Promise.all([c.nextNftaTierId(), c.nextNftbTierId()]);
  console.log('NFTA Tier 数量:', Number(nextA) - 1);
  console.log('NFTB Tier 数量:', Number(nextB) - 1);
})();
"
```

预期输出:

```
NFTA Tier 数量: 2
NFTB Tier 数量: 3
```

## 初始化后

- Admin 页面将显示实际链上的 tier 数据
- 可以点击 "编辑" 按钮修改任何 tier 的参数
- 可以点击 "上架"/"下架" 切换 tier 的活跃状态
- 用户可以在节点购买页面看到真实的链上 tier 规格

---

**需要帮助?**

- 如果没有 Owner 私钥，请使用方案 2（Web3 钱包）
- 如果用 Web3Modal 无法连接，请检查钱包是否切换到 CNC Mainnet (Chain ID 50716)
