# Caddy 服务器部署指南 - t1.test2dapp.xyz

本指南说明如何将 DeFiNodeNexus 项目部署到本地 Caddy 服务器。

## 前置需求

- Ubuntu/Linux 系统
- Node.js v18+
- npm 或 pnpm
- sudo 权限（用于系统服务配置）

## 部署步骤

### 方法 1: 自动部署脚本（推荐）

```bash
# 1. 使脚本可执行
chmod +x deploy-caddy.sh

# 2. 运行部署脚本
./deploy-caddy.sh
```

脚本将自动：

- 安装依赖
- 构建 Next.js 项目
- 配置 Next.js systemd 服务
- 安装/配置 Caddy
- 配置 HTTPS（自动续期）
- 启动所有服务

### 方法 2: 手动部署

#### 步骤 1: 构建项目

```bash
npm install
npm run build
```

#### 步骤 2: 配置 Next.js

复制部署文件到生产目录：

```bash
sudo mkdir -p /opt/DeFiNodeNexus
sudo cp -r .next public package.json /opt/DeFiNodeNexus/
cd /opt/DeFiNodeNexus
npm install --omit=dev
```

#### 步骤 3: 创建 Next.js systemd 服务

```bash
sudo tee /etc/systemd/system/nexus-nextjs.service > /dev/null <<EOF
[Unit]
Description=DeFiNodeNexus Next.js Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/DeFiNodeNexus
Environment="NODE_ENV=production"
Environment="PORT=3000"
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

#### 步骤 4: 配置 Caddy

复制 Caddyfile：

```bash
sudo cp Caddyfile /etc/caddy/
```

如果 Caddy 未安装，安装 Caddy：

```bash
curl https://getcaddy.com | bash -s personal
```

#### 步骤 5: 启动 Caddy

```bash
sudo systemctl enable caddy.service
sudo systemctl restart caddy.service
```

## 验证部署

### 检查服务状态

```bash
# 检查 Next.js 服务
sudo systemctl status nexus-nextjs.service

# 检查 Caddy 服务
sudo systemctl status caddy.service
```

### 查看日志

```bash
# Next.js 日志
sudo journalctl -u nexus-nextjs.service -f

# Caddy 日志
sudo journalctl -u caddy.service -f

# 检查 Caddy 是否成功获取 HTTPS 证书
curl -I https://t1.test2dapp.xyz
```

### 测试应用

```bash
# 测试本地连接
curl -I http://localhost:3000

# 测试 Caddy 代理
curl -I https://t1.test2dapp.xyz
```

## 环境变量配置

确保 `.env` 和 `.env.local` 文件包含必要的配置：

```bash
# 复制环境文件到部署目录
sudo cp .env /opt/DeFiNodeNexus/.env
sudo cp .env.local /opt/DeFiNodeNexus/.env.local
```

关键环境变量：

- `CNC_RPC_URL`: 区块链 RPC 端点
- `NEXT_PUBLIC_*`: 前端可用的公共变量
- `CONTRACT_*_ADDRESS`: 智能合约地址

## 常见操作

### 更新应用

```bash
# 1. 在源目录拉取新代码
cd /home/ubuntu/DeFiNodeNexus
git pull

# 2. 重新构建
npm install
npm run build

# 3. 复制到部署目录
rm -rf /opt/DeFiNodeNexus/.next /opt/DeFiNodeNexus/public
cp -r .next public /opt/DeFiNodeNexus/

# 4. 重启服务
sudo systemctl restart nexus-nextjs.service
```

### 更新 Caddyfile

```bash
# 编辑 Caddyfile
sudo nano /etc/caddy/Caddyfile

# 重新加载 Caddy 配置（无需重启）
sudo systemctl reload caddy.service

# 或重启 Caddy
sudo systemctl restart caddy.service
```

### 重启服务

```bash
# 重启 Next.js
sudo systemctl restart nexus-nextjs.service

# 重启 Caddy
sudo systemctl restart caddy.service

# 重启全部
sudo systemctl restart nexus-nextjs.service caddy.service
```

### 停止服务

```bash
# 停止 Next.js
sudo systemctl stop nexus-nextjs.service

# 停止 Caddy
sudo systemctl stop caddy.service
```

## Caddyfile 配置说明

`Caddyfile` 包含以下功能：

- **自动 HTTPS**: 自动获取和续期 Let's Encrypt 证书
- **反向代理**: 将 `t1.test2dapp.xyz` 流量代理到 `localhost:3000`
- **WebSocket 支持**: 保持连接和升级头部以支持 WebSocket
- **HTTP 头部转发**: 保留客户端 IP 和协议信息
- **Gzip 压缩**: 压缩响应以提高性能
- **缓存控制**: 静态资源设置长期缓存
- **日志**: JSON 格式日志输出到 stdout

## 故障排查

### 证书问题

```bash
# 检查 Caddy 是否可以访问 Let's Encrypt
sudo systemctl restart caddy.service
sudo journalctl -u caddy.service -n 50 --no-pager

# 查看证书详情
caddy list-certificates
```

### 端口占用

```bash
# 检查 3000 端口是否被占用
sudo lsof -i :3000

# 检查 80/443 端口
sudo lsof -i :80
sudo lsof -i :443
```

### DNS 结问题

确保 DNS 解析正确：

```bash
nslookup t1.test2dapp.xyz
dig t1.test2dapp.xyz
```

## 性能监控

```bash
# 实时监控服务状态
watch -n 1 'systemctl status nexus-nextjs.service caddy.service'

# 检查内存使用
ps aux | grep -E 'node|caddy'

# 查看文件描述符使用
lsof -u $(whoami) | wc -l
```

## 建议的生产配置

对于生产环境，建议：

1. **反向代理**: 使用 Caddy 作为反向代理
2. **SSL/TLS**: 自动 Let's Encrypt 证书（包含在 Caddyfile 中）
3. **监控**: 设置日志收集和监控
4. **备份**: 定期备份环境变量和配置
5. **更新**: 定期更新依赖和系统

## 更多信息

- Caddy 文档: https://caddyserver.com/docs/
- Next.js 生产部署: https://nextjs.org/docs/deployment
- Systemd 服务: https://www.freedesktop.org/software/systemd/man/systemd.service.html
