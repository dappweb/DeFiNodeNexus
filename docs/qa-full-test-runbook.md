# QA 全量测试执行手册（DeFiNodeNexus）

更新时间：2026-03-25
适用对象：测试工程师（功能测试 / 联调测试 / 回归测试）

## 1. 测试目标

验证三层一致性：
- 业务流程：推荐绑定、购卡、领取、提现、Swap 买卖、管理员参数配置
- 合约逻辑：DeFiNodeNexus / TOTSwap 关键状态与权限边界
- 页面功能：前端链上交互、状态展示、异常提示、可回归自动化

## 2. 测试范围

### 2.1 必测（P0）
- 钱包连接（Sepolia）
- 推荐人绑定（一次性绑定）
- NFTA 购买 + 收益领取
- NFTB 购买（USDT / TOF）+ 分红领取
- 提现（withdrawTot）
- Swap 买入/卖出、失败重试
- 管理员参数更新（Owner）
- 预测平台入口跳转

### 2.2 自动化覆盖（当前）
- E2E：`npm run test:e2e`
- 已通过：10/10（最近一次）

## 3. 环境准备

### 3.1 Node 与依赖
- 安装依赖：`npm install`

### 3.2 环境变量
- 复制模板：`copy .env.example .env`
- 前端本地：`.env.local`
- 关键变量：
  - `SEPOLIA_RPC_URL`
  - `DEPLOYER_PRIVATE_KEY`
  - `TOT_TOKEN_ADDRESS`
  - `TOF_TOKEN_ADDRESS`
  - `USDT_TOKEN_ADDRESS`
  - `NEXUS_ADDRESS`
  - `SWAP_ADDRESS`
  - `NEXT_PUBLIC_PREDICTION_PLATFORM_URL=https://deepseamonster.netlify.app/`

## 4. 启动与健康检查

### 4.1 启动前端
- `npm run dev`

### 4.2 健康检查
- 访问：`http://127.0.0.1:9002`
- 返回码：`200` 视为服务正常

## 5. 自动化测试执行

### 5.1 全量 E2E
- `npm run test:e2e`
- 期望：10 条用例全部通过

### 5.2 核心专项
- 管理员 + 推荐：`npx playwright test tests/e2e/referral-admin.spec.ts`
- 节点与收益：`npx playwright test tests/e2e/nodes-earnings.spec.ts`
- 交易核心流：`npx playwright test tests/e2e/core-flows.spec.ts`

## 6. Sepolia 真实链路执行

### 6.1 Round3 单次执行
- `npx hardhat run scripts/sepolia-round3-test.js --network sepolia`

### 6.2 带日志执行（推荐）
- `$env:ROUND2_A_PRIVATE_KEY='...'; $env:ROUND2_B_PRIVATE_KEY='...'; $env:ROUND2_C_PRIVATE_KEY='...'; npx hardhat run scripts/sepolia-round3-test.js --network sepolia *>&1 | Tee-Object -FilePath scripts\round3-last.log; Write-Output "EXIT:$LASTEXITCODE"`

### 6.3 网络抖动重试（推荐）
- `$env:ROUND2_A_PRIVATE_KEY='...'; $env:ROUND2_B_PRIVATE_KEY='...'; $env:ROUND2_C_PRIVATE_KEY='...'; for($i=1; $i -le 5; $i++){ Write-Output "ROUND3_ATTEMPT:$i"; npx hardhat run scripts/sepolia-round3-test.js --network sepolia; if($LASTEXITCODE -eq 0){ Write-Output "ROUND3_OK"; break }; Start-Sleep -Seconds 6 }; Write-Output "ROUND3_FINAL_EXIT:$LASTEXITCODE"`

## 7. 通过标准（Go / No-Go）

### 7.1 Go 标准
- 前端可正常启动，关键页面可访问
- E2E 全量通过（10/10）
- Round3 在 1~5 次重试内可达成功退出（`EXIT:0`）
- 关键交易链路可复现：购买、领取、提现、Swap

### 7.2 No-Go 标准
- E2E 关键用例持续失败
- 管理员参数写链失败且不可恢复
- Round3 持续失败并定位为业务逻辑回退（非网络）

## 8. 常见问题与处理

### 8.1 `ECONNRESET` / TLS 中断（Infura）
- 现象：`Client network socket disconnected...`
- 处理：按 5 次重试脚本执行；必要时更换 RPC Provider

### 8.2 `Daily buy limit exceeded`
- 现象：Swap 买入被限额拒绝
- 处理：使用新测试账户或跨日后重试；必要时临时调整测试参数

### 8.3 `replacement transaction underpriced`
- 现象：同 nonce 交易价格过低
- 处理：等待几秒后重发；减少并发交易；重试脚本已覆盖常见场景

## 9. 测试产出物

每轮测试需归档：
- E2E 报告：`playwright-report/`
- 失败证据：`test-results/`
- 链上脚本日志：`scripts/round3-last.log`
- 问题清单：缺陷单（步骤、期望、实际、截图、日志）

## 10. 相关文件

- 执行清单：[docs/full-business-test-checklist.md](docs/full-business-test-checklist.md)
- 上线验收 KPI：[docs/launch-acceptance-kpi.md](docs/launch-acceptance-kpi.md)
- Sepolia 方案：[docs/sepolia-test-plan.md](docs/sepolia-test-plan.md)
- Round3 脚本：[scripts/sepolia-round3-test.js](scripts/sepolia-round3-test.js)
- E2E 用例目录：[tests/e2e](tests/e2e)
