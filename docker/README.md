# Pclaw Docker 部署

本目录包含 Pclaw 的 Docker 部署配置文件。

## 快速开始

### 前置要求
- Docker >= 20.10
- Docker Compose >= 2.0

### 启动服务

```bash
# 进入 docker 目录
cd pclaw-docker

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 服务地址
- Gateway: http://localhost:19001
- Web UI: http://localhost:8080

### 停止服务

```bash
docker-compose down
```

## 自定义构建

### 构建自定义镜像

```bash
docker build -t pclaw:custom .
```

### 使用自定义配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 填入实际配置
vim .env

# 启动
docker-compose up -d
```

## 持久化数据

数据存储在 Docker volume `pclaw-data` 中。

```bash
# 查看 volume
docker volume ls | grep pclaw

# 备份数据
docker run --rm -v pclaw-data:/data -v $(pwd):/backup alpine tar czf /backup/pclaw-backup.tar.gz /data
```

## 浏览器插件

浏览器插件位于 `../pclaw-extension/`

### 安装方法 (Chrome/Edge)

1. 打开 Chrome/Edge，访问 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `pclaw-extension` 目录

### 安装方法 (Firefox)

1. 打开 Firefox，访问 `about:debugging#/runtime/this-firefox`
2. 点击「临时加载附加组件」
3. 选择 `pclaw-extension/manifest.json`

## 目录结构

```
pclaw-docker/
├── Dockerfile          # Docker 镜像构建文件
├── docker-compose.yml  # Docker Compose 配置
├── .env.example        # 环境变量模板
└── README.md           # 本文件
```
