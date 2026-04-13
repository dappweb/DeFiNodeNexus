# 🚀 DeFiNodeNexus Caddy 部署完整指南

> 项目已准备好部署到 **t1.test2dapp.xyz**

## 📦 部署包内容

以下文件已为你创建：

### 配置文件

- **`Caddyfile`** - Caddy 反向代理配置（指向 localhost:3001）
- **`CADDY-DEPLOYMENT-SUMMARY.md`** - 部署总结和常用命令

### 部署脚本

- **`deploy-caddy.sh`** ⭐ - 完整自动部署脚本（推荐使用）
- **`quick-deploy-caddy.sh`** - 快速部署向导
- **`check-caddy-deploy.sh`** - 部署前系统检查
- **`health-check-caddy.sh`** - 部署后健康检查

### 文档

- **`docs/CADDY-DEPLOYMENT-GUIDE.md`** - 详细部署指南
- **`CADDY-DEPLOYMENT-SUMMARY.md`** - 部署配置总结

---

## ⚡ 快速开始（3 步）

### 第 1 步：预检查

```bash
cd /home/ubuntu/DeFiNodeNexus
bash check-caddy-deploy.sh
```

✅ **预检查已通过** - 系统已完全准备好部署

### 第 2 步：自动部署

```bash
bash deploy-caddy.sh
```

此脚本将：

- 📦 安装项目依赖
- 🔨 构建 Next.js 应用
- 📂 配置部署目录 (`/opt/DeFiNodeNexus`)
- 🔧 创建 systemd 服务（自动重启）
- ⚙️ 配置 Caddy 反向代理
- 🚀 启动所有服务
- 🔐 自动配置 HTTPS 证书

### 第 3 步：验证部署

```bash
bash health-check-caddy.sh
```

或直接访问：

```
https://t1.test2dapp.xyz
```

---

## 🎯 关键配置信息

| 项目     | 值                           |
| -------- | ---------------------------- |
| 域名     | `t1.test2dapp.xyz`           |
| HTTPS    | ✅ 自动 Let's Encrypt        |
| 应用端口 | 3001 (Next.js)               |
| 反向代理 | 80/443 (Caddy)               |
| 部署位置 | `/opt/DeFiNodeNexus`         |
| 源代码   | `/home/ubuntu/DeFiNodeNexus` |
| 服务1    | `nexus-nextjs.service`       |
| 服务2    | `caddy.service`              |

---

## 📊 部署前系统状态

```
✓ Node.js v20.20.2
✓ npm 10.8.2
✓ Caddy v2.11.2 (已安装)
✓ sudo 权限可用
✓ 环境变量完整 (12 个)
✓ DNS 正常解析
✓ 所需端口可用
✓ 磁盘空间充足
```

---

## 🔧 手动部署（如果不想用自动脚本）

### 第 1 步：构建项目

```bash
cd /home/ubuntu/DeFiNodeNexus
npm install
npm run build
```

### 第 2 步：设置部署目录

```bash
# 创建目录
sudo mkdir -p /opt/DeFiNodeNexus
sudo chown $USER:$USER /opt/DeFiNodeNexus

# 复制构建文件
cp -r .next public package.json /opt/DeFiNodeNexus/
cd /opt/DeFiNodeNexus

# 复制环境文件
cp /home/ubuntu/DeFiNodeNexus/.env .
cp /home/ubuntu/DeFiNodeNexus/.env.local . 2>/dev/null || true

# 安装生产依赖
npm install --omit=dev
```

### 第 3 步：配置 Next.js 服务

```bash
sudo tee /etc/systemd/system/nexus-nextjs.service > /dev/null <<'EOF'
[Unit]
Description=DeFiNodeNexus Next.js Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/DeFiNodeNexus
Environment="NODE_ENV=production"
Environment="PORT=3001"
ExecStart=/usr/bin/node /opt/DeFiNodeNexus/.next/standalone/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable nexus-nextjs.service
sudo systemctl start nexus-nextjs.service
```

### 第 4 步：更新 Caddy 配置

```bash
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy.service
```

---

## 📋 完整命令参考

### 服务管理

```bash
# 查看服务状态
sudo systemctl status nexus-nextjs.service
sudo systemctl status caddy.service

# 启动服务
sudo systemctl start nexus-nextjs.service
sudo systemctl start caddy.service

# 停止服务
sudo systemctl stop nexus-nextjs.service
sudo systemctl stop caddy.service

# 重启服务
sudo systemctl restart nexus-nextjs.service
sudo systemctl restart caddy.service

# 开机启动
sudo systemctl enable nexus-nextjs.service
sudo systemctl enable caddy.service
```

### 日志查看

```bash
# 实时日志（Next.js）
sudo journalctl -u nexus-nextjs.service -f

# 实时日志（Caddy）
sudo journalctl -u caddy.service -f

# 最后 50 行（Next.js）
sudo journalctl -u nexus-nextjs.service -n 50

# 最后 50 行（Caddy）
sudo journalctl -u caddy.service -n 50
```

### 测试连接

```bash
# 测试本地连接
curl http://localhost:3001

# 测试 HTTPS
curl https://t1.test2dapp.xyz

# 检查 SSL 证书
openssl s_client -connect t1.test2dapp.xyz:443 -servername t1.test2dapp.xyz

# 检查响应头
curl -I https://t1.test2dapp.xyz
```

### 监控

```bash
# 检查端口
sudo lsof -i :3001
sudo lsof -i :80
sudo lsof -i :443

# 资源使用
ps aux | grep -E "node|caddy"
free -h
df -h
```

---

## 🆘 故障排查

### 问题 1: 无法访问应用

```bash
# 1. 检查 Next.js 是否运行
sudo systemctl status nexus-nextjs.service

# 2. 检查端口 3001
sudo lsof -i :3001

# 3. 查看错误日志
sudo journalctl -u nexus-nextjs.service -n 100 --no-pager

# 4. 测试本地连接
curl -v http://localhost:3001
```

### 问题 2: HTTPS 不工作

```bash
# 1. 检查 Caddy 服务
sudo systemctl status caddy.service

# 2. 检查 Caddyfile 语法
caddy validate --config /etc/caddy/Caddyfile

# 3. 查看 Caddy 日志
sudo journalctl -u caddy.service -n 100 --no-pager

# 4. 验证 DNS
nslookup t1.test2dapp.xyz
```

### 问题 3: 环境变量未加载

```bash
# 1. 检查 .env 文件
cat /opt/DeFiNodeNexus/.env

# 2. 检查文件权限
ls -la /opt/DeFiNodeNexus/.env

# 3. 重启服务
sudo systemctl restart nexus-nextjs.service

# 4. 查看实际加载的变量
ps aux | grep "node.*server.js"
```

---

## 📈 应用更新

当需要更新应用时：

```bash
# 1. 获取更新代码
cd /home/ubuntu/DeFiNodeNexus
git pull

# 2. 重新构建
npm install
npm run build

# 3. 更新部署文件
rm -rf /opt/DeFiNodeNexus/.next /opt/DeFiNodeNexus/public
cp -r .next public /opt/DeFiNodeNexus/

# 4. 重启应用
sudo systemctl restart nexus-nextjs.service

# 5. 验证
bash health-check-caddy.sh
```

---

## 🔒 安全建议

1. **定期备份环境变量**

   ```bash
   cp .env .env.backup
   ```

2. **监控磁盘空间**

   ```bash
   df -h /opt/DeFiNodeNexus
   ```

3. **检查日志大小**

   ```bash
   journalctl --disk-usage
   ```

4. **定期更新系统**
   ```bash
   sudo apt update && sudo apt upgrade
   ```

---

##文件目录结构

```
/home/ubuntu/DeFiNodeNexus/          # 源代码目录
├── Caddyfile                         # ✨ Caddy 配置
├── deploy-caddy.sh                   # ✨ 部署脚本
├── quick-deploy-caddy.sh             # ✨ 快速部署
├── check-caddy-deploy.sh             # ✨ 预检查脚本
├── health-check-caddy.sh             # ✨ 健康检查
├── CADDY-DEPLOYMENT-SUMMARY.md       # ✨ 部署总结
├── docs/
│   └── CADDY-DEPLOYMENT-GUIDE.md     # ✨ 详细指南
└── ...

/opt/DeFiNodeNexus/                  # 部署目录（部署后创建）
├── .next/                            # Next.js 编译输出
├── public/                           # 静态资源
├── node_modules/                     # 生产依赖
├── package.json
├── .env                              # 环境变量
└── .env.local
```

---

## 📞 获取帮助

- **Caddy 官方文档**: https://caddyserver.com/docs/
- **Next.js 生产部署**: https://nextjs.org/docs/deployment
- **Systemd 手册**: https://www.freedesktop.org/software/systemd/man/
- **查看项目文档**: `docs/` 目录

---

## ✨ 现在就开始部署！

```bash
cd /home/ubuntu/DeFiNodeNexus

# 运行部署脚本
bash deploy-caddy.sh

# 部署完成后访问：
# https://t1.test2dapp.xyz
```

祝部署顺利！🎉

---

**创建时间**: 2026-04-13  
**项目**: DeFiNodeNexus  
**分支**: feat/totswap-external-dex-v3  
**部署域名**: t1.test2dapp.xyz
