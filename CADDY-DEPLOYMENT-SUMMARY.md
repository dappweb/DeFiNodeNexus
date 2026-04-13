# Caddy 部署配置总结

## 📋 部署环境信息

- **域名**: t1.test2dapp.xyz
- **Next.js 端口**: 3001 (避免 Docker 端口冲突)
- **Caddy 反向代理端口**: 80, 443 (HTTP/HTTPS)
- **项目路径**: /home/ubuntu/DeFiNodeNexus
- **部署路径**: /opt/DeFiNodeNexus
- **HTTPS**: 自动通过 Let's Encrypt

## ✅ 系统检查结果

```
✓ Node.js v20.20.2
✓ npm 10.8.2
✓ sudo 权限可用
✓ Caddy v2.11.2 已安装
✓ package.json 存在
✓ Caddyfile 已配置
✓ deploy-caddy.sh 脚本准备就绪
✓ .env 配置文件完整 (12 个环境变量)
✓ DNS 解析正常 (2606:4700:3036::6815:51f9)
✓ 端口 443 可用 (HTTPS)
✓ 端口 3001 可用 (Next.js)
⚠ 端口 80 已被 Caddy 占用 (正常 - Caddy 已在运行)
⚠ 端口 3000 被 Docker 占用 (已调整为使用 3001)
```

## 🚀 快速开始部署

### 方式 1: 自动部署（推荐）

```bash
cd /home/ubuntu/DeFiNodeNexus
chmod +x deploy-caddy.sh
./deploy-caddy.sh
```

### 方式 2: 快速部署向导

```bash
cd /home/ubuntu/DeFiNodeNexus
chmod +x quick-deploy-caddy.sh
./quick-deploy-caddy.sh
```

###方式 3: 手动分步部署

详见 [CADDY-DEPLOYMENT-GUIDE.md](docs/CADDY-DEPLOYMENT-GUIDE.md)

## 📝 文件清单

创建的文件列表：

| 文件                             | 说明               |
| -------------------------------- | ------------------ |
| `Caddyfile`                      | Caddy 反向代理配置 |
| `deploy-caddy.sh`                | 完整部署脚本       |
| `quick-deploy-caddy.sh`          | 快速部署向导       |
| `check-caddy-deploy.sh`          | 部署前检查         |
| `docs/CADDY-DEPLOYMENT-GUIDE.md` | 详细部署指南       |
| `CADDY-DEPLOYMENT-SUMMARY.md`    | 本文件             |

## 🔑 关键配置

### Caddyfile 配置内容

```caddy
t1.test2dapp.xyz {
    reverse_proxy localhost:3001
    encode gzip
    # 自动 HTTPS, WebSocket 支持, 缓存控制
    # 详见 Caddyfile 内容
}
```

### Next.js 服务配置

- **服务名**: nexus-nextjs.service
- **运行端口**: 3001
- **工作目录**: /opt/DeFiNodeNexus
- **启动命令**: node /opt/DeFiNodeNexus/.next/standalone/server.js
- **重启策略**: 自动重启

### Caddy 服务配置

- **服务名**: caddy.service
- **配置文件**: /etc/caddy/Caddyfile
- **用户**: caddy
- **监听端口**: 80, 443

## 📊 部署后的验证步骤

### 1. 检查服务状态

```bash
# Next.js 应用状态
sudo systemctl status nexus-nextjs.service

# Caddy 代理状态
sudo systemctl status caddy.service
```

### 2. 查看实时日志

```bash
# Next.js 日志
sudo journalctl -u nexus-nextjs.service -f

# Caddy 日志
sudo journalctl -u caddy.service -f
```

### 3. 测试应用访问

```bash
# 测试 HTTPS 连接
curl -I https://t1.test2dapp.xyz

# 检查 SSL 证书
openssl s_client -connect t1.test2dapp.xyz:443 -servername t1.test2dapp.xyz

# 浏览器访问
# 打开 https://t1.test2dapp.xyz
```

##技能 常用命令

```bash
# 重启 Next.js 应用
sudo systemctl restart nexus-nextjs.service

# 重启 Caddy
sudo systemctl restart caddy.service

# 停止所有服务
sudo systemctl stop nexus-nextjs.service caddy.service

# 查看服务开机启动状态
systemctl list-unit-files | grep nexus

# 查看部署目录大小
du -sh /opt/DeFiNodeNexus

# 查看磁盘空间
df -h

# 检查网络连接
netstat -tlnp | grep -E '3001|80|443'
```

## 🐛 故障排查

### 问题 1: HTTPS 证书获取失败

```bash
# 查看 Caddy 日志中的错误
sudo journalctl -u caddy.service -n 50

# 验证 DNS 解析
nslookup t1.test2dapp.xyz
dig t1.test2dapp.xyz

# 确保防火墙允许 80/443
sudo ufw status
```

### 问题 2: Next.js 连接失败

```bash
# 检查 Next.js 是否运行
sudo systemctl status nexus-nextjs.service

# 检查端口 3001 是否监听
sudo lsof -i :3001

# 查看 Next.js 错误日志
sudo journalctl -u nexus-nextjs.service -n 100
```

### 问题 3: 环境变量未加载

```bash
# 检查 .env 文件完整性
cat /opt/DeFiNodeNexus/.env

# 重启服务以重新加载环境
sudo systemctl restart nexus-nextjs.service
```

## 📈 性能监控

```bash
# 实时监控资源使用
watch -n 1 'ps aux | grep -E "node|caddy"'

# 检查内存使用
free -h

# Caddy 内存占用
ps aux | grep caddy | grep -v grep
```

## 🔄 应用更新流程

当有新版本需要部署时：

```bash
# 1. 获取最新代码
cd /home/ubuntu/DeFiNodeNexus
git pull

# 2. 重新安装依赖并构建
npm install
npm run build

# 3. 更新部署文件
rm -rf /opt/DeFiNodeNexus/.next /opt/DeFiNodeNexus/public
cp -r .next public /opt/DeFiNodeNexus/

# 4. 重启应用
sudo systemctl restart nexus-nextjs.service

# 5. 从日志验证
sudo journalctl -u nexus-nextjs.service -n 20
```

## 📞 获取帮助

- Caddy 文档: https://caddyserver.com/docs/
- Next.js 部署: https://nextjs.org/docs/deployment
- Systemd 参考: https://www.freedesktop.org/software/systemd/man/

---

**最后更新**: 2026-04-13  
**部署仓库**: DeFiNodeNexus (feat/totswap-external-dex-v3 分支)
