# DeFiNodeNexus 二次测试发版通知（模板）

- 版本：`[填写版本号]`
- 发版日期：`2026-03-25`
- 测试轮次：`二次测试`
- 网络：`Sepolia (Chain ID: 11155111)`
- 目标：验证钱包连接、购买/绑定、收益领取、提现、Swap、管理员配置等核心链路。

---

## 1) 测试账号角色 + 账号私钥

> 说明：以下私钥栏位按模板要求保留，建议仅在受控渠道传递，测试完成后请立即轮换。

| 角色 | 用途 | 地址（可核对） | 私钥（明文） |
|---|---|---|---|
| Owner / Deployer | 管理员配置、部署与治理参数更新 | `0x744447d8580EB900b199e852C132F626247a36F7` | `[填写 DEPLOYER_PRIVATE_KEY]` |
| Round2-A | 用户流程测试（购买/绑定） | `0x9A95C190fbB687FcFEB58763155632529043FbE8` | `[填写 ROUND2_A_PRIVATE_KEY]` |
| Round2-B | 收益与提现主测 | `0x341C2AE8d1Dc6d92796A0DA8673e6EC504e06927` | `[填写 ROUND2_B_PRIVATE_KEY]` |
| Round2-C | NFTB/分红/联调补充 | `0xf60609A8F0Df33D807202358cbf7A01a1fB65188` | `[填写 ROUND2_C_PRIVATE_KEY]` |

> 账号来源文档：`docs/qa-test-accounts-login.md`

---

## 2) 执行命令

### 2.1 前端与 E2E

```powershell
npm install
npm run dev
npm run test:e2e
```

### 2.2 Round3 单次执行

```powershell
npx hardhat run scripts/sepolia-round3-test.js --network sepolia
```

### 2.3 Round3 带日志（推荐）

```powershell
$env:ROUND2_A_PRIVATE_KEY='[填写A私钥]'; \
$env:ROUND2_B_PRIVATE_KEY='[填写B私钥]'; \
$env:ROUND2_C_PRIVATE_KEY='[填写C私钥]'; \
npx hardhat run scripts/sepolia-round3-test.js --network sepolia *>&1 | Tee-Object -FilePath scripts\round3-last.log; \
Write-Output "EXIT:$LASTEXITCODE"
```

### 2.4 Round3 网络抖动重试（推荐）

```powershell
$env:ROUND2_A_PRIVATE_KEY='[填写A私钥]'; \
$env:ROUND2_B_PRIVATE_KEY='[填写B私钥]'; \
$env:ROUND2_C_PRIVATE_KEY='[填写C私钥]'; \
for($i=1; $i -le 5; $i++){
  Write-Output "ROUND3_ATTEMPT:$i";
  npx hardhat run scripts/sepolia-round3-test.js --network sepolia;
  if($LASTEXITCODE -eq 0){ Write-Output "ROUND3_OK"; break };
  Start-Sleep -Seconds 6
};
Write-Output "ROUND3_FINAL_EXIT:$LASTEXITCODE"
```

---

## 3) 验收标准（Go / No-Go）

### Go 标准
- 前端可正常启动，关键页面可访问
- E2E 全量通过（10/10）
- Round3 在 1~5 次重试内可达成功退出（`EXIT:0`）
- 关键交易链路可复现：购买、领取、提现、Swap

### No-Go 标准
- E2E 关键用例持续失败
- 管理员参数写链失败且不可恢复
- Round3 持续失败并定位为业务逻辑回退（非网络）

---

## 4) 本轮测试产出要求

- E2E 报告：`playwright-report/`
- 失败证据：`test-results/`
- 链上脚本日志：`scripts/round3-last.log`
- 缺陷单：步骤、期望、实际、截图、日志

---

## 5) 通知签发信息

- 发布负责人：`[填写姓名]`
- 测试负责人：`[填写姓名]`
- 通知发送时间：`[填写时间]`
- 附件：`qa-second-test-release-notice-template.pdf`
