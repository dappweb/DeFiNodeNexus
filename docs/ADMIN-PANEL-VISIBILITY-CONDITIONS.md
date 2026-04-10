# Admin Panel 显示条件

## 核心条件

Admin 标签页 **只在满足以下条件时显示**：

```
shouldShowAdmin = isOwner || isOperatorManager
```

### 条件分解

#### 1. **isOwner**（owner 身份）
Admin 标签页在用户是以下任一角色时显示：

##### a) **Nexus Owner**
```
isNexusOwner = (钱包地址 === Nexus所有者地址)
```

来源：
- `process.env.NEXT_PUBLIC_CONTRACT_OWNER`（如果配置）
- 或从链上读取 `Nexus.owner()`

##### b) **Swap Owner**  
```
isSwapOwner = (钱包地址 === Swap所有者地址)
```

来源：
- `process.env.NEXT_PUBLIC_SWAP_OWNER`（如果配置）
- 或从链上读取 `Swap.owner()`

#### 2. **isOperatorManager**（操作员管理者）
Admin 标签页在用户是以下角色时显示：

```
isOperatorManager = Nexus.isDistributor(钱包地址)
```

用户必须在 Nexus 合约中被标记为 Distributor。

---

## 完整权限矩阵

| 钱包身份 | 是否显示Admin | 功能 |
|---------|---|------|
| Nexus Owner | ✅ 显示 | 完整权限（NFTA、基础参数等） |
| Swap Owner | ✅ 显示 | 交换相关权限（流动性、费率等）+ Owner转移 |
| Distributor | ✅ 显示 | 部分权限（权限受限） |
| 普通用户 | ❌ 隐藏 | 无法访问Admin |

---

## 数据加载流程

```
1. 用户连接钱包 (address 改变)
   ↓
2. 并行加载三个状态：
   ├─ loadOwner()        → 获取 Nexus Owner
   ├─ loadSwapOwner()    → 获取 Swap Owner  
   └─ checkOperator()    → 检查 Distributor 状态
   ↓
3. 状态加载完成 (ownerStatusLoaded, swapOwnerStatusLoaded)
   ↓
4. 计算 isNexusOwner, isSwapOwner, isOperatorManager
   ↓
5. 计算 shouldShowAdmin = isOwner || isOperatorManager
   ↓
6. 根据 shouldShowAdmin 显示/隐藏 Admin 标签页
```

---

## 环境变量快速路径

为了加快响应，可以设置环保变量以跳过链上查询：

### `.env` 配置
```env
# Nexus Owner 快速路径
NEXT_PUBLIC_CONTRACT_OWNER=0x744447d8580EB900b199e852C132F626247a36F7

# Swap Owner 快速路径
NEXT_PUBLIC_SWAP_OWNER=0x744447d8580EB900b199e852C132F626247a36F7
```

优点：
- ✅ 无需等待链上 RPC 调用
- ✅ Admin 标签页立即显示
- ✅ 部署时快速验证权限

---

## 权限检查逻辑代码

### 位置
**File**: `src/app/page.tsx`

### 关键变量
```typescript
// 身份检查
const isNexusOwner = address?.toLowerCase() === ownerAddress?.toLowerCase();
const isSwapOwner = address?.toLowerCase() === swapOwnerAddress?.toLowerCase();
const isOperatorManager = Nexus.isDistributor(address);

// 综合判断
const isOwner = isNexusOwner || isSwapOwner;
const shouldShowAdmin = isOwner || isOperatorManager;
```

---

## 切换条件

如果不符合条件：
- ✅ 即使 URL 中有 `?tab=admin` 也会被重定向
- ✅ Admin 标签页在导航中隐藏
- ✅ 用户无法通过 URL 手动访问

```typescript
useEffect(() => {
  if (!shouldShowAdmin && activeTab === "admin") {
    setActiveTab("home"); // 自动重定向
  }
}, [shouldShowAdmin, activeTab]);
```

---

## 实际场景

### 场景 1: Nexus Owner 连接
```
钱包: 0x744447d8580EB900b199e852C132F626247a36F7
↓
isNexusOwner = true (因为是 Nexus Owner)
isSwapOwner = false
isOperatorManager = false  
↓
shouldShowAdmin = true → Admin 显示 ✅
```

### 场景 2: Swap Owner 连接
```
钱包: 0x744447d8580EB900b199e852C132F626247a36F7
↓
isNexusOwner = false
isSwapOwner = true (因为是 Swap Owner)
isOperatorManager = false
↓
shouldShowAdmin = true → Admin 显示 ✅
```

### 场景 3: Distributor 连接
```
钱包: 0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
↓
isNexusOwner = false
isSwapOwner = false
isOperatorManager = true (在 Nexus.isDistributor 中)
↓
shouldShowAdmin = true → Admin 显示 ✅
```

### 场景 4: 普通用户连接
```
钱包: 0xYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
↓
isNexusOwner = false
isSwapOwner = false
isOperatorManager = false
↓
shouldShowAdmin = false → Admin 隐藏 ❌
```

---

## 状态加载等待

Admin 面板的显示需要等待所有状态加载完成：

```typescript
const shouldBlockForReferral = 
  isConnected && 
  ownerStatusLoaded &&        // ← 等待 Nexus Owner 加载
  swapOwnerStatusLoaded &&    // ← 等待 Swap Owner 加载  
  referrerStatusLoaded &&     // ← 等待推荐人状态
  !isOwner &&
  !referrerBound;
```

---

## 总结

| 条件 | 显示Admin? |
|------|-----------|
| Nexus Owner | ✅ 是 |
| Swap Owner | ✅ 是 |
| Distributor (via isDistributor) | ✅ 是 |
| 其他身份 | ❌ 否 |

**关键点：** Admin 只对**所有者或分发者**可见，普通用户永远无法访问。
