# QA 测试账号登录手册（钱包账户）

更新时间：2026-03-25

说明：本项目登录方式为钱包连接，不使用用户名/密码。

## 1. 登录方式

- 前端登录：点击页面 `Connect Wallet`，由钱包插件（建议 MetaMask）授权
- 网络要求：Sepolia（Chain ID: `11155111`）

## 2. 账号角色分配

| 角色 | 用途 | 地址来源 | 私钥来源 |
|---|---|---|---|
| Owner / Deployer | 管理员配置、部署与治理参数更新 | 由 `DEPLOYER_PRIVATE_KEY` 推导 | `.env` |
| Round2-A | 用户流程测试（购买/绑定） | 由 `ROUND2_A_PRIVATE_KEY` 推导 | 终端环境变量 |
| Round2-B | 收益与提现主测 | 由 `ROUND2_B_PRIVATE_KEY` 推导 | 终端环境变量 |
| Round2-C | NFTB/分红/联调补充 | 由 `ROUND2_C_PRIVATE_KEY` 推导 | 终端环境变量 |

## 3. 最近实测地址（用于核对）

来自最近 Round3 日志：
- Deployer: `0x744447d8580EB900b199e852C132F626247a36F7`
- A: `0x9A95C190fbB687FcFEB58763155632529043FbE8`
- B: `0x341C2AE8d1Dc6d92796A0DA8673e6EC504e06927`
- C: `0xf60609A8F0Df33D807202358cbf7A01a1fB65188`

日志文件： [scripts/round3-last.log](scripts/round3-last.log)

## 4. 钱包导入步骤（MetaMask）

1. 打开 MetaMask
2. 选择 `Import Account`
3. 输入对应私钥（Owner / A / B / C）
4. 切换到 Sepolia 网络
5. 确认账户有少量 Sepolia ETH（Gas）

## 5. 测试前检查

- Owner 账户：
  - 能看到管理面板并执行参数更新
- A/B/C 账户：
  - 能连接钱包
  - 能进行购买/领取/提现/Swap 操作
- 合约地址已配置：
  - `TOT_TOKEN_ADDRESS`
  - `TOF_TOKEN_ADDRESS`
  - `USDT_TOKEN_ADDRESS`
  - `NEXUS_ADDRESS`
  - `SWAP_ADDRESS`

## 6. 安全规范（必须）

- 不要把真实私钥提交到 Git 仓库
- 不要在公开文档中明文粘贴私钥
- 建议测试结束后轮换测试私钥
- 仅使用低余额测试账户

## 7. 常用命令模板

设置 A/B/C 账户后执行 Round3：

`$env:ROUND2_A_PRIVATE_KEY='...'; $env:ROUND2_B_PRIVATE_KEY='...'; $env:ROUND2_C_PRIVATE_KEY='...'; npx hardhat run scripts/sepolia-round3-test.js --network sepolia`

带重试：

`$env:ROUND2_A_PRIVATE_KEY='...'; $env:ROUND2_B_PRIVATE_KEY='...'; $env:ROUND2_C_PRIVATE_KEY='...'; for($i=1; $i -le 5; $i++){ Write-Output "ROUND3_ATTEMPT:$i"; npx hardhat run scripts/sepolia-round3-test.js --network sepolia; if($LASTEXITCODE -eq 0){ Write-Output "ROUND3_OK"; break }; Start-Sleep -Seconds 6 }; Write-Output "ROUND3_FINAL_EXIT:$LASTEXITCODE"`
