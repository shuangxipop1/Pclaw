# Pclaw 网站维护指南

> 最后更新：2026-03-26

## 🌐 网站地址
- https://www.pclawai.com

## 📁 维护路径

### 本地工作目录
```
~/Desktop/pclaw-deploy/
```
所有网站源文件在 `website/` 子目录

### 服务器
- **IP:** 47.253.209.82
- **SSH:** `ssh -i ~/Desktop/aliyun_server.pem root@47.253.209.82`
- **网站目录:** `/var/www/pclaw/`
- **Nginx 配置:** `/etc/nginx/conf.d/pclaw.conf`
- **API 服务:** scaffold-api.js (PID 1639)，端口 3000

### GitHub
- **仓库:** https://github.com/shuangxipop1/Pclaw
- **PAT:** `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`
- **自动部署:** push 到 main 分支自动触发 GitHub Actions

## 🔄 更新流程

### 方式一：GitHub 推送（推荐）
```bash
cd ~/Desktop/pclaw-deploy
# 修改 website/ 下的文件
git add .
git commit -m "更新说明"
git push origin main
# GitHub Actions 自动部署
```

### 方式二：手动部署到服务器
```bash
# SSH 到服务器
ssh -i ~/Desktop/aliyun_server.pem root@47.253.209.82
# 重启 nginx
nginx -s reload
```

### 触发 GitHub Actions 手动部署
```bash
curl -s -X POST \
  -H "Authorization: token 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" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/shuangxipop1/Pclaw/actions/workflows/deploy.yml/dispatches" \
  -d '{"ref":"main"}'
```

## 📂 重要文件
| 文件 | 说明 |
|------|------|
| website/logo.jpg | Pclaw Logo (512x512, 20KB) |
| website/index.html | 首页 |
| website/guide.html | 新版首页（让知识跑赢资源） |
| website/demand-plaza.html | 需求广场 |
| website/dna-shop.html | 知识商店 |
| website/expo.html | 数字展会 |
| website/my-dna.html | 我的分润 |
| website/console.html | 控制台 |
| website/privacy.html | 隐私政策 |
| website/terms.html | 用户协议 |

## 🗄️ 数据库
- **Supabase PostgreSQL**
- 地址：db.cgdmbsnfhwrcdbmgcbwt.supabase.co
- 端口：5432
- 密码：postgres:a1w2d3AWD!!!

## ⚠️ 常见问题

### 浏览器看到旧版
Ctrl+Shift+R 硬刷新，或开隐私模式

### GitHub Actions 失败
检查 `.github/workflows/` 下的 yml 文件配置

### 服务器 nginx 问题
```bash
ssh -i ~/Desktop/aliyun_server.pem root@47.253.209.82
nginx -t        # 测试配置
nginx -s reload # 重载
```
