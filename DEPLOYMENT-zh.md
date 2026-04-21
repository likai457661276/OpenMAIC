# OpenMAIC 服务器部署指南

这份文档对应下面这套部署方式：

- OpenMAIC 用 `docker compose` 启动
- 服务器上已有独立 Nginx
- 通过 `https://你的域名/bingo-agent-class/` 访问项目

## 1. 先说结论

当前项目配置**不需要修改**，因为它已经在 [next.config.ts](/Users/likai/Documents/workspace/OpenMAIC/next.config.ts:1) 中设置了：

```ts
const BASE_PATH = '/bingo-agent-class';
```

这正好对应你的访问方式：

- `域名/bingo-agent-class`

部署时最重要的一点是：

- **Nginx 反向代理时不要去掉 `/bingo-agent-class` 这个前缀**

## 2. 服务器准备

先确认服务器有这些环境：

- Docker
- Docker Compose
- Nginx
- 一个已解析到服务器的域名

检查命令：

```bash
docker --version
docker compose version
nginx -v
```

## 3. 拉代码

```bash
git clone https://github.com/THU-MAIC/OpenMAIC.git
cd OpenMAIC
```

## 4. 配置环境变量

复制模板：

```bash
cp .env.example .env.local
```

编辑：

```bash
vim .env.local
```

最小示例：

```env
SILICONFLOW_API_KEY=你的密钥
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODELS=Pro/MiniMaxAI/MiniMax-M2.5
DEFAULT_MODEL=siliconflow:Pro/MiniMaxAI/MiniMax-M2.5

DEFAULT_IMAGE_PROVIDER=siliconflow-image
DEFAULT_IMAGE_MODEL=Qwen/Qwen-Image
IMAGE_SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1

ACCESS_CODE=你的访问码
SETTINGS_PASSWORD=你的设置页密码
```

说明：

- `IMAGE_SILICONFLOW_API_KEY` 可不填，不填时会复用 `SILICONFLOW_API_KEY`
- `ACCESS_CODE` 用来限制站点访问
- `SETTINGS_PASSWORD` 用来保护设置页

## 5. 修改 Docker Compose 监听方式

为了让 OpenMAIC 只给本机 Nginx 访问，建议把 [docker-compose.yml](/Users/likai/Documents/workspace/OpenMAIC/docker-compose.yml:1) 里的端口映射从：

```yaml
- "10051:10050"
```

改成：

```yaml
- "127.0.0.1:10051:10050"
```

这样容器只监听服务器本机 `127.0.0.1:10051`，不会直接暴露到公网。

## 6. 启动 OpenMAIC

在项目根目录执行：

```bash
docker compose up --build -d
```

检查状态：

```bash
docker compose ps
docker compose logs -f --tail=200
```

本机检查是否正常：

```bash
curl -I http://127.0.0.1:10051/bingo-agent-class/
```

如果返回 `200`、`301` 或 `307`，通常说明服务已经起来了。

## 7. 配置 Nginx

在 Nginx 里新增一个站点配置，例如：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location = /bingo-agent-class {
        return 301 /bingo-agent-class/;
    }

    location /bingo-agent-class/ {
        proxy_pass http://127.0.0.1:10051;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Prefix /bingo-agent-class;

        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }
}
```

把 `your-domain.com` 改成你的真实域名。

这里最关键的是：

- `location` 要写成 `/bingo-agent-class/`
- `proxy_pass` 写成 `http://127.0.0.1:10051`
- **不要 rewrite，不要去掉 `/bingo-agent-class` 前缀**

## 8. 让 Nginx 生效

测试配置：

```bash
nginx -t
```

重载：

```bash
sudo systemctl reload nginx
```

如果你的服务器不是 `systemd`，就改用对应的 Nginx 重载命令。

## 9. 最终访问地址

部署完成后，访问地址是：

- `http://your-domain.com/bingo-agent-class/`

如果你已经配好 HTTPS，就是：

- `https://your-domain.com/bingo-agent-class/`

注意：

- 不是 `https://your-domain.com/`
- 也不是 `https://your-domain.com/bingo-agent-class` 无斜杠的形式

虽然我们已经在 Nginx 里补了自动跳转，但建议统一使用带 `/` 的地址。

## 10. 一套可以直接执行的部署流程

### 第一步：拉代码并配置环境变量

```bash
git clone https://github.com/THU-MAIC/OpenMAIC.git
cd OpenMAIC
cp .env.example .env.local
vim .env.local
```

### 第二步：修改 compose 端口为仅本机监听

把 [docker-compose.yml](/Users/likai/Documents/workspace/OpenMAIC/docker-compose.yml:1) 中：

```yaml
- "10051:10050"
```

改成：

```yaml
- "127.0.0.1:10051:10050"
```

### 第三步：启动容器

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f --tail=200
```

### 第四步：确认本机访问正常

```bash
curl -I http://127.0.0.1:10051/bingo-agent-class/
```

### 第五步：配置 Nginx

写入站点配置后执行：

```bash
nginx -t
sudo systemctl reload nginx
```

### 第六步：浏览器访问

```text
https://你的域名/bingo-agent-class/
```

## 11. 更新项目

后续更新时执行：

```bash
cd OpenMAIC
git pull
docker compose up --build -d
docker compose logs -f --tail=200
```

## 12. 常见问题

### 1. 页面打不开

先检查：

```bash
docker compose ps
docker compose logs --tail=200
curl -I http://127.0.0.1:10051/bingo-agent-class/
nginx -t
```

如果本机 `curl` 正常，但域名访问不正常，问题通常在 Nginx。

### 2. 打开后静态资源 404

通常是 Nginx 把 `/bingo-agent-class` 前缀改掉了。

正确做法是：

- 保留 `location /bingo-agent-class/`
- 不要 rewrite
- 不要把请求转发成根路径 `/`

### 3. API 调用失败

优先检查：

- `.env.local` 是否填写正确
- 模型 API Key 是否有效
- 供应商账户是否有额度

### 4. 想接 HTTPS

推荐让 Nginx 处理证书，OpenMAIC 容器继续走本地 HTTP 即可。
